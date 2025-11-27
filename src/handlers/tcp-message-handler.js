// tcp-message-handler.js — TCP Message Handlers
// Handles all incoming TCP messages from EAs

const EAManager = require('../managers/ea-manager');
const TradeRequestManager = require('../managers/trade-request-manager');

/**
 * Handle 'hello' message from EA
 * Validates user, checks for duplicates, manages EA registration
 */
async function handleHelloMessage(msg, sock, controllers, adminAccounts, isMongoConnected, Account, loadEASettings, broadcast) {
  const { id, role, userId } = msg;
  
  // Generate unique key using EA Manager
  const key = EAManager.makeKey(userId || 'NO_USER', role, id);
  EAManager.logEAAction('HELLO', userId || 'NO_USER', role, id, `socket=${sock.remoteAddress}`);
  
  const existing = controllers.get(key);
  
  // If EA exists, check if userId changed
  if(existing && existing.userId !== userId) {
    console.log(`[TCP] ${id} UserID changed (${existing.userId} → ${userId}) - re-validating`);
    existing.userValidated = false;
  }
  
  // Reserve EA slot immediately (before async validation)
  // This prevents race condition where 2 EAs with same ID both pass duplicate check
  if(!controllers.has(key)) {
    const eaData = EAManager.createEAData(userId || '', role, id, sock);
    controllers.set(key, eaData);
  } else {
    // EA exists - update socket (reconnect scenario)
    const existing = controllers.get(key);
    existing.socket = sock;
    existing.lastSeen = Date.now();
    existing.connected = true;
    console.log(`[TCP] ${id} reconnected - updated socket [key: ${key}]`);
  }
  
  if(userId) {
    try {
      // Step 1: Validate userId exists and is active
      let account = null;
      if(isMongoConnected()) {
        account = await Account.findOne({id: userId}).lean();
      } else {
        for(const acc of adminAccounts.values()) {
          if(acc.id === userId) {
            account = acc;
            break;
          }
        }
      }
      
      // Validate account exists AND is active
      if(!account || !account.active) {
        const reason = !account ? 'Account not found' : 'Account blocked';
        EAManager.logEAAction('REJECTED', userId, role, id, reason);
        console.log(`[TCP] ❌ ${id} REJECTED - ${reason} (userId: ${userId})`);
        
        // Delete this EA using EA Manager
        const deleteResult = EAManager.deleteEABySocket(controllers, sock);
        if(deleteResult.deleted) {
          console.log(`[TCP] Deleted EA key: ${deleteResult.key}`);
        }
        
        // Send same error for both cases (EA shows "Invalid UserID" MessageBox)
        const errorMsg = JSON.stringify({type: 'error', reason: 'invalid_userid', userId});
        const len = Buffer.byteLength(errorMsg);
        const frame = Buffer.allocUnsafe(4 + len);
        frame.writeUInt32BE(len, 0);
        Buffer.from(errorMsg).copy(frame, 4);
        sock.write(frame);
        
        setTimeout(() => sock.destroy(), 1000);
        return;
      }
      
      // Step 2: Check for duplicate EA identifier using EA Manager
      const isDuplicate = EAManager.isDuplicateEA(controllers, userId, role, id, sock);
      
      if(isDuplicate) {
        EAManager.logEAAction('REJECTED', userId, role, id, 'Duplicate EA');
        console.log(`[TCP] ❌ ${id} REJECTED - Duplicate EA Identifier (userId: ${userId})`);
        
        // Delete this EA using EA Manager
        const deleteResult = EAManager.deleteEABySocket(controllers, sock);
        if(deleteResult.deleted) {
          console.log(`[TCP] Deleted EA key: ${deleteResult.key}`);
        }
        
        const errorMsg = JSON.stringify({type: 'error', reason: 'duplicate_ea', id});
        const len = Buffer.byteLength(errorMsg);
        const frame = Buffer.allocUnsafe(4 + len);
        frame.writeUInt32BE(len, 0);
        Buffer.from(errorMsg).copy(frame, 4);
        sock.write(frame);
        
        setTimeout(() => sock.destroy(), 1000);
        return;
      }
      
      // Step 3: Check for Account Number Conflict using EA Manager
      const { accountNumber } = msg;
      const conflictCheck = EAManager.checkAccountConflict(controllers, userId, accountNumber, role, sock);
      
      if(conflictCheck.conflict) {
        const myType = role === 'controller' ? 'Controller' : 'Prop';
        EAManager.logEAAction('REJECTED', userId, role, id, `Account Conflict with ${conflictCheck.conflictType}`);
        console.log(`[TCP] ❌ ${id} REJECTED - Account Conflict: ${myType} EA cannot run on account ${accountNumber} where ${conflictCheck.conflictType} EA is already running`);
        
        // Delete this EA using EA Manager
        const deleteResult = EAManager.deleteEABySocket(controllers, sock);
        if(deleteResult.deleted) {
          console.log(`[TCP] Deleted EA key: ${deleteResult.key}`);
        }
        
        const errorMsg = JSON.stringify({
          type: 'error', 
          reason: 'account_conflict', 
          id, 
          accountNumber,
          conflictType: conflictCheck.conflictType,
          myType
        });
        const len = Buffer.byteLength(errorMsg);
        const frame = Buffer.allocUnsafe(4 + len);
        frame.writeUInt32BE(len, 0);
        Buffer.from(errorMsg).copy(frame, 4);
        sock.write(frame);
        
        setTimeout(() => sock.destroy(), 1000);
        return;
      }
      
      // Mark as validated ✅
      const cur = controllers.get(key);
      if(cur) {
        cur.userValidated = true;
        cur.state = 'online';
        cur.accountNumber = accountNumber || '';
        cur.connected = true;
        
        // Load saved settings from database
        const savedSettings = await loadEASettings(userId, id);
        if(savedSettings) {
          cur.settings = savedSettings;
          console.log(`[SETTINGS] Loaded for EA ${id}:`, savedSettings);
        }
        
        EAManager.logEAAction('VALIDATED', userId, role, id, `key=${key}`);
        console.log(`[TCP] ${id} connected (userId: ${userId}) [key: ${key}]`);
        
        // ⚡ Optimize TCP for fast, low-latency trade copying
        sock.setNoDelay(true);  // Disable Nagle's algorithm - send immediately!
        
        broadcast({ type: 'hello', data: { id, role, userId: userId || '' } });
      }
      
    } catch(err) {
      console.error('[TCP] Error validating userId:', err.message);
      // Delete this EA using EA Manager
      const deleteResult = EAManager.deleteEABySocket(controllers, sock);
      if(deleteResult.deleted) {
        console.log(`[TCP] Deleted EA key: ${deleteResult.key}`);
      }
      sock.destroy();
    }
  } else {
    // No userId provided - use 'NO_USER' as placeholder
    const key = EAManager.makeKey('NO_USER', role, id);
    
    if (!controllers.has(key)) {
      const eaData = EAManager.createEAData('', role, id, sock, {state: 'unknown', userValidated: false});
      eaData.connected = true;
      controllers.set(key, eaData);
    } else {
      const cur = controllers.get(key);
      cur.socket = sock;
      cur.connected = true;
    }
    
    EAManager.logEAAction('HELLO_NO_USER', 'NO_USER', role, id, `key=${key}`);
    console.log(`[TCP] ${id} hello role=${role} (no userId) [key: ${key}]`);
    broadcast({ type: 'hello', data: { id, role, userId: '' } });
  }
}

