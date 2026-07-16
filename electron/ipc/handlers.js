import { ipcMain } from 'electron';
import { initializeDatabase, closeDatabase } from '../database/db.js';
import { WalletRepository, MnemonicRepository, RpcRepository, TransactionRepository, ActivityLogRepository } from '../database/repositories.js';
import { EncryptionService } from '../services/EncryptionService.js';
import { HDWalletManager, WalletService } from '../services/WalletService.js';
import { BlockchainService } from '../services/BlockchainService.js';
import { TransactionQueue } from '../services/TransactionQueue.js';

/**
 * Initialize all IPC handlers
 */
export function initializeIpcHandlers() {
  console.log('[IPC] Initializing IPC handlers...');

  // Initialize database
  initializeDatabase();

  // Register all handlers
  registerDatabaseHandlers();
  registerWalletHandlers();
  registerBlockchainHandlers();
  registerTransactionHandlers();
  registerRpcHandlers();

  console.log('[IPC] All IPC handlers initialized');
}

/**
 * Database IPC Handlers
 */
function registerDatabaseHandlers() {
  ipcMain.handle('db:initialize', async () => {
    try {
      initializeDatabase();
      return { success: true, message: 'Database initialized' };
    } catch (error) {
      console.error('[IPC] Database initialization error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:close', async () => {
    try {
      closeDatabase();
      return { success: true, message: 'Database closed' };
    } catch (error) {
      console.error('[IPC] Database close error:', error);
      return { success: false, error: error.message };
    }
  });
}

/**
 * Wallet IPC Handlers
 */
function registerWalletHandlers() {
  ipcMain.handle('wallet:generateMnemonic', async () => {
    try {
      const mnemonic = HDWalletManager.generateMnemonic(128);
      return { success: true, mnemonic };
    } catch (error) {
      console.error('[IPC] Generate mnemonic error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('wallet:validateMnemonic', async (event, mnemonic) => {
    try {
      const valid = HDWalletManager.validateMnemonic(mnemonic);
      return { success: true, valid };
    } catch (error) {
      console.error('[IPC] Validate mnemonic error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('wallet:saveMnemonic', async (event, mnemonic) => {
    try {
      const encryptedMnemonic = EncryptionService.encrypt(mnemonic);
      MnemonicRepository.saveMaster(encryptedMnemonic);
      return { success: true, saved: true };
    } catch (error) {
      console.error('[IPC] Save mnemonic error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('wallet:generateWallets', async (event, count = 10) => {
    try {
      const master = MnemonicRepository.getMaster();
      if (!master) {
        return { success: false, error: 'No master mnemonic found' };
      }

      const mnemonic = EncryptionService.decrypt(master.encryptedMnemonic);
      const wallets = HDWalletManager.generateWalletsFromMnemonic(mnemonic, count);

      // Save to database
      const savedWallets = [];
      for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i];
        const saved = WalletRepository.create({
          address: wallet.address,
          publicKey: wallet.publicKey,
          privateKey: EncryptionService.encrypt(wallet.privateKey),
          encryptedMnemonic: master.encryptedMnemonic,
          mnemonicIndex: i,
          name: `Wallet ${i + 1}`,
        });
        savedWallets.push(saved);
      }

      ActivityLogRepository.create({
        type: 'wallet',
        action: 'generated',
        details: `Generated ${count} wallets`,
        status: 'success',
      });

      return { success: true, wallets: savedWallets };
    } catch (error) {
      console.error('[IPC] Generate wallets error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('wallet:getAllWallets', async () => {
    try {
      const wallets = WalletRepository.getAll();
      return { success: true, wallets };
    } catch (error) {
      console.error('[IPC] Get wallets error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('wallet:getWalletById', async (event, id) => {
    try {
      const wallet = WalletRepository.findById(id);
      if (!wallet) {
        return { success: false, error: 'Wallet not found' };
      }
      return { success: true, wallet };
    } catch (error) {
      console.error('[IPC] Get wallet error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('wallet:updateWallet', async (event, id, updates) => {
    try {
      const wallet = WalletRepository.update(id, updates);
      ActivityLogRepository.create({
        type: 'wallet',
        action: 'updated',
        details: `Wallet ${id} updated`,
        status: 'info',
      });
      return { success: true, wallet };
    } catch (error) {
      console.error('[IPC] Update wallet error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('wallet:deleteWallet', async (event, id) => {
    try {
      WalletRepository.delete(id);
      ActivityLogRepository.create({
        type: 'wallet',
        action: 'deleted',
        details: `Wallet ${id} deleted`,
        status: 'info',
      });
      return { success: true, message: 'Wallet deleted' };
    } catch (error) {
      console.error('[IPC] Delete wallet error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('wallet:importFromPrivateKey', async (event, privateKey, name) => {
    try {
      const walletData = WalletService.importWalletFromPrivateKey(privateKey, name);
      const saved = WalletRepository.create({
        ...walletData,
        privateKey: EncryptionService.encrypt(walletData.privateKey),
      });
      ActivityLogRepository.create({
        type: 'wallet',
        action: 'imported',
        details: `Wallet imported: ${saved.address}`,
        status: 'success',
      });
      return { success: true, wallet: saved };
    } catch (error) {
      console.error('[IPC] Import wallet error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('wallet:importFromMnemonic', async (event, mnemonic, count = 10) => {
    try {
      const wallets = WalletService.importWalletFromMnemonic(mnemonic, 0, count, 'Imported');
      const savedWallets = [];
      
      for (const wallet of wallets) {
        const saved = WalletRepository.create({
          ...wallet,
          privateKey: EncryptionService.encrypt(wallet.privateKey),
        });
        savedWallets.push(saved);
      }

      ActivityLogRepository.create({
        type: 'wallet',
        action: 'imported',
        details: `Imported ${count} wallets from mnemonic`,
        status: 'success',
      });

      return { success: true, wallets: savedWallets };
    } catch (error) {
      console.error('[IPC] Import from mnemonic error:', error);
      return { success: false, error: error.message };
    }
  });
}

/**
 * Blockchain IPC Handlers
 */
function registerBlockchainHandlers() {
  ipcMain.handle('blockchain:initialize', async () => {
    try {
      BlockchainService.initialize();
      return { success: true, message: 'Blockchain service initialized' };
    } catch (error) {
      console.error('[IPC] Blockchain init error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('blockchain:getBalance', async (event, address) => {
    try {
      const balance = await BlockchainService.getBalance(address);
      return { success: true, balance };
    } catch (error) {
      console.error('[IPC] Get balance error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('blockchain:getNonce', async (event, address) => {
    try {
      const nonce = await BlockchainService.getNonce(address);
      return { success: true, nonce };
    } catch (error) {
      console.error('[IPC] Get nonce error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('blockchain:getGasPrice', async () => {
    try {
      const gasPrice = await BlockchainService.getGasPrice();
      return { success: true, gasPrice };
    } catch (error) {
      console.error('[IPC] Get gas price error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('blockchain:estimateGas', async (event, from, to, amount) => {
    try {
      const gas = await BlockchainService.estimateGas(from, to, amount);
      return { success: true, gas };
    } catch (error) {
      console.error('[IPC] Estimate gas error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('blockchain:getChainInfo', async () => {
    try {
      const chainInfo = await BlockchainService.getChainInfo();
      return { success: true, chainInfo };
    } catch (error) {
      console.error('[IPC] Get chain info error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('blockchain:validateBatchTransactions', async (event, transactions) => {
    try {
      const result = BlockchainService.validateBatchTransactions(transactions);
      return { success: true, ...result };
    } catch (error) {
      console.error('[IPC] Validate batch transactions error:', error);
      return { success: false, error: error.message };
    }
  });
}

/**
 * Transaction IPC Handlers
 */
function registerTransactionHandlers() {
  ipcMain.handle('transaction:addToQueue', async (event, txData) => {
    try {
      const tx = TransactionQueue.addTransaction(txData);
      return { success: true, transaction: tx };
    } catch (error) {
      console.error('[IPC] Add transaction error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('transaction:getQueueStatus', async () => {
    try {
      const status = TransactionQueue.getQueueStatus();
      return { success: true, status };
    } catch (error) {
      console.error('[IPC] Get queue status error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('transaction:getQueue', async () => {
    try {
      const queue = TransactionQueue.getQueue();
      return { success: true, queue };
    } catch (error) {
      console.error('[IPC] Get queue error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('transaction:pauseQueue', async () => {
    try {
      TransactionQueue.pauseQueue();
      return { success: true, message: 'Queue paused' };
    } catch (error) {
      console.error('[IPC] Pause queue error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('transaction:resumeQueue', async () => {
    try {
      TransactionQueue.resumeQueue();
      return { success: true, message: 'Queue resumed' };
    } catch (error) {
      console.error('[IPC] Resume queue error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('transaction:cancelTransaction', async (event, txId) => {
    try {
      TransactionQueue.cancelTransaction(txId);
      return { success: true, message: 'Transaction cancelled' };
    } catch (error) {
      console.error('[IPC] Cancel transaction error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('transaction:clearQueue', async () => {
    try {
      TransactionQueue.clearQueue();
      return { success: true, message: 'Queue cleared' };
    } catch (error) {
      console.error('[IPC] Clear queue error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('transaction:getHistory', async () => {
    try {
      const transactions = TransactionRepository.getAll();
      return { success: true, transactions };
    } catch (error) {
      console.error('[IPC] Get transaction history error:', error);
      return { success: false, error: error.message };
    }
  });
}

/**
 * RPC IPC Handlers
 */
function registerRpcHandlers() {
  ipcMain.handle('rpc:addEndpoint', async (event, rpcData) => {
    try {
      const rpc = RpcRepository.create(rpcData);
      ActivityLogRepository.create({
        type: 'rpc',
        action: 'added',
        details: `RPC endpoint added: ${rpc.name}`,
        status: 'info',
      });
      return { success: true, rpc };
    } catch (error) {
      console.error('[IPC] Add RPC error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('rpc:getAllEndpoints', async () => {
    try {
      const rpcs = RpcRepository.getAll();
      return { success: true, rpcs };
    } catch (error) {
      console.error('[IPC] Get RPC endpoints error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('rpc:getPrimaryEndpoint', async () => {
    try {
      const rpc = RpcRepository.getPrimary();
      return { success: true, rpc };
    } catch (error) {
      console.error('[IPC] Get primary RPC error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('rpc:deleteEndpoint', async (event, id) => {
    try {
      RpcRepository.delete(id);
      ActivityLogRepository.create({
        type: 'rpc',
        action: 'deleted',
        details: `RPC endpoint ${id} deleted`,
        status: 'info',
      });
      return { success: true, message: 'RPC endpoint deleted' };
    } catch (error) {
      console.error('[IPC] Delete RPC error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('rpc:switchRpc', async (event, rpcUrl) => {
    try {
      BlockchainService.switchRpc(rpcUrl);
      ActivityLogRepository.create({
        type: 'rpc',
        action: 'switched',
        details: `Switched to RPC: ${rpcUrl}`,
        status: 'info',
      });
      return { success: true, message: 'Switched RPC' };
    } catch (error) {
      console.error('[IPC] Switch RPC error:', error);
      return { success: false, error: error.message };
    }
  });
}

/**
 * Activity Log IPC Handlers
 */
export function registerActivityHandlers() {
  ipcMain.handle('activity:getAll', async () => {
    try {
      const logs = ActivityLogRepository.getAll();
      return { success: true, logs };
    } catch (error) {
      console.error('[IPC] Get activity logs error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('activity:getByType', async (event, type) => {
    try {
      const logs = ActivityLogRepository.getByType(type);
      return { success: true, logs };
    } catch (error) {
      console.error('[IPC] Get activity logs by type error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('activity:getPaginated', async (event, page = 1, limit = 50) => {
    try {
      const logs = ActivityLogRepository.getPaginated(page, limit);
      return { success: true, logs };
    } catch (error) {
      console.error('[IPC] Get paginated activity logs error:', error);
      return { success: false, error: error.message };
    }
  });
}
