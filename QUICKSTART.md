# Quick Start Checklist

## ✅ Phase 1: Initial Setup (5 minutes)

### Prerequisites
- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm 9+ installed (`npm --version`)
- [ ] Git installed and configured
- [ ] Have a text editor (VS Code recommended)

### Clone & Install
```bash
git clone https://github.com/Errol01/DorianMintBotV2.git
cd DorianMintBotV2
npm install
```

- [ ] Clone completed successfully
- [ ] `npm install` completed without critical errors
- [ ] `node_modules/` directory created

---

## ✅ Phase 2: Environment Setup (3 minutes)

### Create `.env` file
```bash
# In project root directory, create file named: .env

NODE_ENV=development
VITE_ENCRYPTION_KEY=your-secure-random-key-min-32-chars-here

# Optional - Add your RPC endpoints for mainnet/testnet
# VITE_RPC_MAINNET=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
# VITE_RPC_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

**Generate encryption key:**
```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
[Convert]::ToHexString((1..32 | ForEach-Object { [byte](Get-Random -Maximum 256) }))
```

- [ ] `.env` file created in root directory
- [ ] `VITE_ENCRYPTION_KEY` set to 32+ character random string
- [ ] `.env` file added to `.gitignore` (for security)

---

## ✅ Phase 3: Verify Installation (5 minutes)

### Test Build & Lint
```bash
# Check for any linting errors
npm run lint:check

# Should show no critical errors
```

- [ ] Linting check passed
- [ ] No error messages in output

### Test Dependencies
```bash
# Verify all critical packages installed
node -e "console.log('✓ Node working'); require('electron'); console.log('✓ Electron OK'); require('better-sqlite3'); console.log('✓ SQLite OK'); require('ethers'); console.log('✓ ethers OK')"
```

- [ ] All packages load successfully

---

## ✅ Phase 4: Development Mode (10 minutes)

### Terminal 1: Start Vite Dev Server
```bash
npm run dev
```

**Expected output:**
```
  VITE v5.0.0  ready in 200 ms

  ➜  Local:   http://127.0.0.1:5173/
  ➜  Press h to show help
```

- [ ] Vite server started on `http://127.0.0.1:5173`
- [ ] No errors in console
- [ ] Dev server is ready

### Terminal 2: Start Electron App
```bash
npm run electron:dev
```

**Expected output:**
```
[Electron] Main process loaded
[Electron] App ready
[Electron] Main window created
[DB] Database initialized at: /path/to/app.db
[IPC] All IPC handlers initialized
```

- [ ] Electron window opens without crashing
- [ ] Preload script loads successfully
- [ ] Database initialized
- [ ] IPC handlers registered

### In Electron App
- [ ] Window displays without errors
- [ ] React UI loads
- [ ] No blank screen
- [ ] Can access DevTools (F12)

---

## ✅ Phase 5: Test Core Features (10 minutes)

### Test 1: Wallet Generation
```javascript
// In browser console (F12)
const result = await window.electronAPI.wallet.generateMnemonic();
console.log(result);
// Should show: { success: true, mnemonic: "word1 word2 word3..." }
```

- [ ] Returns success
- [ ] Mnemonic is 12 words
- [ ] No errors

### Test 2: Database Access
```javascript
const result = await window.electronAPI.db.initialize();
console.log(result);
// Should show: { success: true, message: "Database initialized" }
```

- [ ] Database initializes
- [ ] No connection errors
- [ ] Tables created

### Test 3: Blockchain Initialization
```javascript
const result = await window.electronAPI.blockchain.initialize();
console.log(result);
// Should show: { success: true, message: "Blockchain service initialized" }
```

- [ ] Blockchain service initializes
- [ ] Primary RPC endpoint configured
- [ ] No network errors

### Test 4: RPC Endpoints
```javascript
const result = await window.electronAPI.rpc.getAllEndpoints();
console.log(result);
// Should show: { success: true, rpcs: [...] }
```

- [ ] Can retrieve RPC endpoints
- [ ] Returns array (may be empty initially)

### Test 5: Activity Logging
```javascript
const result = await window.electronAPI.activity.getAll();
console.log(result);
// Should show: { success: true, logs: [...] }
```

- [ ] Activity logs working
- [ ] Can retrieve logs

---

## ✅ Phase 6: Production Build (5 minutes)

### Build React App
```bash
npm run build
```

**Expected output:**
```
dist/
├── index.html
├── assets/
│   ├── index-abc123.js
│   └── index-def456.css
```

- [ ] Build completed successfully
- [ ] `dist/` directory created
- [ ] No build errors

### Build Electron App
```bash
npm run electron:build
```

