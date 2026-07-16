# DorianMintBotV2 - Complete Implementation Guide

## Overview

This is a production-ready **Electron + React** application for managing HD wallets and executing batch Ethereum transactions. The architecture follows a **clean layered design** with complete separation of concerns.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   React UI (Renderer)                       │
│                     (src/...)                               │
└──────────────────────────┬──────────────────────────────────┘
                           │ IPC
┌──────────────────────────▼──────────────────────────────────┐
│              Electron Main Process                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  IPC Handlers (electron/ipc/handlers.js)            │   │
│  └────────────┬─────────────────────────────────────────┘   │
│               │                                              │
│  ┌────────────▼──────────┬──────────────┬──────────────┐    │
│  │                       │              │              │    │
│  ▼                       ▼              ▼              ▼    │
│ Services            Database         Utils          Config  │
│ • Encryption      • Repositories   • Security        • Env  │
│ • Wallet          • SQLite DB      • Logging               │
│ • Blockchain      • Transactions                            │
│ • TransactionQueue                                          │
│ • RPC Manager                                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
DorianMintBotV2/
├── electron/                          # Electron Main Process
│   ├── main.js                       # Application entry point
│   ├── preload.js                    # Secure IPC bridge
│   ├── database/
│   │   ├── db.js                    # SQLite initialization
│   │   └── repositories.js          # Database access layer
│   ├── ipc/
│   │   └── handlers.js              # All IPC event handlers
│   └── services/
│       ├── EncryptionService.js     # AES-256 encryption
│       ├── WalletService.js         # HD Wallet management
│       ├── BlockchainService.js     # Ethereum operations
│       └── TransactionQueue.js      # Queue + retry logic
│
├── src/                              # React UI (Vite)
│   ├── main.jsx
│   ├── App.jsx
│   ├── components/                  # React components
│   ├── pages/                       # Page components
│   ├── hooks/                       # Custom React hooks
│   ├── services/                    # Frontend services
│   ├── context/                     # React context
│   └── utils/                       # Utility functions
│
├── package.json
├── vite.config.js
├── eslint.config.js
├── index.html
└── README.md
```

---

## Setup Instructions

### Step 1: Prerequisites

```bash
# Required
- Node.js 18+ (with npm)
- Git

# Check versions
node --version    # v18+
npm --version     # 9+
```

### Step 2: Clone & Install Dependencies

```bash
# Clone repository
git clone https://github.com/Errol01/DorianMintBotV2.git
cd DorianMintBotV2

# Install dependencies
npm install

# This installs:
# - electron (v43.1.1)
# - better-sqlite3 (database)
# - ethers v6 (blockchain)
# - bip39 + hdkey (HD wallets)
# - react + react-dom (UI)
# - vite (build tool)
# - tailwindcss (styling)
```

### Step 3: Environment Configuration

Create a `.env` file in the root directory:

```bash
# .env
NODE_ENV=development
VITE_ENCRYPTION_KEY=your-secure-encryption-key-min-32-chars

# Optional - RPC endpoints
VITE_RPC_MAINNET=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
VITE_RPC_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

**Important**: Generate a secure encryption key:
```bash
# Linux/Mac
openssl rand -hex 32

# Or use any secure random generator for at least 32 characters
```

### Step 4: Verify Installation

```bash
# Test if everything is installed correctly
npm run lint:check    # Check for linting errors

# You should see no critical errors
```

---

## Running the Application

### Development Mode

```bash
# Terminal 1: Start Vite dev server
npm run dev

# Terminal 2 (optional): In another terminal, you can monitor
# Vite starts on http://127.0.0.1:5173

# To run Electron with hot reload:
npm run electron:dev

# This will:
# 1. Start Vite dev server
# 2. Wait for it to be ready
# 3. Launch Electron app pointing to localhost:5173
```

### Production Build

```bash
# Build the React app
npm run build

# Output: dist/ folder with optimized build

# Build Electron installer
npm run electron:build

# Output: release/ folder with executable
```

### Preview Build (Test production build locally)

```bash
npm run preview
```

