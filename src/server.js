// server.js — HeptaPower Master Controller - TCP Broker + Admin Dashboard

// ========== LOGGER (Must be first to capture all logs) ==========
const { logsDir, getLogFileName } = require('./utils/logger');

const net = require('net');
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ========== LOAD COMPONENTS ==========
const adminLoginPage = require('./components/login');
const adminVerifyPage = require('./components/verify');
const adminDashboardPage = require('./components/dashboard');
const userLoginPage = require('./components/user-login');
const userDashboardPage = require('./components/user-dashboard');
const { verifyTOTP } = require('./components/auth');

// ========== EA MANAGER (Hierarchical Structure) ==========
const EAManager = require('./managers/ea-manager');

// ========== TRADE MANAGERS ==========
const TradeRequestManager = require('./managers/trade-request-manager');
const TradeCopyManager = require('./managers/trade-copy-manager');

// ========== COPY SERVICE (Independent) ==========
const CopyService = require('./services/copy-service');

// ========== TCP MESSAGE HANDLERS ==========
const TCPMessageHandler = require('./handlers/tcp-message-handler');

// ========== SECURITY UTILITIES ==========
const Security = require('./utils/security');

// ========== DATABASE ==========
const mongoose = require('mongoose');
const { connectDB, isMongoConnected } = require('./config/database');
const Account = require('./models/Account');

// ========== LOAD CONFIG ==========
let config = {
  admin: {username: 'admin', password: 'HeptaPower@2025', twoFactorSecret: 'JBSWY3DPEHPK3PXP', id: 'ADMIN001', require2FA: false},
  security: {maxLoginAttempts: 5, loginBlockTime: 300000},
  server: {tcpPort: 4001, httpPort: 3000, sharedSecret: '', maxHz: 2, offlineSec: 15},
  database: {mongodbUri: 'mongodb://localhost:27017/heptapower', useDatabase: false}
};

try {
  const configPath = path.join(__dirname, '../admin_config.json');
  if(fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('[CONFIG] Loaded from admin_config.json');
  } else {
    console.log('[CONFIG] Using default config (admin_config.json not found)');
  }
} catch(err) {
  console.error('[CONFIG] Error loading config:', err.message);
}

// ========== CONNECT TO DATABASE ==========
if(config.database && config.database.useDatabase) {
  connectDB(config.database.mongodbUri).catch(err => {
    console.log('[MongoDB] Continuing with in-memory storage');
  });
} else {
  console.log('[MongoDB] Disabled (set useDatabase:true to enable)');
}

// ========== CONFIG (ENV or FILE) ==========
const TCP_PORT     = parseInt(process.env.TCP_PORT)     || config.server.tcpPort;
const HTTP_PORT    = parseInt(process.env.HTTP_PORT)    || config.server.httpPort;
const SHARED_SECRET= process.env.SHARED_SECRET          || config.server.sharedSecret;
// Rate limit config (new), fallback to legacy maxHz if present
const RATE_MAX_HZ_PER_EA = parseFloat(process.env.RATE_LIMIT_MAX_HZ_PER_EA) 
  || parseFloat(config.server.rateLimitMaxHzPerEA || config.server.maxHz || 20);
const RATE_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) 
  || parseInt(config.server.rateLimitWindowMs || 1000);
const OFFLINE_SEC  = parseInt(process.env.OFFLINE_SEC)  || config.server.offlineSec;
const TIMESTAMP_WINDOW = 60000; // 60s tolerance for ts drift

const ADMIN_USER = config.admin.username;
const ADMIN_PASS = config.admin.password;
const ADMIN_2FA_SECRET = config.admin.twoFactorSecret;
const REQUIRE_2FA = config.admin.require2FA !== false; // Default true

const controllers = new Map(); // id -> {id,state,balance,ts,lastTick,blocked,lastSeen}
const blocklist   = new Set();
const sseClients  = new Set();

// ========== INITIALIZE COPY SERVICE (Independent Trade Copying) ==========
const copyService = new CopyService(controllers);
copyService.start();
console.log('✅ Copy Service started - independent from TCP handlers');

