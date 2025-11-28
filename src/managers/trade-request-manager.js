// trade-request-manager.js — Trading Request Manager
// Handles bi-directional communication: WebServer ↔ Prop EA
// Sends trading requests to Prop EAs and manages responses

const crypto = require('crypto');

/**
 * Request Types:
 * - Request_Open.Pos
 * - Request_Open.Ord
 * - Request_Exit.Pos
 * - Request_Exit.Ord
 * - Request_Modify.Pos
 * - Request_Modify.Ord
 */

// Store pending requests: requestId -> {request, timestamp, callback}
const pendingRequests = new Map();
const REQUEST_TIMEOUT = 5000; // 5 second timeout (backup only - responses handle completion)

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Build Request_Open.Pos
 * Opens a new Position (Market Order)
 * 
 * @param {string} cmd - "Buy" or "Sell"
 * @param {number} volume - Lot size
 * @param {number} sl - Stop Loss price
 * @param {number} tp - Take Profit price
 * @param {string} comment - Comment (contains Controller EA ticket)
 * @param {number} jitterSeconds - Jitter delay in seconds (applied by EA before execution)
 * @returns {object} Request object
 */
function buildOpenPositionRequest(cmd, volume, sl, tp, comment, controllerTicket, symbol, jitterSeconds = 0) {
  const requestId = generateRequestId();
  
  return {
    type: 'trade_request',
    subtype: 'Request_Open.Pos',
    requestId: requestId,
    controllerTicket: controllerTicket,  // Track original ticket
    jitterSeconds: jitterSeconds,        // Jitter delay (applied by EA)
    data: {
      symbol: symbol,     // string
      cmd: cmd,           // "Buy" or "Sell"
      volume: volume,     // double
      sl: sl,             // double (0 = no SL)
      tp: tp,             // double (0 = no TP)
      comment: comment    // string (contains Controller ticket)
    },
    timestamp: Date.now()
  };
}

/**
 * Build Request_Open.Ord
 * Opens a Pending Order
 * 
 * @param {string} cmd - "Buy_Limit", "Sell_Limit", "Buy_Stop", "Sell_Stop"
 * @param {number} volume - Lot size
 * @param {number} openPrice - Order open price
 * @param {number} sl - Stop Loss price
 * @param {number} tp - Take Profit price
 * @param {string} comment - Comment (contains Controller EA ticket)
 * @param {number} jitterSeconds - Jitter delay in seconds (applied by EA before execution)
 * @returns {object} Request object
 */
function buildOpenOrderRequest(cmd, volume, openPrice, sl, tp, comment, controllerTicket, symbol, jitterSeconds = 0) {
  const requestId = generateRequestId();
  
  return {
    type: 'trade_request',
    subtype: 'Request_Open.Ord',
    requestId: requestId,
    controllerTicket: controllerTicket,  // Track original ticket
    jitterSeconds: jitterSeconds,        // Jitter delay (applied by EA)
    data: {
      symbol: symbol,       // string
      cmd: cmd,             // "Buy_Limit", "Sell_Limit", "Buy_Stop", "Sell_Stop"
      volume: volume,       // double
      openPrice: openPrice, // double
      sl: sl,               // double (0 = no SL)
      tp: tp,               // double (0 = no TP)
      comment: comment      // string (contains Controller ticket)
    },
    timestamp: Date.now()
  };
}

/**
 * Build Request_Exit.Pos
 * Closes a Position (fully or partially)
 * 
 * @param {number} ticket - Position ticket number
 * @param {number} volume - Volume to close (0 = close all)
 * @returns {object} Request object
 */
function buildExitPositionRequest(ticket, volume) {
  const requestId = generateRequestId();
  
  return {
    type: 'trade_request',
    subtype: 'Request_Exit.Pos',
    requestId: requestId,
    controllerTicket: ticket,  // ← ADD THIS! (in root for Prop EA to find)
    data: {
      ticket: ticket,   // int (keep for backward compatibility)
      volume: volume    // double (0 = close all)
    },
    timestamp: Date.now()
  };
}

/**
 * Build Request_Exit.Ord
 * Deletes a Pending Order
 * 
 * @param {number} ticket - Order ticket number
 * @returns {object} Request object
 */
