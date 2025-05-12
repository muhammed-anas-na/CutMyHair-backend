import express from 'express';
import cors from 'cors';
import userRoutes from './routes/user.js';
import salonRoutes from './routes/salon.js';
import bookingRoutes from './routes/booking.js';
import ownerRoutes from './routes/owner.js';
import blogRoutes from './routes/blog.js';
import { errorHandler } from './middlewares/errorHandler.js';
import session from 'express-session';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Trust the proxy for secure cookies in production
app.set('trust proxy', 1);

// Determine environment (use 'production' as the standard value)
const isProduction = process.env.NODE_ENV === 'prod';
console.log("Env ==>" , process.env.NODE_ENV  , isProduction);
// Middleware setup
app.use(express.json());
const allowedOrigins = isProduction 
  ? ['https://cut-my-hair-frontend.vercel.app'] 
  : ['http://69.62.78.176:3000', 'http://localhost:3000'];

app.use(cors({ origin: allowedOrigins, credentials: true }));

app.use(
    session({
        secret: 'your-secret-key',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: isProduction,
            httpOnly: true,
            maxAge: 1000 * 60 * 5, 
            sameSite: isProduction ? 'none' : 'lax'
        },
    })
);

// Route definitions
app.use('/api/users', userRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/salons', salonRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/blogs', blogRoutes);

// Global error handler
app.use(errorHandler);

export default app;