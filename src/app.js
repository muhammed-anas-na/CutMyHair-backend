import express from 'express';
import cors from 'cors';
import userRoutes from './routes/user.js';
import salonRoutes from './routes/salon.js';
import bookingRoutes from './routes/booking.js';
import ownerRoutes from './routes/owner.js';
import blogRoutes from './routes/blog.js';
import { errorHandler } from './middlewares/errorHandler.js';
import session from 'express-session';

const app = express();

// Trust the proxy for secure cookies in production
app.set('trust proxy', 1);

// Middleware setup
app.use(express.json());
app.use(cors({
    origin: 'https://cut-my-hair-frontend.vercel.app',
    credentials: true,
}));

// Session configuration
app.use(
    session({
        secret: 'your-secret-key', // Change this to a real secret in production
        resave: false,
        saveUninitialized: false, // Changed to false to avoid creating empty sessions
        cookie: {
            secure: true, // Must be true for cross-origin cookies with sameSite: 'none'
            httpOnly: true,
            maxAge: 1000 * 60 * 5, // 5 minutes
            sameSite: 'none' // Required for cross-origin requests
        },
    })
);

// Route definitions
app.get('/api/test', (req, res) => {
    // Test route that shows session is working
    if (!req.session.views) {
        req.session.views = 1;
    } else {
        req.session.views++;
    }
    res.status(200).json({
        message: "Success",
        sessionData: {
            views: req.session.views,
            id: req.session.id
        }
    });
});

app.use('/api/users', userRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/salons', salonRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/blogs', blogRoutes);

// Global error handler
app.use(errorHandler);

export default app;