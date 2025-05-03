import mongoose from 'mongoose';
const stylistSchema = new mongoose.Schema({
  salon_id: {
    type: String,
    required: true,
    unique: true,
  },
  stylists: [
    {
      name: String,
      image:String,
    },
  ],
});

stylistSchema.index({ salon_id: 1 });
const Stylist = mongoose.model('Stylist', stylistSchema);
export default Stylist;