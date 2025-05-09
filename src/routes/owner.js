// src/routes/auth.js
import express from 'express';
import {
    getDashboardData, 
    sendOTP, 
    verifyOTP, 
    addSalon, 
    getSalonByOwnerID, 
    getSalonDetailsByID, 
    updateNumberOfSeats, 
    updateWorkingHours,
    addService, 
    getAppoinmentsOfSalon, 
    addCategory,
    addNewAppoinmentByOwner,
    getReports,
    addStylist,
    getStylistBySalonID,
    getSettings,
    getFinanceReport,
    withdrawAmount,
    updateServices,
    updateCategory,
    deleteStylist,
    updateSalonImages,
    deleteSalonImages
} from '../controllers/owner/ownerController.js';

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
router.post('/get-dashboard-data', getDashboardData)
router.post('/add-new-appoinment-by-owner', addNewAppoinmentByOwner)
router.post('/get-reports', getReports)
router.post('/get-owner-settings', getSettings)
router.post('/add-stylist', addStylist)
router.post('/get-stylist', getStylistBySalonID)
router.post('/get-finance-report', getFinanceReport)
router.post('/withdraw-amount', withdrawAmount)
router.post('/update-services', updateServices)
router.post('/update-category' , updateCategory)
router.post('/delete-stylist', deleteStylist)
router.post('/update-salon-images',updateSalonImages)
router.post('/delete-salon-images', deleteSalonImages)

export default router;