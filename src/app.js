import express from 'express';
import cors from 'cors';
import userRoutes from './routes/user.js';
import salonRoutes from './routes/salon.js';
import bookingRoutes from './routes/booking.js';
import ownerRoutes from './routes/owner.js';
import blogRoutes from './routes/blog.js'
import { errorHandler } from './middlewares/errorHandler.js';
import session from 'express-session';

const app = express();

// Middleware setup
app.use(express.json());
app.use(cors({
    origin: '*',
    credentials: true,
}));

app.use(
    session({
        secret: 'your-secret-key',
        resave: false, 
        saveUninitialized: true,
        cookie: {
            secure: false,
            maxAge: 1000 * 60 * 5,
        },
    })
);
// Route definitions
app.get('/api/test',(req,res)=>{res.status(200).json({message:"Success"})})
app.use('/api/users', userRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/salons', salonRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/blogs', blogRoutes)
// Global error handler
app.use(errorHandler);

export default app;