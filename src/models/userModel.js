import mongoose from 'mongoose';

// Function to generate a random user_id
const generateUserId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Define the User Schema
const userSchema = new mongoose.Schema(
    {
        user_id: {
            type: String,
            required: true,
            unique: true,
            default: generateUserId,
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        phone_number: {
            type: String,
            required: [true, 'Phone number is required'],
            unique: true,
            trim: true,
            match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number'],
        },
        role: {
            type: String,
            default: 'user',
            enum: ['user'],
        },
        isVerified: {
            type: Boolean,
            default: true,
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number],
                default: [0, 0],
            },
        },
        favorites: [
            {
                salon_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Salon',
                },
            },
        ],
        bookings: [
            {
                booking_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Booking',
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);
const User = mongoose.model('User', userSchema);

export default User;