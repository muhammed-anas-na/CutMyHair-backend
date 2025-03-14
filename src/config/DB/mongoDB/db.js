import mongoose from "mongoose";

// Connect to MongoDB
function connectToMongoDB_ATLAS(){
    mongoose.connect(process.env.MONGO_DB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
      .then(() => console.log('MongoDB connected to Atlas DB'))
      .catch((err) => console.error('MongoDB connection error:', err));
}

export default connectToMongoDB_ATLAS;