// ========== ADMIN ACCOUNTS ==========
const adminAccounts = new Map(); // username -> {username, password, id, createdAt, active}
const loginAttempts = new Map(); // ip -> {attempts, lastAttempt, blockedUntil}
const tempSessions = new Map(); // tempToken -> {username, password, createdAt}
const MAX_LOGIN_ATTEMPTS = config.security.maxLoginAttempts;
const LOGIN_BLOCK_TIME = config.security.loginBlockTime;

// Initialize with admin from config
adminAccounts.set(ADMIN_USER, {
  username: ADMIN_USER,
  password: ADMIN_PASS,
  id: config.admin.id,
  createdAt: Date.now(),
  active: true
});

// ========== SSE BROADCAST ==========
function broadcast(obj) {
  const line = `data: ${JSON.stringify(obj)}\n\n`;
  for (const res of sseClients) res.write(line);
}

// ========== TCP SERVER ==========
const tcp = net.createServer(sock => {
  Security.parseFrames(sock, async msg => {
    // Verify HMAC auth
    const authCheck = Security.verifyMessage(msg, SHARED_SECRET, TIMESTAMP_WINDOW);
    if (!authCheck.ok) {
      console.warn(`[AUTH] ❌ Reject id=${msg.id||'?'} type=${msg.type||'?'} req=${msg.requestId||'-'} reason=${authCheck.reason}`);
      sock.destroy();
      return;
    }
    
    // Check rate limit (but exempt critical message types)
    const exemptFromRateLimit = [
      'hello', 
      'deinit', 
      'account_info', 
      'trades_live', 
      'trades_history', 
      'trade_response',
      'trade_action',           // Single trade action (critical for reliability)
      'trade_actions_bulk',     // Bulk trade actions (critical for performance)
      'status',                 // Heartbeat/connection health
      'tick'                    // Price sync
    ];
    if (msg.id && !exemptFromRateLimit.includes(msg.type)) {
      const rateCheck = Security.checkRateLimit(msg.id, RATE_MAX_HZ_PER_EA, RATE_WINDOW_MS);
      if (!rateCheck.ok) {
        console.warn(`[RATE] ⛔ Dropped id=${msg.id} type=${msg.type} req=${msg.requestId||'-'}`);
        return; // dropped by rate limiter
      }
    }
    
    // Router: keep silent unless errors occur
      
    // Route message to appropriate handler
    if (msg.type === 'hello') {
      await TCPMessageHandler.handleHelloMessage(msg, sock, controllers, adminAccounts, isMongoConnected, Account, loadEASettings, broadcast);
    }
    else if (msg.type === 'status') {
      TCPMessageHandler.handleStatusMessage(msg, sock, controllers, broadcast);
              }
    else if (msg.type === 'error') {
      TCPMessageHandler.handleErrorMessage(msg, sock, controllers, broadcast);
    }
    else if (msg.type === 'deinit') {
      TCPMessageHandler.handleDeinitMessage(msg, sock, controllers, broadcast);
    }
    else if (msg.type === 'tick') {
      TCPMessageHandler.handleTickMessage(msg, sock, controllers, broadcast);
              }
    else if (msg.type === 'account_info') {
      TCPMessageHandler.handleAccountInfoMessage(msg, sock, controllers, broadcast);
    }
    else if (msg.type === 'trades_live') {
      // LIGHTWEIGHT: Just store in Memory - Copy Service handles the rest
      TCPMessageHandler.handleTradesLiveMessage(msg, sock, controllers, broadcast);
            }
    else if (msg.type === 'trades_history') {
      TCPMessageHandler.handleTradesHistoryMessage(msg, sock, controllers, broadcast);
      }
    else if (msg.type === 'trade_response') {
      TCPMessageHandler.handleTradeResponseMessage(msg);
    }
    else if (msg.type === 'broker_time') {
      TCPMessageHandler.handleBrokerTimeMessage(msg, sock, controllers, broadcast);
    }
    else if (msg.type === 'trade_action') {
      TCPMessageHandler.handleTradeActionMessage(msg, sock, controllers, broadcast);
    }
    else if (msg.type === 'trade_actions_bulk') {
      TCPMessageHandler.handleBulkTradeActionsMessage(msg, sock, controllers, broadcast);
    }
  });
  
  sock.on('end', () => {
    console.log('[TCP] Client disconnected (socket end event)');
      const found = EAManager.findEABySocket(controllers, sock);
      if(found) {
      console.log(`[TCP] Disconnected EA: ${found.ea.id} (${found.ea.role})`);
      found.ea.connected = false;
      found.ea.state = 'offline';
    }
  });
  
  sock.on('error', e => {
    if(e.code !== 'ECONNRESET') {
      console.error('[TCP] Socket error:', e.message);
      const found = EAManager.findEABySocket(controllers, sock);
      if(found) {
        console.log(`[TCP] Error from EA: ${found.ea.id} (${found.ea.role})`);
        found.ea.connected = false;
        found.ea.state = 'error';
      }
    }
  });
});

