// copy-service.js — Independent Copy Manager Service
// Runs independently from TCP handlers - reads from Memory and processes copying

const TradeCopyManager = require('../managers/trade-copy-manager');
const EAManager = require('../managers/ea-manager');

class CopyService {
  constructor(controllers) {
    this.controllers = controllers;
    this.isRunning = false;
    this.interval = null;
    this.intervalMs = 200; // Process every 200ms (balanced speed vs CPU)
    this.logCounter = 0; // For periodic logging (not every cycle)
  }
  
  start() {
    if(this.isRunning) {
      console.log('[COPY-SERVICE] ⚠️ Already running');
      return;
    }
    
    this.isRunning = true;
    console.log(`[COPY-SERVICE] 🚀 Starting independent Copy Manager (interval: ${this.intervalMs}ms)`);
    console.log('[COPY-SERVICE] ℹ️ TCP handlers are now lightweight - only store data in Memory');
    console.log('[COPY-SERVICE] ℹ️ Copy logic runs independently, reading from Memory state');
    
    // Start polling interval
    this.interval = setInterval(() => {
      this.processCopying();
    }, this.intervalMs);
  }
  
  stop() {
    if(!this.isRunning) {
      console.log('[COPY-SERVICE] ⚠️ Not running');
      return;
    }
    
    this.isRunning = false;
    
    if(this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    console.log('[COPY-SERVICE] ⏹️ Copy Manager Service stopped');
  }
  
  /**
   * Main processing loop - reads from Memory and triggers copying
   */
  async processCopying() {
    try {
      // Increment counter for periodic logging (log every 25 cycles = 5 seconds)
      this.logCounter++;
      const shouldLog = (this.logCounter % 25 === 0);
      
      // Get all Controller EAs
      const controllerEAs = EAManager.getEAsByType(this.controllers, 'controller');
      
      if(controllerEAs.length === 0) {
        if(shouldLog) console.log('[COPY-SERVICE] ⏳ Waiting for Controllers...');
        return; // No controllers yet
      }
      
      // Process each Controller EA
      for(const ctrlObj of controllerEAs) {
        const ctrl = ctrlObj.ea;
        
        // DEBUG: Log controller state (periodically)
        const hasTradesLive = !!ctrl.tradesLive;
        const isConnected = !!ctrl.connected;
        
        // Skip if no trades data yet or not connected
        if(!ctrl.tradesLive || !ctrl.connected) {
          if(shouldLog) console.log(`[COPY-SERVICE] ⏭️ Skipping ${ctrl.id}: tradesLive=${hasTradesLive}, connected=${isConnected}`);
          continue;
        }
        
        // Get Prop EAs for this user
        const propEAs = EAManager.getEAsByType(this.controllers, 'prop')
          .filter(p => p.ea.userId === ctrl.userId && p.ea.connected);
        
        if(propEAs.length === 0) {
          if(shouldLog) console.log(`[COPY-SERVICE] ⚠️ No Prop EAs for Controller ${ctrl.id} (user: ${ctrl.userId})`);
          continue; // No Prop EAs for this user
        }
        
        // Read current state from Memory (INSTANT - no TCP wait!)
        const positions = ctrl.tradesLive.positions || [];
        const orders = ctrl.tradesLive.orders || [];
        
        if(shouldLog) {
          console.log(`[COPY-SERVICE] 🔄 Processing ${ctrl.id}: ${positions.length} positions, ${orders.length} orders → ${propEAs.length} Prop EA(s)`);
        }
        
        // Copy all positions (fire-and-forget - no delays!)
        if(positions.length > 0) {
          for(const position of positions) {
            TradeCopyManager.copyPositionToPropEAs(ctrl, position, propEAs);
          }
        }
        
        // Copy all orders (fire-and-forget - no delays!)
        if(orders.length > 0) {
          for(const order of orders) {
            TradeCopyManager.copyOrderToPropEAs(ctrl, order, propEAs);
          }
        }
        
        // If no trades, log it (periodically)
        if(shouldLog && positions.length === 0 && orders.length === 0) {
          console.log(`[COPY-SERVICE] ℹ️ ${ctrl.id} has no trades to copy`);
        }
      }
      
    } catch(err) {
      console.error('[COPY-SERVICE] ❌ Error in processCopying:', err.message);
      console.error(err.stack);
    }
  }
  
  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMs: this.intervalMs,
      controllersCount: EAManager.getEAsByType(this.controllers, 'controller').length,
      propsCount: EAManager.getEAsByType(this.controllers, 'prop').length
    };
  }
}

module.exports = CopyService;