---

## Database Schema

### SQLite Tables

#### 1. **wallets**
```sql
CREATE TABLE wallets (
  id INTEGER PRIMARY KEY,
  address TEXT UNIQUE,              -- Wallet address
  publicKey TEXT,                   -- Public key
  privateKey TEXT,                  -- AES-256 encrypted
  encryptedMnemonic TEXT,           -- HD wallet mnemonic (encrypted)
  mnemonicIndex INTEGER,            -- Index in HD path
  name TEXT,                        -- User-friendly name
  imported BOOLEAN,                 -- Import vs generated
  createdAt DATETIME,
  updatedAt DATETIME
);
```

#### 2. **master_mnemonic**
```sql
CREATE TABLE master_mnemonic (
  id INTEGER PRIMARY KEY (only 1 row),
  encryptedMnemonic TEXT,           -- Master seed phrase (AES-256)
  createdAt DATETIME
);
```

#### 3. **transactions**
```sql
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY,
  fromAddress TEXT,
  toAddress TEXT,
  amount TEXT,                      -- In ETH
  gasPrice TEXT,
  gasLimit TEXT,
  nonce INTEGER,
  status TEXT,                      -- pending, completed, failed
  transactionHash TEXT,
  blockNumber INTEGER,
  retryCount INTEGER,
  error TEXT,
  createdAt DATETIME,
  sentAt DATETIME,
  confirmedAt DATETIME
);
```

#### 4. **rpc_endpoints**
```sql
CREATE TABLE rpc_endpoints (
  id INTEGER PRIMARY KEY,
  name TEXT,
  url TEXT UNIQUE,
  chainId INTEGER,
  isActive BOOLEAN,
  isPrimary BOOLEAN,                -- Primary endpoint used
  createdAt DATETIME
);
```

#### 5. **settings**
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  type TEXT,                        -- string, number, boolean
  updatedAt DATETIME
);
```

#### 6. **activity_logs**
```sql
CREATE TABLE activity_logs (
  id INTEGER PRIMARY KEY,
  type TEXT,                        -- wallet, transaction, rpc, queue
  action TEXT,                      -- generated, imported, sent, etc
  details TEXT,
  status TEXT,                      -- success, error, warning, info
  createdAt DATETIME
);
```

---

## Core Services

### 1. EncryptionService (`electron/services/EncryptionService.js`)

```javascript
// Encrypt sensitive data
EncryptionService.encrypt(privateKey)
// Returns: encrypted string

// Decrypt for transactions
EncryptionService.decrypt(encryptedPrivateKey)
// Returns: original plaintext

// Hash passwords
EncryptionService.hash(password)
// Returns: SHA-256 hash
```

### 2. HDWalletManager (`electron/services/WalletService.js`)

```javascript
// Generate new mnemonic
const mnemonic = HDWalletManager.generateMnemonic()
// Returns: 12-word BIP39 phrase

// Derive wallets from mnemonic
const wallets = HDWalletManager.generateWalletsFromMnemonic(mnemonic, 10)
// Returns: Array of {address, publicKey, privateKey, path, index}

// Validate mnemonic
HDWalletManager.validateMnemonic(mnemonic)
// Returns: true/false
```

### 3. BlockchainService (`electron/services/BlockchainService.js`)

```javascript
// Get wallet balance
const balance = await BlockchainService.getBalance(address)
// Returns: "1.234" (in ETH)

// Get gas price (EIP-1559)
const fees = await BlockchainService.getGasPrice()
// Returns: {gasPrice, maxFeePerGas, maxPriorityFeePerGas}

// Estimate gas for transaction
const gas = await BlockchainService.estimateGas(from, to, amount)
// Returns: "21000" (gas units)

// Send transaction
const result = await BlockchainService.sendTransaction(privateKey, to, amount)
// Returns: {hash, from, to, blockNumber, gasUsed, status}