tcp.listen(TCP_PORT, () => {
  console.log('='.repeat(60));
  console.log('     HeptaPower Master Controller Server');
  console.log('='.repeat(60));
  console.log(`[TCP] listening on ${TCP_PORT}`);
  if (SHARED_SECRET) {
    console.log('[TCP] HMAC authentication: ENABLED');
  } else {
    console.log('[TCP] HMAC authentication: DISABLED (set SHARED_SECRET to enable)');
  }
  console.log(`[TCP] Rate limit: ${RATE_MAX_HZ_PER_EA} msg/s per EA (window ${RATE_WINDOW_MS}ms)`);
  console.log(`[TCP] Watchdog: ${OFFLINE_SEC}s timeout`);
  console.log('');
  console.log(`[LOG] 📁 Log file: ${path.join(logsDir, getLogFileName())}`);
  console.log(`[LOG] 📂 Logs directory: ${logsDir}`);
  console.log('='.repeat(60));
});

// ========== WATCHDOG Timer ==========
setInterval(() => {
  const now = Date.now();
  for (const [id, ctrl] of controllers) {
    if (ctrl.lastSeen && (now - ctrl.lastSeen) > OFFLINE_SEC * 1000) {
      if (ctrl.state !== 'offline') {
        ctrl.state = 'offline';
        broadcast({ type: 'status', data: ctrl });
      }
    }
  }
}, 5000);

// ========== EXPRESS SERVER ==========
const app = express();
app.use(cors());
app.use(express.json());

// Session middleware
app.use(session({
  secret: config.security.sessionSecret || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,  // Set true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000  // 24 hours
  }
}));

app.use('/public', express.static(path.join(__dirname, '../public')));

function ssebroadcast(obj) {
  const line = `data: ${JSON.stringify(obj)}\n\n`;
  for (const res of sseClients) res.write(line);
}

app.get('/panel/stream', (req,res)=>{
  res.setHeader('Content-Type','text/event-stream');
  res.setHeader('Cache-Control','no-cache');
  res.setHeader('Connection','keep-alive');
  res.flushHeaders();

  // send snapshot - includes status, tick, account_info, trades_live, trades_history
  for(const cur of controllers.values()){
    // Send status
    const statusData = {...cur};
    delete statusData.socket; // Don't send socket reference
    delete statusData.userValidated; // Internal field
    res.write(`data: ${JSON.stringify({type:'status', data: statusData})}\n\n`);
    
    // Send last tick if available
    if(cur.lastTick){
      res.write(`data: ${JSON.stringify({type:'tick', data: {id:cur.id, ...cur.lastTick}})}\n\n`);
    }
    
    // Send cached account info if available
    if(cur.accountInfo){
      res.write(`data: ${JSON.stringify({type:'account_info', data: {id:cur.id, ...cur.accountInfo}})}\n\n`);
    }
    
    // Send cached live trades if available
    if(cur.tradesLive){
      res.write(`data: ${JSON.stringify({type:'trades_live', data: {id:cur.id, ...cur.tradesLive}})}\n\n`);
    }
    
    // Send cached history trades if available
    if(cur.tradesHistory){
      res.write(`data: ${JSON.stringify({type:'trades_history', data: {id:cur.id, ...cur.tradesHistory}})}\n\n`);
    }
  }

  sseClients.add(res);
  req.on('close', ()=> sseClients.delete(res));
});

app.post('/api/block', (req,res)=>{
  const { id, block } = req.body || {};
  if(!id) return res.json({ ok:false });
  if(block) blocklist.add(id);
  else blocklist.delete(id);
  
  // Find EA by eaId (backward compatibility)
  const found = EAManager.findEAByEaId(controllers, id);
  if(found) {
    found.ea.blocked = block;
    EAManager.logEAAction('BLOCK', found.ea.userId, found.ea.role, id, `blocked=${block}`);
  }
  
  res.json({ ok:true, id, blocked: blocklist.has(id) });
});

