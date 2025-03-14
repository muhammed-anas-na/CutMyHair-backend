// src/routes/booking.js
import express from 'express';
const router = express.Router();

router.post('/', (req, res) => {
  res.send('Create a new booking');
});

router.get('/my-bookings', (req, res) => {
  res.send('List of user bookings');
});

export default router;