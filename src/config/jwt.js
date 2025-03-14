// src/utils/jwt.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Generate JWT token
export const generateToken = (payload, role) => {
    return jwt.sign({ ...payload, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};