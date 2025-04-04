// src/routes/auth.js
import express from 'express';
import { sendOTP, verifyOTP, addSalon, getSalonByOwnerID, getSalonDetailsByID, updateNumberOfSeats, updateWorkingHours,addService, getAppoinmentsOfSalon, addCategory } from '../controllers/owner/ownerController.js';

const router = express.Router();

router.post('/send-otp', sendOTP );
router.post('/verify-otp', verifyOTP);
router.post('/add-salon', addSalon)
router.post('/get-salon-by-owner-id' , getSalonByOwnerID)
router.post('/get-salon-detail-by-id', getSalonDetailsByID)
router.post('/update-number-of-seats', updateNumberOfSeats)
router.post('/update-working-hours', updateWorkingHours)
router.post('/add-service', addService)
router.post('/get-appoinments-of-salon', getAppoinmentsOfSalon);
router.post('/add-category', addCategory)

export default router;