/**
 * Handle 'status' message from EA
 */
function handleStatusMessage(msg, sock, controllers, broadcast) {
  const { id, state, balance, accountNumber, accountName, equity, userId } = msg;
  
  // Find EA by socket (most reliable)
  const found = EAManager.findEABySocket(controllers, sock);
  if (!found) return;
  
  const cur = found.ea;
  
  // Update fields
  cur.state = state;
  if (equity !== undefined) cur.equity = equity;
  // IMPORTANT: Only update balance if explicitly provided in message
  // Balance should primarily come from account_info messages, not status
  if (balance !== undefined) cur.balance = balance;
  if (accountNumber) cur.accountNumber = accountNumber;
  if (accountName) cur.accountName = accountName;
  if (userId) cur.userId = userId;
  cur.lastSeen = Date.now();
  cur.socket = sock;
  
  const broadcastData = {...cur};
  delete broadcastData.socket;
  delete broadcastData.userValidated;
  broadcast({ type: 'status', data: broadcastData });
}

/**
 * Handle 'error' message from EA
 */
function handleErrorMessage(msg, sock, controllers, broadcast) {
  const { id, symbol, description } = msg;
  
  // Find EA by socket
  const found = EAManager.findEABySocket(controllers, sock);
  if (found) {
    const cur = found.ea;
    if (!cur.errors) cur.errors = [];
    cur.errors.push({
      time: new Date().toLocaleTimeString(),
      symbol: symbol || 'N/A',
      description: description || 'Unknown error'
    });
    if (cur.errors.length > 50) cur.errors.shift();
    console.log(`[ERROR] ${id} - ${symbol}: ${description}`);
    broadcast({ type: 'error', data: { id, userId: cur.userId, role: cur.role, errorCount: cur.errors.length } });
  }
}

