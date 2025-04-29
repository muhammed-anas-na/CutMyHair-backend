import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const otpSchema = new Schema({
  otpId: {
    type: String,
    default: uuidv4,
    unique: true,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true,
    index: true
  },
  otp: {
    type: String,
    required: true,
    minlength: 4,
    maxlength: 4
  },
  purpose: {
    type: String,
    required: true,
    enum: ['register', 'login'],
    default: 'register'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: { expires: '5m' } // TTL index - OTP expires after 5 minutes
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => Date.now() + 5 * 60 * 1000 // 5 minutes from creation
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0,
    max: 3
  }
}, {
  timestamps: true
});

// Method to generate OTP
otpSchema.statics.generateOTP = async function(phoneNumber, purpose) {
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  
  // Remove any existing OTP for the same phone number and purpose
  await this.deleteOne({ phoneNumber, purpose });
  
  const otpDoc = new this({
    phoneNumber,
    otp,
    purpose
  });
  
  const savedDoc = await otpDoc.save();
  return {
    otpId: savedDoc.otpId,
    otp: phoneNumber === '1234567890' ? '1111' : otp // Keep your test case
  };
};

// Method to verify OTP
otpSchema.statics.verifyOTP = async function(otpId, otp) {
  const otpDoc = await this.findOne({ 
    otpId,
    otp,
    isUsed: false,
    expiresAt: { $gt: Date.now() }
  });

  if (!otpDoc) {
    return { success: false, message: 'Invalid or expired OTP' };
  }

  if (otpDoc.attempts >= 3) {
    await this.deleteOne({ _id: otpDoc._id });
    return { success: false, message: 'Maximum attempts exceeded' };
  }

  otpDoc.isUsed = true;
  await otpDoc.save();
  
  return { success: true, phoneNumber: otpDoc.phoneNumber, purpose: otpDoc.purpose };
};

const OTP = mongoose.model('OTP', otpSchema);
export default OTP;