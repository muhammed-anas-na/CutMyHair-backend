// server.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './app.js';
import connectToMongoDB_ATLAS from './config/DB/mongoDB/db.js';
dotenv.config();


connectToMongoDB_ATLAS()


// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});