/**
 * Handle 'deinit' message from EA
 */
function handleDeinitMessage(msg, sock, controllers, broadcast) {
  const { id, reason, reasonText, wasRemoveCommand } = msg;
  
  // Find EA by socket
  const found = EAManager.findEABySocket(controllers, sock);
  
  if(found) {
    const cur = found.ea;
    const key = found.key;
    
    broadcast({ 
      type: 'deinit_confirmed', 
      data: { id, reason, reasonText, wasRemoveCommand, timestamp: Date.now() } 
    });
    
    // Delete EA using EA Manager based on reason
    if(reason === 1) {
      EAManager.deleteEAByKey(controllers, key);
      EAManager.logEAAction('DEINIT', cur.userId, cur.role, id, `Manual removal - key=${key}`);
      console.log(`[TCP] ${id} manually removed from chart [key: ${key}]`);
    } else if(reason === 0 && wasRemoveCommand) {
      EAManager.deleteEAByKey(controllers, key);
      EAManager.logEAAction('DEINIT', cur.userId, cur.role, id, `Dashboard removal - key=${key}`);
      console.log(`[TCP] ${id} removed by dashboard [key: ${key}]`);
    } else if(reason === 3) {
      EAManager.deleteEAByKey(controllers, key);
      EAManager.logEAAction('DEINIT', cur.userId, cur.role, id, `TF/Symbol change - key=${key}`);
      console.log(`[TCP] ${id} removed - timeframe/symbol change (reason=3) [key: ${key}]`);
    } else if(reason === 5) {
      EAManager.deleteEAByKey(controllers, key);
      EAManager.logEAAction('DEINIT', cur.userId, cur.role, id, `Settings changed - key=${key}`);
      console.log(`[TCP] ${id} settings changed - removed for re-validation [key: ${key}]`);
    } else {
      cur.state = 'offline';
      EAManager.logEAAction('OFFLINE', cur.userId, cur.role, id, `reason=${reason}`);
      console.log(`[TCP] ${id} went offline (reason=${reason}) [key: ${key}]`);
    }
  }
}

/**
 * Handle 'tick' message from EA
 */
function handleTickMessage(msg, sock, controllers, broadcast) {
  const { id, time, unix } = msg;
  
  // Find EA by socket
  const found = EAManager.findEABySocket(controllers, sock);
  if (found) {
    const cur = found.ea;
    cur.ts = unix || Date.now();
    cur.lastTick = { time, unix };
    cur.lastSeen = Date.now();
    broadcast({ type: 'tick', data: { id, userId: cur.userId, role: cur.role, time, unix } });
  }
}

