// MongoDB Connection Configuration
const mongoose = require('mongoose');

let isConnected = false;

async function connectDB(mongoUri) {
  if (isConnected) {
    console.log('[MongoDB] Already connected');
    return true;
  }

  if(!mongoUri) {
    console.log('[MongoDB] No URI provided, using in-memory storage');
    return false;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000 // 5s timeout
    });
    
    isConnected = true;
    console.log('[MongoDB] ✅ Connected successfully');
    console.log('[MongoDB] Database:', mongoose.connection.name);
    console.log('[MongoDB] URI:', mongoUri.replace(/\/\/.*@/, '//*****@')); // Hide credentials
    return true;
  } catch (error) {
    console.error('[MongoDB] ❌ Connection failed:', error.message);
    console.log('[MongoDB] Falling back to in-memory storage (Map)');
    return false;
  }
}

async function disconnectDB() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[MongoDB] Disconnected');
  }
}

function isMongoConnected() {
  return isConnected;
}

module.exports = {
  connectDB,
  disconnectDB,
  isMongoConnected
};

