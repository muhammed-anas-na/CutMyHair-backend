import mongoose from 'mongoose';

const AdminSettingsSchema = new mongoose.Schema({
  isOTPEnabled: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true
});


const AdminSettings = mongoose.model('AdminSettings', AdminSettingsSchema);
export default AdminSettings;