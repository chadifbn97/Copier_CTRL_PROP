// MongoDB Trade Action Log Model
const mongoose = require('mongoose');

const tradeActionLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  controllerEAId: {
    type: String,
    required: true,
    index: true
  },
  controllerTicket: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: ['close_position', 'modify_position', 'remove_order', 'modify_order']
  },
  // Action-specific data
  sl: Number,
  tp: Number,
  volume: Number,
  openPrice: Number,
  
  // Tracking
  propEAId: String,
  propTicket: String,
  success: Boolean,
  error: String,
  
  // Metadata
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  serverReceivedAt: Date,
  propExecutedAt: Date
}, {
  timestamps: true  // Auto-adds createdAt and updatedAt
});

// Indexes for fast queries
tradeActionLogSchema.index({ userId: 1, controllerEAId: 1, timestamp: -1 });
tradeActionLogSchema.index({ controllerTicket: 1, timestamp: -1 });

module.exports = mongoose.model('TradeActionLog', tradeActionLogSchema);

