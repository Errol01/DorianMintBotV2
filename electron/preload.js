/**
 * IPC API - Preload script bridge for secure IPC communication
 * Exposes safe API to renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // Database APIs
  db: {
    initialize: () => ipcRenderer.invoke('db:initialize'),
    close: () => ipcRenderer.invoke('db:close'),
  },

  // Wallet APIs
  wallet: {
    generateMnemonic: () => ipcRenderer.invoke('wallet:generateMnemonic'),
    validateMnemonic: (mnemonic) => ipcRenderer.invoke('wallet:validateMnemonic', mnemonic),
    saveMnemonic: (mnemonic) => ipcRenderer.invoke('wallet:saveMnemonic', mnemonic),
    generateWallets: (count) => ipcRenderer.invoke('wallet:generateWallets', count),
    getAllWallets: () => ipcRenderer.invoke('wallet:getAllWallets'),
    getWalletById: (id) => ipcRenderer.invoke('wallet:getWalletById', id),
    updateWallet: (id, updates) => ipcRenderer.invoke('wallet:updateWallet', id, updates),
    deleteWallet: (id) => ipcRenderer.invoke('wallet:deleteWallet', id),
    importFromPrivateKey: (privateKey, name) => 
      ipcRenderer.invoke('wallet:importFromPrivateKey', privateKey, name),
    importFromMnemonic: (mnemonic, count) => 
      ipcRenderer.invoke('wallet:importFromMnemonic', mnemonic, count),
  },

  // Blockchain APIs
  blockchain: {
    initialize: () => ipcRenderer.invoke('blockchain:initialize'),
    getBalance: (address) => ipcRenderer.invoke('blockchain:getBalance', address),
    getNonce: (address) => ipcRenderer.invoke('blockchain:getNonce', address),
    getGasPrice: () => ipcRenderer.invoke('blockchain:getGasPrice'),
    estimateGas: (from, to, amount) => ipcRenderer.invoke('blockchain:estimateGas', from, to, amount),
    getChainInfo: () => ipcRenderer.invoke('blockchain:getChainInfo'),
    validateBatchTransactions: (transactions) => 
      ipcRenderer.invoke('blockchain:validateBatchTransactions', transactions),
  },

  // Transaction APIs
  transaction: {
    addToQueue: (txData) => ipcRenderer.invoke('transaction:addToQueue', txData),
    getQueueStatus: () => ipcRenderer.invoke('transaction:getQueueStatus'),
    getQueue: () => ipcRenderer.invoke('transaction:getQueue'),
    pauseQueue: () => ipcRenderer.invoke('transaction:pauseQueue'),
    resumeQueue: () => ipcRenderer.invoke('transaction:resumeQueue'),
    cancelTransaction: (txId) => ipcRenderer.invoke('transaction:cancelTransaction', txId),
    clearQueue: () => ipcRenderer.invoke('transaction:clearQueue'),
    getHistory: () => ipcRenderer.invoke('transaction:getHistory'),
  },

  // RPC APIs
  rpc: {
    addEndpoint: (rpcData) => ipcRenderer.invoke('rpc:addEndpoint', rpcData),
    getAllEndpoints: () => ipcRenderer.invoke('rpc:getAllEndpoints'),
    getPrimaryEndpoint: () => ipcRenderer.invoke('rpc:getPrimaryEndpoint'),
    deleteEndpoint: (id) => ipcRenderer.invoke('rpc:deleteEndpoint', id),
    switchRpc: (rpcUrl) => ipcRenderer.invoke('rpc:switchRpc', rpcUrl),
  },

  // Activity Log APIs
  activity: {
    getAll: () => ipcRenderer.invoke('activity:getAll'),
    getByType: (type) => ipcRenderer.invoke('activity:getByType', type),
    getPaginated: (page, limit) => ipcRenderer.invoke('activity:getPaginated', page, limit),
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

console.log('[Preload] Preload script loaded - API exposed to renderer');