/**
 * Handle 'account_info' message from EA
 */
function handleAccountInfoMessage(msg, sock, controllers, broadcast) {
  const { id, balance, equity, freeMargin, marginLevel } = msg;
  
  // Find EA by socket
  const found = EAManager.findEABySocket(controllers, sock);
  
  if (found) {
    const cur = found.ea;
    cur.accountInfo = {
      balance: balance || 0,
      equity: equity || 0,
      freeMargin: freeMargin || 0,
      marginLevel: marginLevel || 0
    };
    cur.lastSeen = Date.now();
    broadcast({ type: 'account_info', data: { id, userId: cur.userId, role: cur.role, ...cur.accountInfo } });
  }
}

/**
 * Handle 'trades_live' message from EA
 * LIGHTWEIGHT: Only stores in Memory - Copy Service handles processing independently
 */
function handleTradesLiveMessage(msg, sock, controllers, broadcast) {
  const { id, positions, orders, posStats, ordStats, posPL, ordPL } = msg;
  
  // Find EA by socket
  const found = EAManager.findEABySocket(controllers, sock);
  
  if (found) {
    const cur = found.ea;
    
    // DEBUG: Log received data
    console.log(`[TCP-HANDLER] 📥 trades_live from ${cur.id}: ${(positions || []).length} positions, ${(orders || []).length} orders`);
    
    // Update current trades in Memory (FAST - no processing!)
    cur.tradesLive = {
      positions: positions || [],
      orders: orders || [],
      positionStats: posStats || { total: 0, buy: 0, sell: 0 },
      orderStats: ordStats || { total: 0, buyStop: 0, sellStop: 0, buyLimit: 0, sellLimit: 0 },
      positionPL: posPL || { brut: 0, net: 0 },
      orderPL: ordPL || { brut: 0, net: 0 }
    };
    cur.lastSeen = Date.now();
    cur.lastUpdated = Date.now(); // Timestamp for last data update
    
    // Broadcast to dashboard
    broadcast({ type: 'trades_live', data: { id, userId: cur.userId, role: cur.role, ...cur.tradesLive } });
    
    console.log(`[TCP-HANDLER] ✅ Stored in Memory - Copy Service will process (role: ${cur.role})`);
    
    // DONE! Return immediately - Copy Service handles copying independently
  }
}

/**
 * Handle 'trades_history' message from EA
 */
function handleTradesHistoryMessage(msg, sock, controllers, broadcast) {
  const { id, deals, deletedOrders, dealStats, ordStats, dealPL, ordPL } = msg;
  
  // Find EA by socket
  const found = EAManager.findEABySocket(controllers, sock);
  
  if (found) {
    const cur = found.ea;
    cur.tradesHistory = {
      deals: deals || [],
      deletedOrders: deletedOrders || [],
      dealStats: dealStats || { total: 0, buy: 0, sell: 0 },
      orderStats: ordStats || { total: 0, buyStop: 0, sellStop: 0, buyLimit: 0, sellLimit: 0 },
      dealPL: dealPL || { brut: 0, net: 0 },
      orderPL: ordPL || { brut: 0, net: 0 }
    };
    cur.lastSeen = Date.now();
    broadcast({ type: 'trades_history', data: { id, userId: cur.userId, role: cur.role, ...cur.tradesHistory } });
  }
}

/**
 * Handle 'trade_response' message from Prop EA
 */
function handleTradeResponseMessage(msg) {
  const timestamp = new Date().toISOString();
  
  // Compact logging - one line per response
  console.log(`[RESPONSE] ⚡ ${msg.requestId?.substring(0,8)} → ${msg.success ? '✅' : '❌'} ticket=${msg.ticket || 'N/A'} from ${msg.id}`);
  
  // Handle response via Trade Request Manager
  TradeRequestManager.handleTradeResponse(msg);
}

/**
 * Handle 'broker_time' message from EA
 */