// Get transaction status
const status = await BlockchainService.getTransactionStatus(txHash)
// Returns: {status: 'confirmed'|'pending'|'failed', confirmations}
```

### 4. TransactionQueue (`electron/services/TransactionQueue.js`)

```javascript
// Add to queue
const tx = TransactionQueue.addTransaction({
  fromAddress: '0x...',
  toAddress: '0x...',
  amount: '0.1',  // ETH
})
// Auto-starts processing

// Control queue
TransactionQueue.pauseQueue()
TransactionQueue.resumeQueue()
TransactionQueue.cancelTransaction(txId)

// Monitor
const status = TransactionQueue.getQueueStatus()
// Returns: {total, pending, processing, completed, failed, queued}

// Subscribe to events
TransactionQueue.subscribe((event) => {
  console.log(event.event, event.data)
})
```

---

## IPC API Reference

### Usage in React Component

```javascript
// In any React component
export function WalletManager() {
  const [wallets, setWallets] = useState([])

  useEffect(() => {
    // Call IPC API
    window.electronAPI.wallet.getAllWallets()
      .then(res => {
        if (res.success) {
          setWallets(res.wallets)
        }
      })
  }, [])

  return (
    // JSX
  )
}
```

### Available IPC Handlers

#### Wallet APIs
```javascript
window.electronAPI.wallet.generateMnemonic()
window.electronAPI.wallet.validateMnemonic(mnemonic)
window.electronAPI.wallet.saveMnemonic(mnemonic)
window.electronAPI.wallet.generateWallets(count)
window.electronAPI.wallet.getAllWallets()
window.electronAPI.wallet.getWalletById(id)
window.electronAPI.wallet.updateWallet(id, updates)
window.electronAPI.wallet.deleteWallet(id)
window.electronAPI.wallet.importFromPrivateKey(privateKey, name)
window.electronAPI.wallet.importFromMnemonic(mnemonic, count)
```

#### Blockchain APIs
```javascript
window.electronAPI.blockchain.initialize()
window.electronAPI.blockchain.getBalance(address)
window.electronAPI.blockchain.getNonce(address)
window.electronAPI.blockchain.getGasPrice()
window.electronAPI.blockchain.estimateGas(from, to, amount)
window.electronAPI.blockchain.getChainInfo()
window.electronAPI.blockchain.validateBatchTransactions(transactions)
```

#### Transaction APIs
```javascript
window.electronAPI.transaction.addToQueue(txData)
window.electronAPI.transaction.getQueueStatus()
window.electronAPI.transaction.getQueue()
window.electronAPI.transaction.pauseQueue()
window.electronAPI.transaction.resumeQueue()
window.electronAPI.transaction.cancelTransaction(txId)
window.electronAPI.transaction.clearQueue()
window.electronAPI.transaction.getHistory()
```

#### RPC APIs
```javascript
window.electronAPI.rpc.addEndpoint(rpcData)
window.electronAPI.rpc.getAllEndpoints()
window.electronAPI.rpc.getPrimaryEndpoint()
window.electronAPI.rpc.deleteEndpoint(id)
window.electronAPI.rpc.switchRpc(rpcUrl)
```

#### Activity Log APIs
```javascript
window.electronAPI.activity.getAll()
window.electronAPI.activity.getByType(type)
window.electronAPI.activity.getPaginated(page, limit)
```

---

## Common Workflows

### Workflow 1: Generate & Save New Wallet

```javascript
async function createNewWallet() {
  // 1. Generate mnemonic
  const { mnemonic } = await window.electronAPI.wallet.generateMnemonic()
  
  // 2. User backs up the mnemonic (very important!)
  console.log('Backup this:', mnemonic)
  
  // 3. Save encrypted mnemonic to database
  await window.electronAPI.wallet.saveMnemonic(mnemonic)
  
  // 4. Generate wallets from mnemonic
  const { wallets } = await window.electronAPI.wallet.generateWallets(10)
  
  // 5. Display to user
  setWallets(wallets)
}
```

### Workflow 2: Batch Transfer ETH

```javascript
async function sendBatchTransactions() {
  const transactions = [
    { toAddress: '0xABC...', amount: '0.1' },
    { toAddress: '0xDEF...', amount: '0.2' },
    { toAddress: '0xGHI...', amount: '0.15' },
  ]
  
  // 1. Validate all transactions
  const { valid, errors } = await window.electronAPI.blockchain
    .validateBatchTransactions(transactions)
  
  if (!valid) {
    console.error('Validation errors:', errors)
    return
  }
  
  // 2. Queue transactions
  for (const tx of transactions) {
    await window.electronAPI.transaction.addToQueue({
      fromAddress: selectedWallet.address,
      toAddress: tx.toAddress,
      amount: tx.amount,
    })
  }
  
  // 3. Monitor progress
  const unsubscribe = TransactionQueue.subscribe((event) => {
    setQueueStatus(event.data)
  })
  
  // 4. User can pause/resume
  // await window.electronAPI.transaction.pauseQueue()
  // await window.electronAPI.transaction.resumeQueue()
}
```

### Workflow 3: Import Existing Wallet

```javascript
async function importWallet() {
  // Option A: Import from private key
  const { wallet } = await window.electronAPI.wallet
    .importFromPrivateKey(privateKey, 'My Wallet')
  
  // Option B: Import multiple from mnemonic
  const { wallets } = await window.electronAPI.wallet
    .importFromMnemonic(mnemonicPhrase, 5)
}
```

---

## Verification Checklist

Before deploying, verify:

- [ ] `npm install` completes without errors
- [ ] `npm run lint:check` shows no critical errors
- [ ] `npm run dev` starts Vite server on port 5173
- [ ] `npm run electron:dev` launches Electron without crashes
- [ ] Database file created in `%APPDATA%/DorianMintBotV2` (Windows) or `~/Library/Application Support/DorianMintBotV2` (macOS)
- [ ] Can generate wallets
- [ ] Can add transactions to queue
- [ ] Can pause/resume queue
- [ ] Activity logs are recorded
- [ ] Private keys are encrypted in database
- [ ] RPC endpoints configured
- [ ] No TypeScript/ESLint errors
- [ ] `npm run build` completes successfully
- [ ] `npm run electron:build` creates installer

---

## Troubleshooting

### Issue: "better-sqlite3" native module fails to load
```bash
# Rebuild native modules
npm run rebuild
# or
npm install --build-from-source
```

### Issue: Database file not found
- Check app's userData directory permissions
- On Windows: `C:\Users\<User>\AppData\Local\DorianMintBotV2`
- On macOS: `~/Library/Application Support/DorianMintBotV2`

### Issue: Vite port already in use
```bash
# Change port in vite.config.js or use different port
npm run dev -- --port 3000
```

### Issue: Electron not loading preload script
- Verify `preload: path.join(__dirname, 'preload.js')` in main.js
- Check `contextIsolation: true` and `nodeIntegration: false`

### Issue: IPC handler not responding
- Check browser console (F12) for errors
- Check Electron main process logs
- Verify handler is registered in `ipc/handlers.js`

---

## Next Steps

1. **Customize UI** - Modify React components in `src/`
2. **Add Features** - Extend services as needed
3. **Configure RPC** - Add blockchain endpoints in settings
4. **Test Thoroughly** - Use testnet (Sepolia) first
5. **Build & Release** - Use `npm run electron:build`

---

## Security Notes

⚠️ **Critical Security Considerations:**

1. **Private Keys**: Always encrypted with AES-256 before storage
2. **Mnemonics**: Never log or display in plain text
3. **IPC**: All communication is sandboxed via preload script
4. **Environment**: Use strong encryption keys in production
5. **Database**: Runs in main process only (not accessible from renderer)
6. **No Remote Code Execution**: `nodeIntegration: false` and `contextIsolation: true`

---

## Support & Documentation

- [Electron Documentation](https://www.electronjs.org/docs)
- [ethers.js v6 Docs](https://docs.ethers.org/v6)
- [BIP39 Specification](https://github.com/trezor/python-mnemonic)
- [SQLite Reference](https://www.sqlite.org/docs.html)

---

**Version**: 2.0.0  
**Last Updated**: 2026-07-16
