# FinShield AI — Troubleshooting Guide

Common issues and solutions for FinShield AI setup and development.

---

## Installation Issues

### Cannot find module `pg`, `express`, etc.

**Error**: `Cannot find module 'pg' or its corresponding type declarations`

**Solution**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules server/node_modules client/node_modules
npm run install-all

# Or use a clean cache
npm cache clean --force
npm install
npm install -w server
npm install -w client
```

---

### Node.js version mismatch

**Error**: `Node version does not match. Requires ^18.0.0`

**Solution**:
- Check Node.js version: `node --version`
- Install Node.js 18+: https://nodejs.org
- Use nvm for version management:
  ```bash
  nvm install 18
  nvm use 18
  ```

---

### npm ERR! code ERESOLVE

**Error**: `ERESOLVE unable to resolve dependency tree`

**Solution**:
```bash
# Use legacy peer deps resolution
npm install --legacy-peer-deps
npm install -w server --legacy-peer-deps
npm install -w client --legacy-peer-deps
```

---

## Database Issues

### "DATABASE_URL environment variable is required"

**Error**: Server fails to start with this error

**Solution**:
1. Check if `.env` exists in `server/` directory
2. Verify it contains: `DATABASE_URL=postgresql://...`
3. Restart server after updating `.env`

```bash
cd server
cat .env  # Verify content
npm run dev
```

---

### "Connection refused" to PostgreSQL

**Error**: `error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution**:

**Option A**: Start local PostgreSQL
```bash
# macOS
brew services start postgresql

# Ubuntu/Linux
sudo service postgresql start

# Windows - use Windows Services or:
pg_ctl -D "C:\Program Files\PostgreSQL\16\data" start
```

**Option B**: Use Docker
```bash
docker-compose up -d

# Verify running
docker-compose ps
```

**Option C**: Use cloud database
- Create account at [Neon.tech](https://neon.tech)
- Update DATABASE_URL in `.env`

---

### "ERROR: database 'finshield' does not exist"

**Error**: Server can't connect to database

**Solution**:
```bash
# Create database locally
psql -U postgres -c "CREATE DATABASE finshield;"

# Run schema
psql -U postgres -d finshield -f schema.sql

# Verify
psql -U postgres -d finshield -c "SELECT * FROM sessions;"
```

---

### Database keeps resetting

**Cause**: Docker container is being removed on stop

**Solution**:
```bash
# Verify volume exists
docker volume ls | grep finshield

# Use named volume (persistent data)
docker-compose up -d

# Data survives container restart
```

---

## Server Issues

### "PORT 8080 already in use"

**Error**: `listen EADDRINUSE: address already in use :::8080`

**Solution**:

**Windows**:
```powershell
# Find process on port 8080
netstat -ano | findstr :8080

# Kill process (replace PID)
taskkill /PID <PID> /F

# Or use different port
PORT=8081 npm run dev
```

**macOS/Linux**:
```bash
# Find and kill process
lsof -i :8080
kill -9 <PID>

# Or use different port
PORT=8081 npm run dev
```

---

### "Cannot find module './app.js'"

**Error**: Import error after build

**Symptom**: Server starts but crashes immediately

**Solution**:
```bash
cd server

# Clear and rebuild
rm -rf dist
npm run build

# Verify dist exists
ls -la dist/

# Start
npm run dev
```

---

### Server crashes with "ENOENT: no such file or directory"

**Solution**:
- Check all `.js` imports have `.js` extension (ESM requirement)
- Verify import paths are correct: `./path/file.js`
- Look at full error message for file path

---

## Client Issues

### "Cannot find module '@/components/...'"

**Error**: Path alias not working

**Solution**:
1. Verify `vite.config.ts` path alias:
   ```typescript
   resolve: {
     alias: { "@": path.resolve(__dirname, "./src") }
   }
