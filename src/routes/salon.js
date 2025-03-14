// src/routes/salon.js
import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.send('Get salons near user location');
});

router.get('/:id', (req, res) => {
  res.send(`Get details of salon with ID ${req.params.id}`);
});

export default router;