// MongoDB Account Model
const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    minlength: 6,
    maxlength: 6
  },
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  trades: [{
    time: Date,
    symbol: String,
    type: String,
    volume: Number,
    price: Number,
    status: String
  }],
  settings: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

module.exports = mongoose.model('Account', accountSchema);

