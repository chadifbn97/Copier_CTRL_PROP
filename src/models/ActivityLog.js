const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  type: { 
    type: String, 
    required: true,
    enum: ['ea_connected', 'ea_disconnected', 'settings_updated', 'warning', 'trade_copied']
  },
  
  // Common fields
  eaType: { type: String }, // 'controller' or 'prop'
  eaId: { type: String },
  accountNumber: { type: String },
  
  // Settings update specific
  settings: { type: mongoose.Schema.Types.Mixed },
  
  // Warning specific
  warningMessage: { type: String },
  
  // Trade copy specific
  controllerEAId: { type: String },
  controllerAccount: { type: String },
  controllerTicket: { type: String },
  propEAId: { type: String },
  propAccount: { type: String },
  propTicket: { type: String },
  action: { type: String }, // 'entry', 'exit', 'modify'
  success: { type: Boolean }
});

activityLogSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);