```
2. Verify `tsconfig.json` paths:
   ```json
   "paths": { "@/*": ["./src/*"] }
   ```
3. Restart Vite dev server

---

### Vite dev server won't start

**Error**: `PORT 5173 already in use` or similar

**Solution**:
```bash
# Kill process on port 5173
# Windows: netstat -ano | findstr :5173 && taskkill /PID <PID> /F
# macOS/Linux: lsof -i :5173 && kill -9 <PID>

# Or use different port
npm run dev -- --port 3000
```

---

### "Module not found" after npm install

**Solution**:
```bash
cd client

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Restart Vite
npm run dev
```

---

### Build fails with TypeScript errors

**Solution**:
```bash
# Check errors
npm run build

# Fix types
# - Review error messages carefully
# - Add `// @ts-ignore` for intentional issues (temporary)
# - Install missing @types packages (e.g., @types/react)

# Try rebuilding
npm run build
```

---

## Network Issues

### Frontend can't reach backend API

**Error**: CORS error or 404 on API calls

**Solution**:

1. Verify server is running: `curl http://localhost:8080/api/healthz`
2. Check frontend API base URL in `.env`:
   ```env
   VITE_API_BASE=/api
   ```
3. Verify proxy config in `vite.config.ts`:
   ```typescript
   proxy: {
     "/api": {
       target: "http://localhost:8080",
       changeOrigin: true,
     }
   }
   ```
4. Check browser console for exact error
5. Restart both client and server

---

### Geolocation not working

**Cause**: Browser permission or HTTPS requirement

**Solution**:
- Allow location permission when prompted
- In development (localhost), HTTPS is not required
- Check browser console for specific error
- Try different browser
- Ensure `navigator.geolocation` is available

---

### API returns 401/403 Unauthorized

**Cause**: Session expired or not authenticated

**Solution**:
- Log in again
- Check localStorage for `finshield_session`
- Verify session still exists on server
- Clear localStorage and re-login:
  ```javascript
  localStorage.removeItem('finshield_session');
  ```

---

## Performance Issues

### High CPU/Memory usage

**Solution**:
1. Close other applications
2. Clear browser cache: DevTools → Application → Clear Storage
3. Restart both servers
4. Check for memory leaks:
   ```bash
   # Server memory usage
   ps aux | grep node
   
   # Client - use Chrome DevTools → Memory tab
   ```

---

### Slow database queries

**Solution**:
```sql
-- Check indexes
SELECT * FROM pg_stat_user_indexes;

-- Check slow queries
CREATE INDEX idx_sessions_created ON sessions(created_at DESC);

-- Monitor connections
SELECT count(*) FROM pg_stat_activity;
```

---

## Debugging

### Enable verbose logging

**Server**:
```typescript
// Add to db.ts or app.ts
console.log("DEBUG: Variable name:", variableName);

// Or use debug module
import debug from 'debug';
const log = debug('finshield:server');
log('Message');
```

**Client**:
```typescript
// Browser console
console.log("DEBUG: ", value);
debugger; // Pause execution
```

---

### Check logs

**Server logs**:
```bash
# All output
npm run dev 2>&1 | tee server.log

# Check specific errors
grep "ERROR\|error" server.log
```

**Browser console**:
- Open DevTools (F12)
- Check Console, Network, Application tabs
- Look for red error messages

---

## Still Having Issues?

1. **Check documentation**: SETUP.md, API.md
2. **Review error messages**: Read stack traces carefully
3. **Search online**: Copy exact error message
4. **Check GitHub issues**: Similar problems might be reported
5. **Ask for help**: Create an issue with:
   - OS and Node.js version
   - Exact error message
   - Steps to reproduce
   - What you've already tried

---

## Quick Fixes

```bash
# Nuclear option - clean reinstall
rm -rf node_modules server/node_modules client/node_modules
rm package-lock.json server/package-lock.json client/package-lock.json
npm cache clean --force
npm run install-all

# Restart everything
npm run dev

# Completely fresh database
docker-compose down -v
docker-compose up -d
```

---

Last Updated: April 2024
