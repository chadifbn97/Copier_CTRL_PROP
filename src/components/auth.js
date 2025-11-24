// Authentication Module
const crypto = require('crypto');

// ========== TOTP (Google Authenticator) ==========
function generateTOTP(secret) {
  const base32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const decoded = [];
  for(let i = 0; i < secret.length; i += 8) {
    let bits = 0, bitCount = 0;
    for(let j = 0; j < 8 && i+j < secret.length; j++) {
      const val = base32.indexOf(secret[i+j]);
      if(val === -1) continue;
      bits = (bits << 5) | val;
      bitCount += 5;
      if(bitCount >= 8) {
        decoded.push((bits >> (bitCount - 8)) & 0xFF);
        bitCount -= 8;
      }
    }
  }
  
  let time = Math.floor(Date.now() / 30000);
  const buffer = Buffer.alloc(8);
  for(let i = 7; i >= 0; i--) {
    buffer[i] = time & 0xff;
    time >>= 8;
  }
  
  const hmac = crypto.createHmac('sha1', Buffer.from(decoded));
  hmac.update(buffer);
  const hash = hmac.digest();
  const offset = hash[19] & 0xf;
  const code = ((hash[offset] & 0x7f) << 24) | (hash[offset+1] << 16) | (hash[offset+2] << 8) | hash[offset+3];
  return String(code % 1000000).padStart(6, '0');
}

function generateTOTPAtTime(secret, timeCounter) {
  const base32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const decoded = [];
  for(let i = 0; i < secret.length; i += 8) {
    let bits = 0, bitCount = 0;
    for(let j = 0; j < 8 && i+j < secret.length; j++) {
      const val = base32.indexOf(secret[i+j]);
      if(val === -1) continue;
      bits = (bits << 5) | val;
      bitCount += 5;
      if(bitCount >= 8) {
        decoded.push((bits >> (bitCount - 8)) & 0xFF);
        bitCount -= 8;
      }
    }
  }
  
  let time = timeCounter;
  const buffer = Buffer.alloc(8);
  for(let i = 7; i >= 0; i--) {
    buffer[i] = time & 0xff;
    time >>= 8;
  }
  
  const hmac = crypto.createHmac('sha1', Buffer.from(decoded));
  hmac.update(buffer);
  const hash = hmac.digest();
  const offset = hash[19] & 0xf;
  const code = ((hash[offset] & 0x7f) << 24) | (hash[offset+1] << 16) | (hash[offset+2] << 8) | hash[offset+3];
  return String(code % 1000000).padStart(6, '0');
}

function verifyTOTP(secret, token) {
  // Check current time window
  const current = generateTOTP(secret);
  if(current === token) return true;
  
  // Check previous window (30s tolerance)
  const prevTime = Math.floor(Date.now() / 30000) - 1;
  const prevSecret = generateTOTPAtTime(secret, prevTime);
  if(prevSecret === token) return true;
  
  // Check next window (30s tolerance)
  const nextTime = Math.floor(Date.now() / 30000) + 1;
  const nextSecret = generateTOTPAtTime(secret, nextTime);
  if(nextSecret === token) return true;
  
  return false;
}

module.exports = {
  verifyTOTP,
  generateTOTP
};

