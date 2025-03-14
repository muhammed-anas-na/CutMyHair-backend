// src/routes/auth.js
import express from 'express';
import { sendOTP, 
    verifyOTP, 
    updateUserLocation, 
    getSalonFeedback, 
    getSalonServices, 
    getLocationNameByCoordinates, 
    getLocationFromText,
    getNearestSalon,
    createOrder,
    confirmBooking,
    getUserBookings,
    getBookingDetails,
    search,
    getAvailableTimeSlots
} from '../controllers/user/userController.js';
import { authenticateToken } from '../middlewares/validatejwt.js';
const router = express.Router();

router.post('/send-otp',sendOTP );
router.post('/verify-otp', verifyOTP);

router.post('/update-user-location', authenticateToken(['user']),updateUserLocation)
router.post('/get-salon-feedbacks' , getSalonFeedback)
router.post('/get-salon-services', getSalonServices)
router.post('/get-location-name-by-coordinates', getLocationNameByCoordinates)
router.post('/get-location-from-text', getLocationFromText)
router.post('/get-nearest-salon', getNearestSalon)
router.post("/create-razorpay-order", createOrder)
router.post('/confirm-booking', confirmBooking)
router.post('/get-user-bookings', getUserBookings)
router.post('/get-booking-details', getBookingDetails);
router.post('/search', search)
router.get('/get-time-slots',getAvailableTimeSlots)
export default router;