function buildExitOrderRequest(ticket) {
  const requestId = generateRequestId();
  
  return {
    type: 'trade_request',
    subtype: 'Request_Exit.Ord',
    requestId: requestId,
    controllerTicket: ticket,  // ← ADD THIS! (in root for Prop EA to find)
    data: {
      ticket: ticket    // int (keep for backward compatibility)
    },
    timestamp: Date.now()
  };
}

/**
 * Build Request_Modify.Pos
 * Modifies Position (SL/TP only)
 * 
 * @param {number} ticket - Position ticket number
 * @param {number} sl - New Stop Loss (0 = no change)
 * @param {number} tp - New Take Profit (0 = no change)
 * @returns {object} Request object
 */
function buildModifyPositionRequest(ticket, sl, tp) {
  const requestId = generateRequestId();
  
  return {
    type: 'trade_request',
    subtype: 'Request_Modify.Pos',
    requestId: requestId,
    controllerTicket: ticket,  // ← ADD THIS! (in root for Prop EA to find)
    data: {
      ticket: ticket,   // int (keep for backward compatibility)
      sl: sl,           // double (0 = no change)
      tp: tp            // double (0 = no change)
    },
    timestamp: Date.now()
  };
}

/**
 * Build Request_Modify.Ord
 * Modifies Pending Order (Price, Volume, SL, TP)
 * 
 * @param {number} ticket - Order ticket number
 * @param {number} openPrice - New open price (0 = no change)
 * @param {number} volume - New volume (0 = no change)
 * @param {number} sl - New Stop Loss (0 = no change)
 * @param {number} tp - New Take Profit (0 = no change)
 * @returns {object} Request object
 */
function buildModifyOrderRequest(ticket, openPrice, volume, sl, tp) {
  const requestId = generateRequestId();
  
  return {
    type: 'trade_request',
    subtype: 'Request_Modify.Ord',
    requestId: requestId,
    controllerTicket: ticket,  // ← ADD THIS! (in root for Prop EA to find)
    data: {
      ticket: ticket,       // int (keep for backward compatibility)
      openPrice: openPrice, // double (0 = no change)
      volume: volume,       // double (0 = no change)
      sl: sl,               // double (0 = no change)
      tp: tp                // double (0 = no change)
    },
    timestamp: Date.now()
  };
}

/**
 * Send trade request to Prop EA
 * 
 * @param {object} propEA - Prop EA object from controllers Map
 * @param {object} request - Request object
 * @param {function} callback - Callback(success, response)
 * @param {number} customTimeout - Custom timeout in ms (default: REQUEST_TIMEOUT)
 * @returns {boolean} True if sent successfully
 */
function sendTradeRequest(propEA, request, callback, customTimeout = null) {
  if(!propEA || !propEA.socket) {
    console.error(`[REQUEST] ❌ ${request.requestId?.substring(0,8)} - Prop EA not connected`);
    if(callback) callback(false, {error: 'Prop EA not connected'});
    return false;
  }
  
  try {
    // Calculate timeout: If jitterSeconds exists, use jitter + 5s buffer, otherwise use default
    const jitterMs = (request.jitterSeconds || 0) * 1000;
    const timeoutMs = customTimeout || (jitterMs > 0 ? jitterMs + 5000 : REQUEST_TIMEOUT);
    
    // Add to pending requests
    pendingRequests.set(request.requestId, {
      request: request,
      timestamp: Date.now(),
      callback: callback,
      propEaId: propEA.id
    });
    
    // Set timeout (dynamic based on jitter)
    setTimeout(() => {
      if(pendingRequests.has(request.requestId)) {
        const pending = pendingRequests.get(request.requestId);
        pendingRequests.delete(request.requestId);
        console.error(`[REQUEST] ⏱️ TIMEOUT ${request.requestId.substring(0,8)} (${request.subtype}) - No response after ${(timeoutMs/1000).toFixed(1)}s`);
        if(pending.callback) {
          pending.callback(false, {
            error: 'Request timeout',
            errorCode: -1
          });
        }
      }
    }, timeoutMs);
    
    // Send request via TCP socket
    const requestJson = JSON.stringify(request);
    const len = Buffer.byteLength(requestJson);
    const frame = Buffer.allocUnsafe(4 + len);
    frame.writeUInt32BE(len, 0);
    Buffer.from(requestJson).copy(frame, 4);
    propEA.socket.write(frame);
    
    // Compact logging (show timeout if jitter applied)
    const timeoutLog = jitterMs > 0 ? ` [timeout: ${(timeoutMs/1000).toFixed(1)}s]` : '';
    console.log(`[REQUEST] ⚡ ${request.requestId.substring(0,8)} ${request.subtype} → ${propEA.id} (pending: ${pendingRequests.size})${timeoutLog}`);
    
    return true;
    
  } catch(err) {
    console.error(`[REQUEST] ❌ Error sending ${request.requestId?.substring(0,8)}:`, err.message);
    pendingRequests.delete(request.requestId);
    if(callback) callback(false, {error: err.message});
    return false;
  }
}

