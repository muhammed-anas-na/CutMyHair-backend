const mongoose = require('mongoose');
const { Schema } = mongoose;
const salonFinanceSchema = new Schema({
  salonId: {
    type: String,
    required: true,
    unique: true,
  },
  currentBalance: {
    type: Number,
    default: 0, // In paise
  },
  availableForWithdrawal: {
    type: Number,
    default: 0, // In paise
  },
  totalWithdrawn: {
    type: Number,
    default: 0, // In paise
  },
  transactions: [
    {
      transactionId: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        enum: ['deposit', 'withdrawal'],
        required: true,
      },
      amount: {
        type: Number,
        required: true, // In paise
      },
      description: {
        type: String,
        required: true,
      },
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        required: true,
      },
      date: {
        type: Date,
        required: true,
        default: Date.now,
      },
    },
  ],
  withdrawals: [
    {
      withdrawalId: {
        type: String,
        required: true,
      },
      amount: {
        type: Number,
        required: true, // In paise
      },
      upiId: {
        type: String,
        required: true,
      },
      payoutId: {
        type: String,
        required: true,
      },
      status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        required: true,
      },
      date: {
        type: Date,
        required: true,
        default: Date.now,
      },
      narration: {
        type: String,
        default: '',
      },
      failureReason: {
        type: String,
        default: '',
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save hook to update `updatedAt` timestamp
salonFinanceSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Create model
const SalonFinance = mongoose.model('SalonFinance', salonFinanceSchema);

module.exports = SalonFinance;