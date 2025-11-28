// trade-copy-manager.js — Trade Copy Manager
// Handles tracking and copying of trades from Controller EAs to Prop EAs

const EAManager = require('./ea-manager');
const TradeRequestManager = require('./trade-request-manager');
const ActivityLog = require('../models/ActivityLog');

// Broadcast function (will be set by server)
let broadcastFn = null;

function setBroadcastFunction(fn) {
  broadcastFn = fn;
}

// Throttled skip logging (once per 15s per trade→prop)
const lastSkipLogAt = new Map(); // key: `${userId}|${controllerEAId}:${controllerTicket}|${propEAId}` -> timestamp
const SKIP_LOG_INTERVAL_MS = 15000;

// ========== TRADE COPY TRACKING DATABASE ==========
// Structure: userId -> controllerEAId:controllerTicket -> copy details
// Example: 'MEP2Q1' -> 'CTRL-001:1314785284' -> { ... }
const tradeCopyTracking = new Map();

/**
 * Get or create tracking entry for a trade
 * Returns tracking object for a specific Controller trade
 */
function getTrackingEntry(userId, controllerEAId, controllerTicket) {
  if (!tradeCopyTracking.has(userId)) {
    tradeCopyTracking.set(userId, new Map());
  }

  const userTracking = tradeCopyTracking.get(userId);
  const key = `${controllerEAId}:${controllerTicket}`;

  if (!userTracking.has(key)) {
    userTracking.set(key, {
      controllerEAId: controllerEAId,
      controllerTicket: controllerTicket,
      symbol: '',
      type: '',
      volume: 0,
      copies: {},      // propEAId -> {status, propTicket, timestamp, error, requestIds: []}
      successCount: 0,
      failedCount: 0,
      pendingCount: 0,
      totalPropEAs: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  return userTracking.get(key);
}

/**
 * Update copy status for a specific Prop EA
 */
function updateCopyStatus(userId, controllerEAId, controllerTicket, propEAId, status, propTicket = null, error = null, requestId = null) {
  const entry = getTrackingEntry(userId, controllerEAId, controllerTicket);

  // Initialize or get existing copy data
  if (!entry.copies[propEAId]) {
    entry.copies[propEAId] = {
      status: status,
      propTicket: propTicket,
      error: error,
      timestamp: Date.now(),
      requestIds: []
    };
  } else {
    // Update existing copy
    entry.copies[propEAId].status = status;
    entry.copies[propEAId].propTicket = propTicket;
    entry.copies[propEAId].error = error;
    entry.copies[propEAId].timestamp = Date.now();
  }

  // Add request ID to history (avoid duplicates)
  if (requestId && !entry.copies[propEAId].requestIds.includes(requestId)) {
    entry.copies[propEAId].requestIds.push(requestId);
  }

  entry.updatedAt = Date.now();

  // Recalculate counters
  entry.successCount = 0;
  entry.failedCount = 0;
  entry.pendingCount = 0;

  for (const copyStatus of Object.values(entry.copies)) {
    if (copyStatus.status === 'success') entry.successCount++;
    else if (copyStatus.status === 'failed') entry.failedCount++;
    else if (copyStatus.status === 'pending') entry.pendingCount++;
  }

  entry.totalPropEAs = Object.keys(entry.copies).length;

  // Log status
  const statusEmoji = entry.successCount === entry.totalPropEAs ? '✅' :
    entry.failedCount === entry.totalPropEAs ? '❌' :
      `${entry.successCount}/${entry.totalPropEAs}`;

  const requestCount = entry.copies[propEAId]?.requestIds?.length || 0;

  // Compact logging - one line
  console.log(`[TRACK] ${controllerEAId}:${controllerTicket} → ${propEAId} = ${status.toUpperCase()} (${statusEmoji}, attempts: ${requestCount}, ticket: ${propTicket || 'N/A'})`);

  return entry;
}

/**
 * Check if trade already sent/copied to specific Prop EA
 * SMART CHECK: Considers active pending requests to avoid duplicates while allowing retries
 */
function isAlreadyCopied(userId, controllerEAId, controllerTicket, propEAId) {
  if (!tradeCopyTracking.has(userId)) {
    console.debug?.(`[COPY-CHECK] user=${userId} ${controllerEAId}:${controllerTicket} → ${propEAId} status=none decision=SEND (no user tracking)`);
    return false;
  }

  const userTracking = tradeCopyTracking.get(userId);
  const key = `${controllerEAId}:${controllerTicket}`;

  if (!userTracking.has(key)) {
    console.debug?.(`[COPY-CHECK] user=${userId} ${key} → ${propEAId} status=none decision=SEND (no trade tracking)`);
    return false;
  }

  const entry = userTracking.get(key);
  const copyStatus = entry.copies[propEAId];

  if (!copyStatus) {
    console.debug?.(`[COPY-CHECK] user=${userId} ${key} → ${propEAId} status=none decision=SEND (no copy status)`);
    return false;
  }

  // ✅ Successfully copied → Skip forever
  if (copyStatus.status === 'success') {
    const k = `${userId}|${key}|${propEAId}`;
    const now = Date.now();
    const last = lastSkipLogAt.get(k) || 0;
    if (now - last >= SKIP_LOG_INTERVAL_MS) {
      console.log(`[COPY-CHECK] ✅ user=${userId} ${key} → ${propEAId} status=SUCCESS decision=SKIP ticket=${copyStatus.propTicket || '-'}`);
      lastSkipLogAt.set(k, now);
    }
    return true;
  }

  // ⏳ Pending → Check if request is ACTUALLY still waiting for response
  if (copyStatus.status === 'pending') {
    // Check if ANY of the requestIds are still actively pending (waiting for response)
    const hasActivePending = TradeRequestManager.hasAnyPendingRequest(copyStatus.requestIds);

    const k = `${userId}|${key}|${propEAId}`;
    const now = Date.now();
    const last = lastSkipLogAt.get(k) || 0;
    if (hasActivePending && (now - last >= SKIP_LOG_INTERVAL_MS)) {
      console.log(`[COPY-CHECK] ⏳ user=${userId} ${key} → ${propEAId} status=PENDING active=${hasActivePending} reqCount=${copyStatus.requestIds?.length || 0} decision=SKIP`);
      lastSkipLogAt.set(k, now);
    }

    if (hasActivePending) {
      return true; // ⏳ Still waiting for response - don't send duplicate!
    }

    // All requests timed out/failed → Allow retry
    return false;
  }

  // ❌ Status is 'failed' or undefined → Allow send/retry
  return false;
}

/**
 * Process trade copying from Controller EA to Prop EAs
 * Detects new positions/orders and sends copy requests to Prop EAs
 * 
 * @param {object} controllerEA - Controller EA object
 * @param {array} currentPositions - Current positions array
 * @param {array} currentOrders - Current orders array
 * @param {array} prevPositions - Previous positions array
 * @param {array} prevOrders - Previous orders array
 * @param {Map} controllers - Controllers Map
 */
function processTradeCopying(controllerEA, currentPositions, currentOrders, prevPositions, prevOrders, controllers) {
  // Get all Prop EAs for this user
  const propEAs = EAManager.getEAsByType(controllers, 'prop').filter(p => p.ea.userId === controllerEA.userId);

  console.log(`[TRADE-COPY] 🔍 Processing for Controller ${controllerEA.id} (User: ${controllerEA.userId})`);
  console.log(`[TRADE-COPY] Found ${propEAs.length} Prop EA(s) for this user`);

  if (propEAs.length === 0) {
    console.log(`[TRADE-COPY] ⚠️ No Prop EAs found for user ${controllerEA.userId} - skipping copy`);
    return;
  }

  // 1. Check if Controller EA is Enabled
  if (controllerEA.enabled === false) {
    console.log(`[TRADE-COPY] 🛑 Controller ${controllerEA.id} is DISABLED - skipping copy`);
    return;
  }

  // ========== COPY ALL CURRENT POSITIONS ==========
  console.log(`[TRADE-COPY] 📊 Current Positions: ${currentPositions.length}`);

  if (currentPositions.length > 0) {
    for (const position of currentPositions) {
      console.log(`[TRADE-COPY] 📤 Position: ${position.symbol} ${position.type} ${position.volume} lot (Ticket: ${position.ticket})`);
      copyPositionToPropEAs(controllerEA, position, propEAs);
    }
  }

  // ========== COPY ALL CURRENT ORDERS ==========
  console.log(`[TRADE-COPY] 📊 Current Orders: ${currentOrders.length}`);

  if (currentOrders.length > 0) {
    for (const order of currentOrders) {
      console.log(`[TRADE-COPY] 📤 Order: ${order.symbol} ${order.type} ${order.volume} lot (Ticket: ${order.ticket})`);
      copyOrderToPropEAs(controllerEA, order, propEAs);
    }
  }
}

/**
 * Copy a position from Controller to all Prop EAs
 * NO FILTERING - Will add settings filtering later
 */
function copyPositionToPropEAs(controllerEA, position, propEAs) {
  const userId = controllerEA.userId;
  const controllerEAId = controllerEA.id;
  const controllerTicket = position.ticket;

  // Build comment with Controller ticket
  const comment = `Copy:${position.ticket}`;

  // Prepare request data (Initial values)
  const cmd = position.type; // "Buy" or "Sell"
  const volume = position.volume;
  const sl = position.stopLoss || 0;
  const tp = position.takeProfit || 0;

  // Initialize tracking entry
  const trackingEntry = getTrackingEntry(userId, controllerEAId, controllerTicket);
  trackingEntry.symbol = position.symbol;
  trackingEntry.type = cmd;
  trackingEntry.volume = volume;

  // Jitter settings (max jitter in seconds)
  const jitterSecondsMax = controllerEA.settings?.jitter || 0;

  // Send to all Prop EAs
  for (const propEAObj of propEAs) {
    const propEA = propEAObj.ea;
    const propEAId = propEA.id;

    // 2. Check if Prop EA is Enabled
    if (propEA.enabled === false) {
      // console.log(`[TRADE-COPY] 🛑 Prop ${propEAId} is DISABLED - skipping`);
      continue;
    }

    // 3. Settings Manipulation
    // Combine Controller settings + Prop settings to modify the order
    const modifiedPosition = applySettingsToPosition(position, controllerEA.settings, propEA.settings);

    // Use modified values for the request
    const reqCmd = modifiedPosition.type;
    const reqVolume = modifiedPosition.volume;
    const reqSl = modifiedPosition.stopLoss || 0;
    const reqTp = modifiedPosition.takeProfit || 0;

    // Check if already copied or pending
    const alreadyCopied = isAlreadyCopied(userId, controllerEAId, controllerTicket, propEAId);

    if (alreadyCopied) {
      continue;  // Skip silently
    }

    // ⚡ Calculate random jitter for THIS Prop EA (between 0.01 and max)
    const randomJitter = jitterSecondsMax > 0 
      ? Math.max(0.01, Math.random() * jitterSecondsMax) 
      : 0;

    // NEW TRADE - Compact log
    const jitterLog = randomJitter > 0 ? ` [Jitter: ${randomJitter.toFixed(2)}s]` : '';
    console.log(`[COPY] 🆕 Pos ${controllerEAId}:${controllerTicket} (${position.symbol} ${reqCmd} ${reqVolume}) → ${propEAId}${jitterLog}`);

    // Build request with jitter (jitter will be applied by EA before execution)
    const request = TradeRequestManager.buildOpenPositionRequest(reqCmd, reqVolume, reqSl, reqTp, comment, position.ticket, position.symbol, randomJitter);
    const requestId = request.requestId;

    // Mark as PENDING immediately
    updateCopyStatus(userId, controllerEAId, controllerTicket, propEAId, 'pending', null, null, requestId);

    // Send request immediately (jitter delay will be applied by EA)
    TradeRequestManager.sendTradeRequest(propEA, request, (success, response) => {
      if (success) {
        updateCopyStatus(userId, controllerEAId, controllerTicket, propEAId, 'success', response.ticket, null, requestId);

        // Log successful copy to Activity Log
        const activityLog = new ActivityLog({
          userId: userId,
          type: 'trade_copied',
          controllerEAId: controllerEAId,
          controllerAccount: controllerEA.accountNumber || 'N/A',
          controllerTicket: controllerTicket.toString(),
          propEAId: propEAId,
          propAccount: propEA.accountNumber || 'N/A',
          propTicket: response.ticket.toString(),
          action: 'entry',
          success: true
        });
        activityLog.save()
          .then(log => {
            if (broadcastFn) broadcastFn({ type: 'activity_log', data: log.toObject() });
          })
          .catch(err => console.error('[ActivityLog] Error:', err));
      } else {
        updateCopyStatus(userId, controllerEAId, controllerTicket, propEAId, 'failed', null, response.error, requestId);
      }
    });
  }
}

/**
 * Copy an order from Controller to all Prop EAs
 * NO FILTERING - Will add settings filtering later
 */
function copyOrderToPropEAs(controllerEA, order, propEAs) {
  const userId = controllerEA.userId;
  const controllerEAId = controllerEA.id;
  const controllerTicket = order.ticket;

  // Build comment with Controller ticket
  const comment = `Copy:${order.ticket} `;

  // Prepare request data (Initial values)
  const cmd = order.type; // "Buy_Limit", "Sell_Limit", "Buy_Stop", "Sell_Stop"
  const volume = order.volume;
  const openPrice = order.priceOpen;
  const sl = order.stopLoss || 0;
  const tp = order.takeProfit || 0;

  // Initialize tracking entry
  const trackingEntry = getTrackingEntry(userId, controllerEAId, controllerTicket);
  trackingEntry.symbol = order.symbol;
  trackingEntry.type = cmd;
  trackingEntry.volume = volume;

  // Jitter settings (max jitter in seconds)
  const jitterSecondsMax = controllerEA.settings?.jitter || 0;

  // Send to all Prop EAs
  for (const propEAObj of propEAs) {
    const propEA = propEAObj.ea;
    const propEAId = propEA.id;

    // 2. Check if Prop EA is Enabled
    if (propEA.enabled === false) {
      // console.log(`[TRADE - COPY] 🛑 Prop ${ propEAId } is DISABLED - skipping`);
      continue;
    }

    // 3. Settings Manipulation
    // Combine Controller settings + Prop settings to modify the order
    const modifiedOrder = applySettingsToOrder(order, controllerEA.settings, propEA.settings);

    // Use modified values for the request
    const reqCmd = modifiedOrder.type;
    const reqVolume = modifiedOrder.volume;
    const reqOpenPrice = modifiedOrder.priceOpen;
    const reqSl = modifiedOrder.stopLoss || 0;
    const reqTp = modifiedOrder.takeProfit || 0;

    // Check if already copied or pending
    const alreadyCopied = isAlreadyCopied(userId, controllerEAId, controllerTicket, propEAId);

    if (alreadyCopied) {
      continue;  // Skip silently
    }

    // ⚡ Calculate random jitter for THIS Prop EA (between 0.01 and max)
    const randomJitter = jitterSecondsMax > 0 
      ? Math.max(0.01, Math.random() * jitterSecondsMax) 
      : 0;

    // NEW TRADE - Compact log
    const jitterLog = randomJitter > 0 ? ` [Jitter: ${randomJitter.toFixed(2)}s]` : '';
    console.log(`[COPY] 🆕 Ord ${controllerEAId}:${controllerTicket} (${order.symbol} ${reqCmd} ${reqVolume}) → ${propEAId}${jitterLog}`);

    // Build request with jitter (jitter will be applied by EA before execution)
    const request = TradeRequestManager.buildOpenOrderRequest(reqCmd, reqVolume, reqOpenPrice, reqSl, reqTp, comment, order.ticket, order.symbol, randomJitter);
    const requestId = request.requestId;

    // Mark as PENDING immediately
    updateCopyStatus(userId, controllerEAId, controllerTicket, propEAId, 'pending', null, null, requestId);

    // Send request immediately (jitter delay will be applied by EA)
    TradeRequestManager.sendTradeRequest(propEA, request, (success, response) => {
      if (success) {
        console.log(`[TRADE - COPY] ✅ Successfully copied order to ${propEAId} - Prop Ticket: ${response.ticket} `);
        console.log(`[TRACK - UPDATE] Setting SUCCESS: ${controllerEAId}:${controllerTicket} → ${propEAId} (ticket: ${response.ticket}, requestId: ${requestId})`);
        updateCopyStatus(userId, controllerEAId, controllerTicket, propEAId, 'success', response.ticket, null, requestId);

        // Log successful copy to Activity Log
        const activityLog = new ActivityLog({
          userId: userId,
          type: 'trade_copied',
          controllerEAId: controllerEAId,
          controllerAccount: controllerEA.accountNumber || 'N/A',
          controllerTicket: controllerTicket.toString(),
          propEAId: propEAId,
          propAccount: propEA.accountNumber || 'N/A',
          propTicket: response.ticket.toString(),
          action: 'entry',
          success: true
        });
        activityLog.save()
          .then(log => {
            if (broadcastFn) broadcastFn({ type: 'activity_log', data: log.toObject() });
          })
          .catch(err => console.error('[ActivityLog] Error:', err));
      } else {
        console.error(`[TRADE - COPY] ❌ Failed to copy order to ${propEAId}: ${response.error} (code: ${response.errorCode})`);
        console.log(`[TRACK - UPDATE] Setting FAILED: ${controllerEAId}:${controllerTicket} → ${propEAId} (error: ${response.error}, requestId: ${requestId})`);
        updateCopyStatus(userId, controllerEAId, controllerTicket, propEAId, 'failed', null, response.error, requestId);
      }
    });
  }
}

/**
 * Get tracking statistics for a user
 */
function getTrackingStats(userId) {
  if (!tradeCopyTracking.has(userId)) {
    return {
      totalTrades: 0,
      allSuccess: 0,
      allFailed: 0,
      partial: 0
    };
  }

  const userTracking = tradeCopyTracking.get(userId);
  let allSuccess = 0;
  let allFailed = 0;
  let partial = 0;

  for (const entry of userTracking.values()) {
    if (entry.successCount === entry.totalPropEAs && entry.totalPropEAs > 0) {
      allSuccess++;
    } else if (entry.failedCount === entry.totalPropEAs && entry.totalPropEAs > 0) {
      allFailed++;
    } else if (entry.totalPropEAs > 0) {
      partial++;
    }
  }

  return {
    totalTrades: userTracking.size,
    allSuccess: allSuccess,
    allFailed: allFailed,
    partial: partial
  };
}

/**
 * Get all tracked trades for a user
 */
function getTrackedTrades(userId) {
  if (!tradeCopyTracking.has(userId)) {
    return [];
  }

  const userTracking = tradeCopyTracking.get(userId);
  const trades = [];

  for (const entry of userTracking.values()) {
    trades.push({
      controllerEAId: entry.controllerEAId,
      controllerTicket: entry.controllerTicket,
      symbol: entry.symbol,
      type: entry.type,
      volume: entry.volume,
      successCount: entry.successCount,
      failedCount: entry.failedCount,
      pendingCount: entry.pendingCount,
      totalPropEAs: entry.totalPropEAs,
      copies: entry.copies,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    });
  }

  return trades;
}

/**
 * Get complete trade history for display (formatted for dashboard)
 */
function getAllTradeHistory(userId = null) {
  const history = [];

  const usersToProcess = userId ? [userId] : Array.from(tradeCopyTracking.keys());

  for (const uId of usersToProcess) {
    if (!tradeCopyTracking.has(uId)) continue;

    const userTracking = tradeCopyTracking.get(uId);

    for (const [key, entry] of userTracking) {
      for (const [propEAId, copyData] of Object.entries(entry.copies)) {
        history.push({
          userId: uId,
          controllerEAId: entry.controllerEAId,
          controllerTicket: entry.controllerTicket,
          propEAId: propEAId,
          propTicket: copyData.propTicket,
          symbol: entry.symbol,
          type: entry.type,
          volume: entry.volume,
          status: copyData.status,
          error: copyData.error,
          attempts: copyData.requestIds?.length || 0,
          timestamp: copyData.timestamp,
          createdAt: entry.createdAt
        });
      }
    }
  }

  // Sort by timestamp (newest first)
  history.sort((a, b) => b.timestamp - a.timestamp);

  return history;
}

/**
 * Get copy status display for a Controller trade (for dashboard "Copied" column)
 * Returns: { icon: '✅'/'❌'/'⚠️', text: 'Success'/'2/3'/'Failed'/'Not Copied', status: 'success'/'partial'/'failed'/'none' }
 */
function getCopyStatusDisplay(userId, controllerEAId, controllerTicket) {
  if (!tradeCopyTracking.has(userId)) {
    return { icon: '❌', text: 'Not Copied', status: 'none' };
  }

  const userTracking = tradeCopyTracking.get(userId);
  const key = `${controllerEAId}:${controllerTicket} `;

  if (!userTracking.has(key)) {
    return { icon: '❌', text: 'Not Copied', status: 'none' };
  }

  const entry = userTracking.get(key);

  // No copies yet
  if (entry.totalPropEAs === 0) {
    return { icon: '❌', text: 'Not Copied', status: 'none' };
  }

  // All successful
  if (entry.successCount === entry.totalPropEAs) {
    return { icon: '✅', text: 'Success', status: 'success' };
  }

  // All failed
  if (entry.failedCount === entry.totalPropEAs) {
    return { icon: '❌', text: 'Failed', status: 'failed' };
  }

  // Some pending
  if (entry.pendingCount > 0) {
    return {
      icon: '⏳', text: `${entry.successCount}/${entry.totalPropEAs} (Pending)`, status: 'pending'
    };
  }

  // Partial success (some succeeded, some failed)
  return { icon: '⚠️', text: `${entry.successCount}/${entry.totalPropEAs}`, status: 'partial' };
}

module.exports = {
  processTradeCopying,
  copyPositionToPropEAs,
  copyOrderToPropEAs,
  getTrackingEntry,
  updateCopyStatus,
  isAlreadyCopied,
  getTrackingStats,
  getTrackedTrades,
  getAllTradeHistory,
  getCopyStatusDisplay,
  getCopyStatusDisplay,
  setBroadcastFunction,
  applySettingsToPosition,
  applySettingsToOrder
};

/**
 * Apply settings to modify a Position
 * Combines Controller settings and Prop settings
 */
function applySettingsToPosition(position, controllerSettings, propSettings) {
  // Clone the position to avoid modifying original
  const modified = { ...position };

  // TODO: Implement specific settings logic here
  // For now, return as-is (Placeholder)

  // Example structure for future implementation:
  // if (propSettings?.riskMethod === 'fixed_lot') {
  //   modified.volume = propSettings.riskValue;
  // }

  return modified;
}

/**
 * Apply settings to modify an Order
 * Combines Controller settings and Prop settings
 */
function applySettingsToOrder(order, controllerSettings, propSettings) {
  // Clone the order to avoid modifying original
  const modified = { ...order };

  // ===== CONTROLLER SETTINGS: OFFSET IN POINTS =====
  const offset = controllerSettings?.offset || 0;
  
  if (offset > 0) {
    // Apply offset to order openPrice based on order type and direction
    const orderType = order.type?.toLowerCase() || '';
    let direction = null;
    
    // Determine direction based on order type
    if (orderType.includes('buy') && orderType.includes('stop')) {
      direction = controllerSettings?.buyStopDir || 'above';
    } else if (orderType.includes('sell') && orderType.includes('stop')) {
      direction = controllerSettings?.sellStopDir || 'below';
    } else if (orderType.includes('buy') && orderType.includes('limit')) {
      direction = controllerSettings?.buyLimitDir || 'below';
    } else if (orderType.includes('sell') && orderType.includes('limit')) {
      direction = controllerSettings?.sellLimitDir || 'above';
    }
    
    if (direction) {
      // Calculate offset value (1 point = 0.00001 for 5-digit broker)
      const offsetValue = offset * 0.00001;
      
      // Apply offset based on direction
      if (direction === 'above') {
        modified.priceOpen = order.priceOpen + offsetValue;
      } else if (direction === 'below') {
        modified.priceOpen = order.priceOpen - offsetValue;
      }
      
      // Round to 5 decimals to avoid floating point errors
      modified.priceOpen = parseFloat(modified.priceOpen.toFixed(5));
      
      console.log(`[OFFSET] Applied ${offset} points (${direction}) to ${orderType}: ${order.priceOpen.toFixed(5)} → ${modified.priceOpen.toFixed(5)}`);
    }
  }

  // ===== PROP SETTINGS: VOLUME/RISK CALCULATION =====
  // TODO: Implement Prop EA risk/volume calculation here

  return modified;
}