/**
 * Handle trade response from Prop EA
 * 
 * Response formats:
 * - Success: {type: 'trade_response', requestId, success: true, ticket: 12345}
 * - Failed: {type: 'trade_response', requestId, success: false, error: 'text', errorCode: 123}
 * 
 * @param {object} response - Response message from EA
 */
function handleTradeResponse(response) {
  const { requestId, success, ticket, error, errorCode } = response;
  
  if(!requestId) {
    console.error('[RESPONSE] ❌ Missing requestId');
    return;
  }
  
  const pending = pendingRequests.get(requestId);
  if(!pending) {
    console.warn(`[RESPONSE] ⚠️ Unknown requestId ${requestId.substring(0,8)} (may have timed out, pending: ${pendingRequests.size})`);
    return;
  }
  
  // Calculate latency & remove from pending IMMEDIATELY
  const latency = Date.now() - pending.timestamp;
  pendingRequests.delete(requestId);
  
  // Compact logging
  if(success) {
    console.log(`[RESPONSE] ✅ ${requestId.substring(0,8)} ticket=${ticket} (${latency}ms, pending: ${pendingRequests.size})`);
  } else {
    console.error(`[RESPONSE] ❌ ${requestId.substring(0,8)} error="${error}" code=${errorCode} (${latency}ms)`);
  }
  
  // Call callback (triggers TradeCopyManager.updateCopyStatus)
  if(pending.callback) {
    pending.callback(success, {
      ticket: ticket,
      error: error,
      errorCode: errorCode,
      requestId: requestId
    });
  }
}

/**
 * Get pending requests count
 */
function getPendingRequestsCount() {
  return pendingRequests.size;
}

/**
 * Get pending requests for specific Prop EA
 */
function getPendingRequestsForEA(propEaId) {
  const requests = [];
  for(const [requestId, pending] of pendingRequests) {
    if(pending.propEaId === propEaId) {
      requests.push({
        requestId: requestId,
        subtype: pending.request.subtype,
        timestamp: pending.timestamp,
        age: Date.now() - pending.timestamp
      });
    }
  }
  return requests;
}

/**
 * Check if any of the given requestIds are still pending
 * @param {Array<string>} requestIds - Array of request IDs to check
 * @returns {boolean} - True if any request is still pending
 */
function hasAnyPendingRequest(requestIds) {
  if(!requestIds || requestIds.length === 0) return false;
  
  for(const reqId of requestIds) {
    if(pendingRequests.has(reqId)) {
      return true;
    }
  }
  return false;
}

/**
 * Clear old pending requests (cleanup)
 */
function clearOldPendingRequests() {
  const now = Date.now();
  for(const [requestId, pending] of pendingRequests) {
    if(now - pending.timestamp > REQUEST_TIMEOUT) {
      pendingRequests.delete(requestId);
      console.warn(`[TRADE-REQUEST] Cleared old pending request: ${requestId}`);
    }
  }
}

// Cleanup old requests every minute
setInterval(clearOldPendingRequests, 60000);

module.exports = {
  // Request builders
  buildOpenPositionRequest,
  buildOpenOrderRequest,
  buildExitPositionRequest,
  buildExitOrderRequest,
  buildModifyPositionRequest,
  buildModifyOrderRequest,
  
  // Send & Handle
  sendTradeRequest,
  handleTradeResponse,
  
  // Status
  getPendingRequestsCount,
  getPendingRequestsForEA,
  hasAnyPendingRequest,
  
  // Constants
  REQUEST_TIMEOUT
};

