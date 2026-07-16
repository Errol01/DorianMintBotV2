import { ethers } from 'ethers';
import { RpcRepository } from '../database/repositories.js';

/**
 * Blockchain Service - Handle Ethereum operations using ethers v6
 */
export class BlockchainService {
  static provider = null;
  static signers = new Map(); // Cache signers by address

  /**
   * Initialize blockchain service with primary RPC endpoint
   */
  static initialize() {
    const primaryRpc = RpcRepository.getPrimary();
    
    if (!primaryRpc) {
      throw new Error('No primary RPC endpoint configured');
    }

    this.provider = new ethers.JsonRpcProvider(primaryRpc.url);
    console.log('[Blockchain] Service initialized with RPC:', primaryRpc.url);
  }

  /**
   * Get provider
   */
  static getProvider() {
    if (!this.provider) {
      this.initialize();
    }
    return this.provider;
  }

  /**
   * Switch RPC endpoint
   */
  static switchRpc(rpcUrl) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signers.clear();
    console.log('[Blockchain] Switched to RPC:', rpcUrl);
  }

  /**
   * Get wallet balance
   */
  static async getBalance(address) {
    try {
      const provider = this.getProvider();
      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('[Blockchain] Error getting balance:', error);
      throw new Error(`Failed to get balance for ${address}`);
    }
  }

  /**
   * Get nonce for address
   */
  static async getNonce(address) {
    try {
      const provider = this.getProvider();
      return await provider.getTransactionCount(address);
    } catch (error) {
      console.error('[Blockchain] Error getting nonce:', error);
      throw new Error(`Failed to get nonce for ${address}`);
    }
  }

  /**
   * Get gas price
   */
  static async getGasPrice() {
    try {
      const provider = this.getProvider();
      const feeData = await provider.getFeeData();
      return {
        gasPrice: ethers.formatUnits(feeData.gasPrice, 'gwei'),
        maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') : null,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') : null,
      };
    } catch (error) {
      console.error('[Blockchain] Error getting gas price:', error);
      throw new Error('Failed to get gas price');
    }
  }

  /**
   * Estimate gas for transaction
   */
  static async estimateGas(from, to, amount, data = null) {
    try {
      const provider = this.getProvider();
      const tx = {
        from,
        to,
        value: ethers.parseEther(amount),
        data,
      };

      const gasEstimate = await provider.estimateGas(tx);
      return ethers.formatUnits(gasEstimate, 0);
    } catch (error) {
      console.error('[Blockchain] Error estimating gas:', error);
      throw new Error('Failed to estimate gas');
    }
  }

  /**
   * Send transaction (EIP-1559)
   */
  static async sendTransaction(privateKey, to, amount, options = {}) {
    try {
      const provider = this.getProvider();
      const wallet = new ethers.Wallet(privateKey, provider);

      const tx = {
        to,
        value: ethers.parseEther(amount),
        ...options,
      };

      // Use EIP-1559 by default
      if (!tx.gasPrice && !tx.maxFeePerGas) {
        const feeData = await provider.getFeeData();
        tx.maxFeePerGas = feeData.maxFeePerGas;
        tx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
      }

      // Estimate gas if not provided
      if (!tx.gasLimit) {
        tx.gasLimit = await provider.estimateGas(tx);
      }

      const response = await wallet.sendTransaction(tx);
      const receipt = await response.wait();

      return {
        hash: receipt.hash,
        from: receipt.from,
        to: receipt.to,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
      };
    } catch (error) {
      console.error('[Blockchain] Error sending transaction:', error);
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  /**
   * Get transaction status
   */
  static async getTransactionStatus(transactionHash) {
    try {
      const provider = this.getProvider();
      const receipt = await provider.getTransactionReceipt(transactionHash);

      if (!receipt) {
        return { status: 'pending' };
      }

      return {
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        confirmations: (await provider.getBlockNumber()) - receipt.blockNumber,
      };
    } catch (error) {
      console.error('[Blockchain] Error getting transaction status:', error);
      throw new Error('Failed to get transaction status');
    }
  }

  /**
   * Get chain info
   */
  static async getChainInfo() {
    try {
      const provider = this.getProvider();
      const network = await provider.getNetwork();
      const blockNumber = await provider.getBlockNumber();

      return {
        chainId: network.chainId,
        name: network.name,
        blockNumber,
      };
    } catch (error) {
      console.error('[Blockchain] Error getting chain info:', error);
      throw new Error('Failed to get chain info');
    }
  }

  /**
   * Batch transaction validation
   */
  static validateBatchTransactions(transactions) {
    const errors = [];

    transactions.forEach((tx, index) => {
      if (!tx.to || !ethers.isAddress(tx.to)) {
        errors.push(`Transaction ${index}: Invalid recipient address`);
      }

      if (!tx.amount || isNaN(parseFloat(tx.amount)) || parseFloat(tx.amount) <= 0) {
        errors.push(`Transaction ${index}: Invalid amount`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Clear signer cache
   */
  static clearSignerCache() {
    this.signers.clear();
  }
}