**Expected output:**
```
release/
├── DorianMintBotV2 Setup.exe (Windows)
├── DorianMintBotV2.dmg (macOS)
└── DorianMintBotV2.AppImage (Linux)
```

- [ ] Build completed without errors
- [ ] Executable created in `release/` directory
- [ ] Installer file present

---

## ✅ Phase 7: Final Verification

### File Structure Check
```bash
# Verify all critical files exist
ls -la electron/
ls -la electron/database/
ls -la electron/services/
ls -la electron/ipc/
ls -la src/
```

Required files should exist:
- [ ] `electron/main.js` ✓
- [ ] `electron/preload.js` ✓
- [ ] `electron/database/db.js` ✓
- [ ] `electron/database/repositories.js` ✓
- [ ] `electron/services/EncryptionService.js` ✓
- [ ] `electron/services/WalletService.js` ✓
- [ ] `electron/services/BlockchainService.js` ✓
- [ ] `electron/services/TransactionQueue.js` ✓
- [ ] `electron/ipc/handlers.js` ✓
- [ ] `IMPLEMENTATION_GUIDE.md` ✓
- [ ] `.env` (in .gitignore) ✓

### Security Checklist
- [ ] `.env` file is in `.gitignore`
- [ ] Private keys are never logged
- [ ] Encryption key is secure (32+ chars)
- [ ] Database file has appropriate permissions
- [ ] No hardcoded secrets in code
- [ ] Context isolation is enabled in Electron
- [ ] Node integration is disabled

### Database Verification
```bash
# Check database file was created
# Windows: %APPDATA%\DorianMintBotV2\app.db
# macOS: ~/Library/Application Support/DorianMintBotV2/app.db
# Linux: ~/.config/DorianMintBotV2/app.db
```

- [ ] Database file exists in correct location
- [ ] Can be opened with SQLite browser (optional)
- [ ] Tables created successfully

---

## 🚀 Ready for Development!

You now have a fully functional Electron + React application with:

✅ **Database Layer**
- SQLite database with proper schema
- Repository pattern for database access
- Encrypted storage for sensitive data

✅ **Services Layer**
- Encryption/decryption (AES-256)
- HD Wallet management (BIP39)
- Blockchain interactions (ethers v6)
- Transaction queue with retry logic

✅ **IPC Layer**
- Secure preload bridge
- 40+ IPC handlers
- Error handling and logging

✅ **UI Layer**
- React + Vite development setup
- Live hot reload during development
- Production-ready build system

---

## Next Steps

### 1. **Build Your UI** (in `src/`)
```javascript
// Create components using window.electronAPI
// Example: src/components/WalletManager.jsx
export function WalletManager() {
  const [wallets, setWallets] = useState([]);

  useEffect(() => {
    window.electronAPI.wallet.getAllWallets()
      .then(res => {
        if (res.success) setWallets(res.wallets);
      });
  }, []);

  return <div>{/* JSX */}</div>;
}
```

### 2. **Add Features**
- Extend services in `electron/services/`
- Add new IPC handlers in `electron/ipc/handlers.js`
- Add corresponding preload methods in `electron/preload.js`

### 3. **Test on Testnet**
- Configure Sepolia RPC endpoint in `.env`
- Get test ETH from faucet
- Test wallet creation and transactions

### 4. **Deploy**
```bash
npm run electron:build
# Share the installer from release/ directory
```

---

## Common Commands

```bash
# Development
npm run dev              # Start Vite dev server
npm run electron:dev    # Start Electron with dev server

# Building
npm run build           # Build React app
npm run electron:build  # Build Electron installer
npm run preview         # Preview production build locally

# Maintenance
npm run lint:check      # Check for linting errors
npm run rebuild         # Rebuild native modules
npm install --save-dev <package>  # Add new dependency

# Debugging
npm run electron:dev    # Enable DevTools (F12)
# Check main process logs in terminal
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "better-sqlite3" fails to load | Run `npm run rebuild` |
| Vite port 5173 already in use | Change port in `vite.config.js` |
| Database not found | Check `%APPDATA%/DorianMintBotV2/app.db` location |
| IPC API undefined | Ensure preload.js is loaded (F12 > Console) |
| Encryption key error | Regenerate with `openssl rand -hex 32` |
| App crashes on startup | Check `.env` file exists and has valid values |

---

## Support

- 📖 [Implementation Guide](./IMPLEMENTATION_GUIDE.md)
- 🔗 [Electron Docs](https://www.electronjs.org/docs)
- ⛓️ [ethers.js Docs](https://docs.ethers.org/v6)
- 💾 [SQLite Docs](https://www.sqlite.org/docs.html)

---

**Status**: ✅ Ready for Development  
**Last Updated**: 2026-07-16  
**Version**: 2.0.0
