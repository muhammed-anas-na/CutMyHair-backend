import mongoose from 'mongoose';

// Function to generate a random owner_id
const generateOwnerId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Define the Owner Schema
const ownerSchema = new mongoose.Schema(
    {
        owner_id: {
            type: String,
            required: true,
            unique: true,
            default: generateOwnerId,
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
            default: 'owner',
            enum: ['owner'],
        },
        isVerified: {
            type: Boolean,
            default: true,
        },
        salons: [
            {
                salon_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Salon', 
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Create the Owner model
const Owner = mongoose.model('Owner', ownerSchema);

export default Owner;