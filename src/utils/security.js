// security.js — Security Utilities
// HMAC Authentication, Rate Limiting, and Security Functions

const crypto = require('crypto');

// Rate limiting storage
const rateLimits = new Map(); // id -> array of recent message timestamps

/**
 * Compute HMAC-SHA256 signature
 * @param {string} id - EA identifier
 * @param {number} ts - Timestamp
 * @param {number} nonce - Nonce
 * @param {string} sharedSecret - Shared secret key
 * @returns {string} HMAC signature (hex)
 */
function computeHMAC(id, ts, nonce, sharedSecret) {
  const payload = `${id}|${ts}|${nonce}`;
  return crypto.createHmac('sha256', sharedSecret).update(payload).digest('hex');
}

/**
 * Verify message authentication
 * @param {object} msg - Message object with id, ts, nonce, sig
 * @param {string} sharedSecret - Shared secret key
 * @param {number} timestampWindow - Time window tolerance (ms)
 * @returns {object} {ok: boolean, reason: string}
 */
function verifyMessage(msg, sharedSecret, timestampWindow = 60000) {
  // If no SHARED_SECRET, skip auth
  if (!sharedSecret) {
    return { ok: true };
  }
  
  const { id, ts, nonce, sig } = msg;
  if (!id || !ts || !nonce || !sig) {
    console.warn?.(`[AUTH] ❌ Missing fields: id=${id?'ok':'X'} ts=${ts?'ok':'X'} nonce=${nonce?'ok':'X'} sig=${sig?'ok':'X'} (type=${msg?.type} req=${msg?.requestId || '-'})`);
    return { ok: false, reason: 'missing auth fields (id,ts,nonce,sig)' };
  }
  
  // Check timestamp drift
  const now = Date.now();
  const drift = now - ts;
  if (Math.abs(drift) > timestampWindow) {
    console.warn?.(`[AUTH] ❌ Timestamp out of window: id=${id} type=${msg?.type} req=${msg?.requestId || '-'} ts=${ts} now=${now} drift=${drift}ms win=${timestampWindow}ms`);
    return { ok: false, reason: `timestamp out of window (drift=${drift}ms)` };
  }
  
  // Verify HMAC signature
  const expected = computeHMAC(id, ts, nonce, sharedSecret);
  if (sig !== expected) {
    console.warn?.(`[AUTH] ❌ Signature mismatch: id=${id} type=${msg?.type} req=${msg?.requestId || '-'} ts=${ts} nonce=${nonce}`);
    return { ok: false, reason: 'signature mismatch' };
  }
  
  return { ok: true };
}

/**
 * Check rate limit for an EA
 * @param {string} id - EA identifier
 * @param {number} maxHz - Maximum messages per second
 * @returns {object} {ok: boolean, count: number}
 */
function checkRateLimit(id, maxHz = 2, windowMs = 1000) {
  const now = Date.now();
  const window = windowMs; // configurable window
  
  if (!rateLimits.has(id)) {
    rateLimits.set(id, []);
  }
  
  const timestamps = rateLimits.get(id);
  // Remove old timestamps outside window
  while (timestamps.length > 0 && timestamps[0] < now - window) {
    timestamps.shift();
  }
  
  // Check if rate limit exceeded
  if (timestamps.length >= maxHz) {
    console.warn?.(`[RATE] ⛔ Blocked id=${id} count=${timestamps.length}/${maxHz} in ${window}ms window`);
    return { ok: false, count: timestamps.length };
  }
  
  // Add current timestamp
  timestamps.push(now);
  return { ok: true };
}

/**
 * Clear rate limit for an EA (when disconnected)
 * @param {string} id - EA identifier
 */
function clearRateLimit(id) {
  rateLimits.delete(id);
}

/**
 * Parse TCP frames with length prefix
 * @param {Socket} sock - TCP socket
 * @param {function} onMsg - Callback for each message
 */
function parseFrames(sock, onMsg) {
  let buf = Buffer.alloc(0);
  sock.on('data', chunk => {
    buf = Buffer.concat([buf, chunk]);
    
    while (buf.length >= 4) {
      const len = buf.readUInt32BE(0);
      if (len > 1e7) { sock.destroy(); return; } // max 10MB
      if (buf.length < 4 + len) break;
      
      const payload = buf.slice(4, 4 + len);
      buf = buf.slice(4 + len);
      
      try {
        const msg = JSON.parse(payload.toString('utf8'));
        onMsg(msg);
      } catch (e) {
        console.error('[TCP] JSON parse error:', e.message);
      }
    }
  });
}

/**
 * Send error message to EA
 * @param {Socket} sock - TCP socket
 * @param {string} reason - Error reason code
 * @param {object} data - Additional error data
 */
function sendErrorMessage(sock, reason, data = {}) {
  const errorMsg = JSON.stringify({
    type: 'error',
    reason: reason,
    ...data
  });
  
  const len = Buffer.byteLength(errorMsg);
  const frame = Buffer.allocUnsafe(4 + len);
  frame.writeUInt32BE(len, 0);
  Buffer.from(errorMsg).copy(frame, 4);
  sock.write(frame);
}

module.exports = {
  computeHMAC,
  verifyMessage,
  checkRateLimit,
  clearRateLimit,
  parseFrames,
  sendErrorMessage
};

