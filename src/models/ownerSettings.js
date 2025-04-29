import mongoose from 'mongoose';

const userSettingsSchema = new mongoose.Schema(
    {
        owner_id: {
            type: String,
            required: true,
            unique: true,
            ref: 'Owner',
        },
        notifications: {
            appointments: { type: Boolean, default: true },
            promotions: { type: Boolean, default: false },
            reminders: { type: Boolean, default: true },
        },
        appointmentPreferences: {
            preferredStylists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Stylist' }],
            favoriteServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
        },
    },
    {
        timestamps: true,
    }
);

const UserSettings = mongoose.model('UserSettings', userSettingsSchema);
export default UserSettings;