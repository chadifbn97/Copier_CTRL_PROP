// ea-manager.js — EA Management Utilities
// Handles EA key generation, lookup, and management for hierarchical structure

/**
 * Generate unique key for EA
 * Format: userId:type:eaId
 * Example: "MEP2Q1:controller:CTRL-001"
 */
function makeKey(userId, type, eaId) {
  if(!userId || !type || !eaId) {
    throw new Error(`makeKey: Invalid parameters (userId=${userId}, type=${type}, eaId=${eaId})`);
  }
  return `${userId}:${type}:${eaId}`;
}

/**
 * Parse key back into components
 * Returns: {userId, type, eaId}
 */
function parseKey(key) {
  const parts = key.split(':');
  if(parts.length !== 3) {
    return null;
  }
  return {
    userId: parts[0],
    type: parts[1],
    eaId: parts[2]
  };
}

/**
 * Find EA by socket
 * Returns: {key, ea} or null
 */
function findEABySocket(controllers, socket) {
  for(const [key, ea] of controllers) {
    if(ea.socket === socket) {
      return {key, ea};
    }
  }
  return null;
}

/**
 * Find EA by eaId only (for backward compatibility)
 * Returns: {key, ea} or null
 * WARNING: Returns first match - use with caution if multiple users have same eaId
 */
function findEAByEaId(controllers, eaId) {
  for(const [key, ea] of controllers) {
    if(ea.id === eaId) {
      return {key, ea};
    }
  }
  return null;
}

/**
 * Find EA by userId + eaId + type
 * Returns: {key, ea} or null
 */
function findEA(controllers, userId, type, eaId) {
  const key = makeKey(userId, type, eaId);
  const ea = controllers.get(key);
  return ea ? {key, ea} : null;
}

/**
 * Get all EAs for a specific user
 * Returns: Array of {key, ea}
 */
function getEAsByUser(controllers, userId) {
  const result = [];
  for(const [key, ea] of controllers) {
    if(ea.userId === userId) {
      result.push({key, ea});
    }
  }
  return result;
}

/**
 * Get all EAs by type (controller or prop)
 * Returns: Array of {key, ea}
 */
function getEAsByType(controllers, type) {
  const result = [];
  for(const [key, ea] of controllers) {
    if(ea.role === type) {
      result.push({key, ea});
    }
  }
  return result;
}

/**
 * Check if EA identifier is duplicate for same user
 * Returns: boolean
 */
function isDuplicateEA(controllers, userId, type, eaId, currentSocket) {
  const key = makeKey(userId, type, eaId);
  const existing = controllers.get(key);
  
  if(!existing) {
    console.log(`[DUPLICATE-CHECK] ${eaId}: No existing EA → Not duplicate`);
    return false;
  }
  
  // If same socket object, not duplicate (reconnect scenario)
  if(existing.socket === currentSocket) {
    console.log(`[DUPLICATE-CHECK] ${eaId}: Same socket object → Not duplicate (reconnection)`);
    return false;
  }
  
  // Different socket - check if old socket is still alive
  const socketAlive = existing.socket && !existing.socket.destroyed && existing.socket.writable;
  
  if(socketAlive) {
    // Old socket is still alive and it's a DIFFERENT socket → DUPLICATE!
    console.log(`[DUPLICATE-CHECK] ❌ ${eaId}: Different socket & old socket alive → DUPLICATE DETECTED!`);
    console.log(`[DUPLICATE-CHECK]    Old socket: ${existing.socket.remoteAddress} (destroyed=${existing.socket.destroyed}, writable=${existing.socket.writable})`);
    console.log(`[DUPLICATE-CHECK]    New socket: ${currentSocket.remoteAddress}`);
    return true;
  }
  
  // Old socket is dead, allow new connection to take over
  console.log(`[DUPLICATE-CHECK] ${eaId}: Old socket dead (destroyed=${existing.socket?.destroyed}, writable=${existing.socket?.writable}) → Allow new connection`);
  return false;
}

/**
 * Check account conflict (Controller vs Prop on same account)
 * Returns: {conflict: boolean, conflictType: string}
 */
function checkAccountConflict(controllers, userId, accountNumber, myType, currentSocket) {
  if(!accountNumber) return {conflict: false};
  
  for(const [key, ea] of controllers) {
    // Skip self
    if(ea.socket === currentSocket) continue;
    
    // Check if same userId + same account number
    if(ea.userId === userId && ea.accountNumber === accountNumber && ea.state === 'online' && ea.userValidated) {
      // Check if opposite role
      if(myType === 'controller' && ea.role === 'prop') {
        return {conflict: true, conflictType: 'Prop'};
      } else if(myType === 'prop' && ea.role === 'controller') {
        return {conflict: true, conflictType: 'Controller'};
      }
    }
  }
  
  return {conflict: false};
}

/**
 * Delete EA by socket (safe deletion)
 * Returns: {deleted: boolean, key: string}
 */
function deleteEABySocket(controllers, socket) {
  const found = findEABySocket(controllers, socket);
  if(found) {
    controllers.delete(found.key);
    return {deleted: true, key: found.key};
  }
  return {deleted: false, key: null};
}

/**
 * Delete EA by key
 * Returns: boolean
 */
function deleteEAByKey(controllers, key) {
  return controllers.delete(key);
}

/**
 * Create EA data object
 */
function createEAData(userId, type, eaId, socket, additionalData = {}) {
  return {
    id: eaId,                    // Keep for backward compatibility
    userId: userId,
    role: type,                  // 'controller' or 'prop'
    connected: false,
    userValidated: false,
    state: 'validating',
    balance: 0,
    equity: 0,
    freeMargin: 0,
    marginLevel: 0,
    accountNumber: '',
    accountName: '',
    ts: 0,
    lastTick: null,
    blocked: false,
    enabled: true,
    errors: [],
    lastSeen: Date.now(),
    socket: socket,
    settings: {},
    accountInfo: {},
    tradesLive: {},
    tradesHistory: {},
    ...additionalData
  };
}

/**
 * Log EA action (for debugging)
 */
function logEAAction(action, userId, type, eaId, details = '') {
  // Silently log (no console output for normal operations)
  // Can be re-enabled for debugging if needed
}

module.exports = {
  makeKey,
  parseKey,
  findEABySocket,
  findEAByEaId,
  findEA,
  getEAsByUser,
  getEAsByType,
  isDuplicateEA,
  checkAccountConflict,
  deleteEABySocket,
  deleteEAByKey,
  createEAData,
  logEAAction
};