app.post('/api/ea-toggle', (req,res)=>{
  const { id, enabled, type } = req.body || {};
  if(!id) return res.json({ ok:false });
  
  // Find EA by eaId (backward compatibility)
  const found = EAManager.findEAByEaId(controllers, id);
  if(found) {
    found.ea.enabled = enabled;
    EAManager.logEAAction('TOGGLE', found.ea.userId, found.ea.role, id, `enabled=${enabled}`);
  }
  
  res.json({ ok:true, id, enabled });
});

app.post('/api/ea-settings', async (req,res)=>{
  const { id, type, settings } = req.body || {};
  if(!id || !settings) return res.json({ ok:false, error: 'Missing required fields' });
  
  try {
    // Find EA by eaId (backward compatibility)
    const found = EAManager.findEAByEaId(controllers, id);
    if(!found) return res.json({ ok:false, error: 'EA not found' });
    
    const cur = found.ea;
    const userId = cur.userId;
    if(!userId) return res.json({ ok:false, error: 'EA has no userId' });
    
    // Check if MongoDB is connected
    if(!mongoose.connection.readyState) {
      console.log('[SETTINGS] MongoDB not connected, storing in memory only');
      // Store in memory only (will be lost on server restart)
      if(!cur.settings) cur.settings = {};
      Object.assign(cur.settings, settings);
      return res.json({ ok:true, id, settings });
    }
    
    // Save settings to MongoDB (persistent storage)
    const settingsCollection = mongoose.connection.db.collection('ea_settings');
    
    // Load existing settings first to merge with new ones
    const existing = await settingsCollection.findOne({ userId: userId, eaId: id });
    const mergedSettings = existing?.settings ? { ...existing.settings, ...settings } : settings;
    
    await settingsCollection.updateOne(
      { userId: userId, eaId: id },
      { 
        $set: { 
          userId: userId,
          eaId: id,
          type: type,
          settings: mergedSettings,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    
    // Update in-memory settings as well
    if(!cur.settings) cur.settings = {};
    Object.assign(cur.settings, settings);
    
    console.log(`[SETTINGS] Saved for EA ${id} (${type}):`, mergedSettings);
    res.json({ ok:true, id, settings: mergedSettings });
  } catch(err) {
    console.error('[ERROR] Failed to save EA settings:', err);
    res.json({ ok:false, error: 'Database error' });
  }
});

// Load EA settings from database (called when EA connects)
async function loadEASettings(userId, eaId) {
  try {
    // Check if MongoDB is connected
    if(!mongoose.connection.readyState) {
      return null; // No persistent storage available
    }
    
    const settingsCollection = mongoose.connection.db.collection('ea_settings');
    const result = await settingsCollection.findOne({ userId: userId, eaId: eaId });
    return result ? result.settings : null;
  } catch(err) {
    console.error('[ERROR] Failed to load EA settings:', err);
    return null;
  }
}

// Save history log to database
async function saveHistoryLog(userId, eaId, message) {
  try {
    if(!mongoose.connection.readyState) {
      return; // No persistent storage available
    }
    
    const historyCollection = mongoose.connection.db.collection('history_requests');
    await historyCollection.insertOne({
      userId: userId,
      eaId: eaId,
      message: message,
      timestamp: new Date()
    });
  } catch(err) {
    console.error('[ERROR] Failed to save history log:', err);
  }
}

app.post('/api/ea-remove', (req,res)=>{
  const { id, type } = req.body || {};
  if(!id) return res.json({ ok:false });
  
  // Find EA by eaId (backward compatibility)
  const found = EAManager.findEAByEaId(controllers, id);
  if(found && found.ea.socket) {
    const ea = found.ea;
    try {
      const removeCmd = JSON.stringify({type: 'remove', id: id});
      const len = Buffer.byteLength(removeCmd);
      const frame = Buffer.allocUnsafe(4 + len);
      frame.writeUInt32BE(len, 0);
      Buffer.from(removeCmd).copy(frame, 4);
      ea.socket.write(frame);
      EAManager.logEAAction('REMOVE_CMD', ea.userId, ea.role, id, 'Dashboard removal command sent');
      console.log(`[API] Remove command sent to ${id} [key: ${found.key}]`);
    } catch(err) {
      console.log(`[ERROR] Failed to send remove command to ${id}:`, err.message);
    }
  }
  
  res.json({ ok:true, id });
});

app.post('/api/ea-force-delete', (req,res)=>{
  const { id, userId } = req.body || {};
  if(!id) return res.json({ ok:false });
  
  // Force delete EA from server (used when no MT5 confirmation after 15s)
  let deleted = false;
  let deletedKey = null;
  
  // If userId provided, find exact EA
  if(userId) {
    // Try to find by userId + id (need role, try both)
    for(const role of ['controller', 'prop']) {
      try {
        const key = EAManager.makeKey(userId, role, id);
        if(controllers.has(key)) {
          controllers.delete(key);
          deleted = true;
          deletedKey = key;
          EAManager.logEAAction('FORCE_DELETE', userId, role, id, `No MT5 confirmation - key=${key}`);
          console.log(`[API] Force deleted ${id} (userId: ${userId}) [key: ${key}] from server (no MT5 confirmation)`);
          break;
        }
      } catch(e) {
        // Ignore makeKey errors
      }
    }
  } else {
    // Fallback: find by eaId only (backward compatibility)
    const found = EAManager.findEAByEaId(controllers, id);
    if(found) {
      controllers.delete(found.key);
      deleted = true;
      deletedKey = found.key;
      EAManager.logEAAction('FORCE_DELETE', found.ea.userId, found.ea.role, id, `No MT5 confirmation - key=${found.key}`);
      console.log(`[API] Force deleted ${id} [key: ${found.key}] from server (no MT5 confirmation)`);
    }
  }
  
  res.json({ ok:true, id, deleted, key: deletedKey });
});

// ========== USER ROUTES (Live Panel) ==========
app.get('/', (_req,res)=>{
  res.send(userLoginPage());
});

app.post('/login', async (req,res)=>{
  const {username, password} = req.body || {};
  
  if(!username || !password) {
    return res.json({ok:false, error:'Username and password required'});
  }
  
  try {
    let account = null;
    
    if(isMongoConnected()) {
      // Find in MongoDB
      account = await Account.findOne({username: username.toLowerCase()}).lean();
    } else {
      // Fallback to in-memory
      account = adminAccounts.get(username.toLowerCase());
    }
    
    if(!account || account.username === ADMIN_USER) {
      return res.json({ok:false, error:'Account not found'});
    }
    
    if(!account.active) {
      return res.json({ok:false, error:'Account is blocked. Contact administrator'});
    }
    
    if(account.password !== password) {
      return res.json({ok:false, error:'Invalid password'});
    }
    
    // Update last login
    if(isMongoConnected()) {
      await Account.updateOne({username: account.username}, {lastLogin: new Date()});
    }
    
    // Success - Create session
    req.session = req.session || {};
    req.session.userId = account.id;
    req.session.username = account.username;
    req.session.loginTime = Date.now();
    
    const token = Buffer.from(username + ':' + password + ':' + Date.now()).toString('base64');
    res.json({ok:true, token, accountId: account.id, username: account.username});
  } catch(err) {
    console.error('[API] Login error:', err.message);
    res.json({ok:false, error:'Login failed'});
  }
});

app.get('/api/session/check', (req,res)=>{
  if(req.session && req.session.userId) {
    res.json({ok:true, userId: req.session.userId});
  } else {
    res.json({ok:false});
  }
});

// History Request Logs API
app.get('/api/history-logs', async (req,res)=>{
  const { userId } = req.query;
  if(!userId) return res.json({ok:false, error:'Missing userId'});
  
  try {
    if(isMongoConnected()) {
      // Get logs from MongoDB collection
      const logs = await mongoose.connection.db.collection('history_requests')
        .find({ userId })
        .sort({ timestamp: -1 }) // Newest first
        .limit(1000) // Max 1000 logs
        .toArray();
      
      res.json({ok:true, logs});
    } else {
      // No MongoDB, return empty
      res.json({ok:true, logs:[]});
    }
  } catch(err) {
    console.error('[API] Error fetching history logs:', err.message);
    res.json({ok:false, error:'Failed to fetch logs'});
  }
});

// Get trade copy history (from in-memory tracking database)
app.get('/api/trade-history', (req,res)=>{
  try {
    const { userId } = req.query;
    const history = TradeCopyManager.getAllTradeHistory(userId || null);
    res.json({ok:true, history});
  } catch(err) {
    console.error('[API] Error fetching trade history:', err.message);
    res.json({ok:false, error:'Failed to fetch trade history'});
  }
});

app.get('/api/copy-status/:controllerEAId/:ticket', (req,res)=>{
  try {
    const { controllerEAId, ticket } = req.params;
    const userId = req.session?.userId;
    
    if(!userId) {
      return res.json({ok:false, error:'Not authenticated'});
    }
    
    const status = TradeCopyManager.getCopyStatusDisplay(userId, controllerEAId, ticket);
    res.json({ok:true, status});
  } catch(err) {
    console.error('[API] Error fetching copy status:', err.message);
    res.json({ok:false, error:'Failed to fetch copy status'});
  }
});

app.get('/logout', (req,res)=>{
  if(req.session) {
    req.session.destroy();
  }
  res.redirect('/');
});

app.get('/dashboard', async (req,res)=>{
  if(!req.session || !req.session.userId) {
    return res.redirect('/');
  }
  
  const accountId = req.session.userId;
  
  try {
    let account = null;
    
    if(isMongoConnected()) {
      account = await Account.findOne({id: accountId}).lean();
    } else {
      for(const acc of adminAccounts.values()) {
        if(acc.id === accountId) {
          account = acc;
          break;
        }
      }
    }
    
    if(!account) {
      req.session = null;
      return res.redirect('/');
    }
    
    if(!account.active) {
      req.session = null;
      return res.redirect('/?error=blocked');
    }
    
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.send(userDashboardPage({
      accountId: account.id,
      username: account.username
    }));
  } catch(err) {
    console.error('[ERROR] Dashboard error:', err.message);
    req.session = null;
    res.redirect('/');
  }
});

// ========== ADMIN ROUTES ==========
app.get('/admin', (_req,res)=>{
  res.send(adminLoginPage());
});

app.get('/admin/verify', (_req,res)=>{
  res.send(adminVerifyPage());
});

app.post('/admin/login', (req,res)=>{
  const {username, password} = req.body || {};
  const ip = req.ip || req.connection.remoteAddress;
  
  // Check brute-force protection
  const attempts = loginAttempts.get(ip) || {attempts: 0, lastAttempt: 0, blockedUntil: 0};
  const now = Date.now();
  
  if(attempts.blockedUntil > now) {
    const remainingSec = Math.ceil((attempts.blockedUntil - now) / 1000);
    return res.json({ok:false, error: 'Too many failed attempts. Try again in ' + remainingSec + 's'});
  }
  
  // Reset if last attempt was > 5 minutes ago
  if(now - attempts.lastAttempt > LOGIN_BLOCK_TIME) {
    attempts.attempts = 0;
  }
  
  // Verify credentials
  if(username === ADMIN_USER && password === ADMIN_PASS) {
    // Reset failed attempts
    loginAttempts.delete(ip);
    
    if(REQUIRE_2FA) {
      // Create temp session for 2FA
      const tempToken = crypto.randomBytes(32).toString('hex');
      tempSessions.set(tempToken, {
        username,
        password,
        createdAt: now,
        ip
      });
      
      // Clean old sessions (>5 min)
      for(const [token, session] of tempSessions.entries()) {
        if(now - session.createdAt > 5 * 60 * 1000) {
          tempSessions.delete(token);
        }
      }
      
      return res.json({ok:true, require2FA:true, tempToken});
    } else {
      // No 2FA required, direct access - create session
      req.session = req.session || {};
      req.session.adminAuthenticated = true;
      req.session.adminUsername = username;
      req.session.adminLoginTime = Date.now();
      
      const token = Buffer.from(username + ':' + password + ':' + Date.now()).toString('base64');
      return res.json({ok:true, require2FA:false, token});
    }
  } else {
    // Failed login
    attempts.attempts++;
    attempts.lastAttempt = now;
    
    if(attempts.attempts >= MAX_LOGIN_ATTEMPTS) {
      attempts.blockedUntil = now + LOGIN_BLOCK_TIME;
    }
    
    loginAttempts.set(ip, attempts);
    res.json({ok:false, error:'Invalid username or password'});
  }
});

app.post('/admin/verify-2fa', (req,res)=>{
  const {tempToken, totp} = req.body || {};
  const ip = req.ip || req.connection.remoteAddress;
  
  if(!tempToken || !totp) {
    return res.json({ok:false, error:'Missing token or code'});
  }
  
  const session = tempSessions.get(tempToken);
  if(!session) {
    return res.json({ok:false, error:'Session expired. Please login again'});
  }
  
  // Check IP matches
  if(session.ip !== ip) {
    tempSessions.delete(tempToken);
    return res.json({ok:false, error:'Invalid session'});
  }
  
  // Check session age (max 5 min)
  if(Date.now() - session.createdAt > 5 * 60 * 1000) {
    tempSessions.delete(tempToken);
    return res.json({ok:false, error:'Session expired. Please login again'});
  }
  
  // Verify TOTP
  if(!verifyTOTP(ADMIN_2FA_SECRET, totp)) {
    return res.json({ok:false, error:'Invalid 2FA code'});
  }
  
  // Success - create admin session
  tempSessions.delete(tempToken);
  
  req.session = req.session || {};
  req.session.adminAuthenticated = true;
  req.session.adminUsername = session.username;
  req.session.adminLoginTime = Date.now();
  
  const token = Buffer.from(session.username + ':' + session.password + ':' + Date.now()).toString('base64');
  res.json({ok:true, token});
});

app.get('/admin/logout', (req,res)=>{
  if(req.session) {
    req.session.destroy();
  }
  res.redirect('/admin');
});

app.get('/admin/dashboard', (req,res)=>{
  if(!req.session || !req.session.adminAuthenticated) {
    return res.redirect('/admin');
  }
  
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  res.send(adminDashboardPage({
    httpPort: HTTP_PORT,
    tcpPort: TCP_PORT,
    hmacEnabled: !!SHARED_SECRET,
    require2FA: REQUIRE_2FA
  }));
});

// Admin API routes
app.get('/admin/api/accounts', async (_req,res)=>{
  try {
    if(isMongoConnected()) {
      // Get from MongoDB
      const accounts = await Account.find({}).select('-__v').lean();
      res.json({ok:true, accounts});
    } else {
      // Fallback to in-memory
      const accounts = Array.from(adminAccounts.values()).filter(a => a.username !== ADMIN_USER);
      res.json({ok:true, accounts});
    }
  } catch(err) {
    console.error('[API] Error loading accounts:', err.message);
    res.json({ok:false, error:'Failed to load accounts'});
  }
});

app.post('/admin/api/accounts', async (req,res)=>{
  let {id, username, password} = req.body || {};
  
  if(!id || !username || !password) {
    return res.json({ok:false, error:'All fields required'});
  }
  
  // Enforce case rules
  id = String(id).toUpperCase();
  username = String(username).toLowerCase();
  
  try {
    if(isMongoConnected()) {
      // Save to MongoDB
      const newAccount = new Account({
        id,
        username,
        password, // TODO: Hash password
        active: true
      });
      
      await newAccount.save();
      res.json({ok:true, id, username});
    } else {
      // Fallback to in-memory
      if(adminAccounts.has(username)) {
        return res.json({ok:false, error:'Username already exists'});
      }
      
      for(const acc of adminAccounts.values()) {
        if(acc.id === id) {
          return res.json({ok:false, error:'ID already exists'});
        }
      }
      
      adminAccounts.set(username, {
        username,
        password,
        id,
        createdAt: Date.now(),
        active: true
      });
      
      res.json({ok:true, id, username});
    }
  } catch(err) {
    if(err.code === 11000) {
      // Duplicate key error
      const field = Object.keys(err.keyPattern)[0];
      return res.json({ok:false, error: field.charAt(0).toUpperCase() + field.slice(1) + ' already exists'});
    }
    console.error('[API] Error creating account:', err.message);
    res.json({ok:false, error:'Failed to create account'});
  }
});

app.post('/admin/api/accounts/:id/toggle', async (req,res)=>{
  const {id} = req.params;
  
  try {
    if(isMongoConnected()) {
      const account = await Account.findOne({id});
      if(!account) {
        return res.json({ok:false, error:'Account not found'});
      }
      account.active = !account.active;
      await account.save();
      res.json({ok:true});
    } else {
      // Fallback
      let found = null;
      for(const acc of adminAccounts.values()) {
        if(acc.id === id && acc.username !== ADMIN_USER) {
          acc.active = !acc.active;
          found = acc;
          break;
        }
      }
      
      if(found) {
        res.json({ok:true});
      } else {
        res.json({ok:false, error:'Account not found'});
      }
    }
  } catch(err) {
    console.error('[API] Error toggling account:', err.message);
    res.json({ok:false, error:'Failed to update account'});
  }
});

app.delete('/admin/api/accounts/:id', async (req,res)=>{
  const {id} = req.params;
  
  try {
    if(isMongoConnected()) {
      const result = await Account.deleteOne({id});
      if(result.deletedCount > 0) {
        res.json({ok:true});
      } else {
        res.json({ok:false, error:'Account not found'});
      }
    } else {
      let username = null;
      for(const [user, acc] of adminAccounts.entries()) {
        if(acc.id === id && user !== ADMIN_USER) {
          username = user;
          break;
        }
      }
      
      if(username) {
        adminAccounts.delete(username);
        res.json({ok:true});
      } else {
        res.json({ok:false, error:'Account not found'});
      }
    }
  } catch(err) {
    console.error('[API] Error deleting account:', err.message);
    res.json({ok:false, error:'Failed to delete account'});
  }
});

app.patch('/admin/api/accounts/:id', async (req,res)=>{
  const {id} = req.params;
  let {username, password} = req.body || {};
  
  if(!username) return res.json({ok:false, error:'Username required'});
  
  username = String(username).toLowerCase();
  
  try {
    if(isMongoConnected()) {
      const account = await Account.findOne({id});
      if(!account) {
        return res.json({ok:false, error:'Account not found'});
      }
      
      // Check username duplicate (if changed)
      if(username !== account.username) {
        const existing = await Account.findOne({username});
        if(existing) {
          return res.json({ok:false, error:'Username already exists'});
        }
      }
      
      account.username = username;
      if(password) account.password = password;
      await account.save();
      
      res.json({ok:true});
    } else {
      // Fallback
      let found = null;
      let oldUsername = null;
      
      for(const [user, acc] of adminAccounts.entries()) {
        if(acc.id === id && user !== ADMIN_USER) {
          found = acc;
          oldUsername = user;
          break;
        }
      }
      
      if(!found) return res.json({ok:false, error:'Account not found'});
      
      if(username !== oldUsername && adminAccounts.has(username)) {
        return res.json({ok:false, error:'Username already exists'});
      }
      
      adminAccounts.delete(oldUsername);
      found.username = username;
      if(password) found.password = password;
      adminAccounts.set(username, found);
      
      res.json({ok:true});
    }
  } catch(err) {
    console.error('[API] Error updating account:', err.message);
    res.json({ok:false, error:'Failed to update account'});
  }
});

app.post('/admin/api/accounts/:id/setactive', async (req,res)=>{
  const {id} = req.params;
  const {active} = req.body || {};
  
  if(typeof active !== 'boolean') {
    return res.json({ok:false, error:'Invalid active flag'});
  }
  
  try {
    if(isMongoConnected()) {
      const account = await Account.findOne({id});
      if(!account) {
        return res.json({ok:false, error:'Account not found'});
      }
      account.active = active;
      await account.save();
      res.json({ok:true});
    } else {
      // Fallback
      let found = null;
      for(const acc of adminAccounts.values()) {
        if(acc.id === id && acc.username !== ADMIN_USER) {
          acc.active = active;
          found = acc;
          break;
        }
      }
      
      if(found) {
        res.json({ok:true});
      } else {
        res.json({ok:false, error:'Account not found'});
      }
    }
  } catch(err) {
    console.error('[API] Error setting active status:', err.message);
    res.json({ok:false, error:'Failed to update status'});
  }
});

app.listen(HTTP_PORT, () => {
  console.log(`[HTTP] panel on http://localhost:${HTTP_PORT}`);
  console.log(`[ADMIN] dashboard on http://localhost:${HTTP_PORT}/admin`);
  console.log(`[ADMIN] 2FA: ${REQUIRE_2FA ? 'ENABLED' : 'DISABLED (set require2FA:true to enable)'}`);
});

