import { ActivityLogRepository, TransactionRepository, WalletRepository } from '../database/repositories.js';
import { BlockchainService } from './BlockchainService.js';
import { EncryptionService } from './EncryptionService.js';

/**
 * Transaction Queue - Manage transaction queue with retry logic
 */
export class TransactionQueue {
  static queue = [];
  static isProcessing = false;
  static maxRetries = 3;
  static retryDelay = 5000; // 5 seconds
  static listeners = new Set();

  /**
   * Add transaction to queue
   */
  static addTransaction(txData) {
    const transaction = {
      ...txData,
      id: Date.now() + Math.random(),
      status: 'queued',
      retryCount: 0,
      createdAt: new Date(),
    };

    this.queue.push(transaction);
    this.notifyListeners('transaction_added', transaction);

    // Log activity
    ActivityLogRepository.create({
      type: 'transaction',
      action: 'queued',
      details: `Transaction queued: ${txData.toAddress} for ${txData.amount} ETH`,
      status: 'info',
    });

    // Auto-start processing if not running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return transaction;
  }

  /**
   * Get queue status
   */
  static getQueueStatus() {
    return {
      total: this.queue.length,
      pending: this.queue.filter(tx => tx.status === 'pending').length,
      processing: this.queue.filter(tx => tx.status === 'processing').length,
      completed: this.queue.filter(tx => tx.status === 'completed').length,
      failed: this.queue.filter(tx => tx.status === 'failed').length,
      queued: this.queue.filter(tx => tx.status === 'queued').length,
    };
  }

  /**
   * Get all transactions in queue
   */
  static getQueue() {
    return [...this.queue];
  }

  /**
   * Pause queue processing
   */
  static pauseQueue() {
    this.isProcessing = false;
    this.notifyListeners('queue_paused', null);

    ActivityLogRepository.create({
      type: 'queue',
      action: 'paused',
      status: 'info',
    });
  }

  /**
   * Resume queue processing
   */
  static resumeQueue() {
    this.notifyListeners('queue_resumed', null);
    
    ActivityLogRepository.create({
      type: 'queue',
      action: 'resumed',
      status: 'info',
    });

    this.processQueue();
  }

  /**
   * Cancel transaction
   */
  static cancelTransaction(txId) {
    const txIndex = this.queue.findIndex(tx => tx.id === txId);
    
    if (txIndex === -1) {
      throw new Error('Transaction not found');
    }

    const tx = this.queue[txIndex];
    
    if (tx.status === 'processing' || tx.status === 'completed') {
      throw new Error('Cannot cancel transaction in progress or completed');
    }

    tx.status = 'cancelled';
    this.notifyListeners('transaction_cancelled', tx);

    ActivityLogRepository.create({
      type: 'transaction',
      action: 'cancelled',
      details: `Transaction cancelled: ${tx.toAddress}`,
      status: 'warning',
    });
  }

  /**
   * Clear queue
   */
  static clearQueue() {
    this.queue = [];
    this.notifyListeners('queue_cleared', null);
  }

  /**
   * Process queue
   */
  static async processQueue() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.notifyListeners('queue_started', null);

    try {
      while (this.queue.length > 0) {
        const txIndex = this.queue.findIndex(tx => tx.status === 'queued');
        
        if (txIndex === -1) {
          break; // No more queued transactions
        }

        const tx = this.queue[txIndex];
        await this.processTransaction(tx);
      }
    } catch (error) {
      console.error('[TransactionQueue] Error processing queue:', error);
    } finally {
      this.isProcessing = false;
      this.notifyListeners('queue_finished', this.getQueueStatus());
    }
  }

  /**
   * Process single transaction
   */
  static async processTransaction(tx) {
    tx.status = 'processing';
    this.notifyListeners('transaction_processing', tx);

    try {
      // Get wallet and decrypt private key
      const wallet = WalletRepository.findByAddress(tx.fromAddress);
      if (!wallet) {
        throw new Error(`Wallet not found: ${tx.fromAddress}`);
      }

      const privateKey = EncryptionService.decrypt(wallet.privateKey);

      // Send transaction
      const result = await BlockchainService.sendTransaction(
        privateKey,
        tx.toAddress,
        tx.amount,
        {
          gasLimit: tx.gasLimit,
          maxFeePerGas: tx.maxFeePerGas,
          maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
        }
      );

      // Update transaction
      tx.status = 'completed';
      tx.transactionHash = result.hash;
      tx.blockNumber = result.blockNumber;
      tx.completedAt = new Date();

      this.notifyListeners('transaction_completed', tx);

      // Save to database
      TransactionRepository.create({
        fromAddress: tx.fromAddress,
        toAddress: tx.toAddress,
        amount: tx.amount,
        gasPrice: tx.gasPrice,
        gasLimit: tx.gasLimit,
        transactionHash: result.hash,
        blockNumber: result.blockNumber,
        status: 'completed',
      });

      ActivityLogRepository.create({
        type: 'transaction',
        action: 'completed',
        details: `Transaction sent: ${tx.toAddress} | Hash: ${result.hash}`,
        status: 'success',
      });

    } catch (error) {
      console.error('[TransactionQueue] Error processing transaction:', error);

      tx.retryCount += 1;

      if (tx.retryCount < this.maxRetries) {
        tx.status = 'queued';
        tx.error = error.message;
        
        this.notifyListeners('transaction_retrying', tx);

        ActivityLogRepository.create({
          type: 'transaction',
          action: 'retry',
          details: `Transaction retry ${tx.retryCount}/${this.maxRetries}: ${tx.toAddress}`,
          status: 'warning',
        });

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      } else {
        tx.status = 'failed';
        tx.error = error.message;
        
        this.notifyListeners('transaction_failed', tx);

        ActivityLogRepository.create({
          type: 'transaction',
          action: 'failed',
          details: `Transaction failed after ${this.maxRetries} retries: ${tx.toAddress} - ${error.message}`,
          status: 'error',
        });
      }
    }
  }

  /**
   * Subscribe to queue events
   */
  static subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  static notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback({ event, data, timestamp: new Date() });
      } catch (error) {
        console.error('[TransactionQueue] Error in listener:', error);
      }
    });
  }
}