function handleBrokerTimeMessage(msg, sock, controllers, broadcast) {
  const { id, brokerTime } = msg;
  
  // Find EA by socket
  const found = EAManager.findEABySocket(controllers, sock);
  if(found) {
    const cur = found.ea;
    cur.brokerTime = brokerTime;
    cur.lastSeen = Date.now();
    
    // Broadcast to dashboard
    broadcast({ type: 'broker_time', data: { id, userId: cur.userId, role: cur.role, brokerTime } });
  }
}

/**
 * Handle 'trade_action' message from Controller EA
 * Routes close/modify/remove actions to all Prop EAs
 */
function handleTradeActionMessage(msg, sock, controllers, broadcast) {
  const { id, userId, action, controllerTicket } = msg;
  
  if(!id || !userId || !action || !controllerTicket) {
    console.log('[TCP] ⚠️ Invalid trade_action message - missing required fields');
    return;
  }
  
  // Find the Controller EA
  const found = EAManager.findEABySocket(controllers, sock);
  if(!found || found.ea.role !== 'controller') {
    console.log(`[TCP] ⚠️ trade_action from non-controller EA: ${id}`);
    return;
  }
  
  const ctrl = found.ea;
  
  // Log the action
  console.log(`[TRADE-ACTION] 📬 ${action} from ${id} - Ticket: ${controllerTicket}`);
  
  // Get all Prop EAs for this user
  const propEAs = EAManager.getEAsByType(controllers, 'prop')
    .filter(p => p.ea.userId === userId && p.ea.connected);
  
  if(propEAs.length === 0) {
    console.log(`[TRADE-ACTION] ⚠️ No Prop EAs for user ${userId}`);
    return;
  }
  
  // Forward action to all Prop EAs
  console.log(`[TRADE-ACTION] ➡️ Forwarding ${action} to ${propEAs.length} Prop EA(s)`);
  
  for(const propObj of propEAs) {
    const prop = propObj.ea;
    
    if(!prop.socket) {
      console.log(`[TRADE-ACTION] ⚠️ Prop EA ${prop.id} has no socket`);
      continue;
    }
    
    // Build trade_request message based on action type
    let request = null;
    
    if(action === 'close_position') {
      request = TradeRequestManager.buildExitPositionRequest(
        controllerTicket,
        msg.volume || 0  // 0 = close all
      );
    } else if(action === 'modify_position') {
      request = TradeRequestManager.buildModifyPositionRequest(
        controllerTicket,
        msg.sl || 0,
        msg.tp || 0
      );
    } else if(action === 'remove_order') {
      request = TradeRequestManager.buildExitOrderRequest(
        controllerTicket
      );
    } else if(action === 'modify_order') {
      request = TradeRequestManager.buildModifyOrderRequest(
        controllerTicket,
        msg.openPrice || 0,
        msg.volume || 0,
        msg.sl || 0,
        msg.tp || 0
      );
    } else {
      console.log(`[TRADE-ACTION] ⚠️ Unknown action type: ${action}`);
      continue;
    }
    
    if(request) {
      // Send request to Prop EA (pass entire prop object)
      TradeRequestManager.sendTradeRequest(prop, request, (success, response) => {
        if(success) {
          console.log(`[TRADE-ACTION] ✅ ${action} completed on ${prop.id} - Controller Ticket: ${controllerTicket}, Result: ${JSON.stringify(response)}`);
        } else {
          console.log(`[TRADE-ACTION] ❌ ${action} failed on ${prop.id}: ${response?.error || 'Unknown error'}`);
        }
      });
    }
  }
}

module.exports = {
  handleHelloMessage,
  handleStatusMessage,
  handleErrorMessage,
  handleDeinitMessage,
  handleTickMessage,
  handleAccountInfoMessage,
  handleTradesLiveMessage,
  handleTradesHistoryMessage,
  handleTradeResponseMessage,
  handleBrokerTimeMessage,
  handleTradeActionMessage
};

