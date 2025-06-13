import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  discountPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expirationDate: {
    type: Date,
    required: true
  },
  maxUses: {
    type: Number,
    default: 1,
    min: 1
  },
  usedBy: [{
    userId: {
      type: String,
      unique: true,
    },
    usedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
couponSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Booking =  mongoose.model('Coupon', couponSchema);
export default Booking;