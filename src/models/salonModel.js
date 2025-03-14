import mongoose from 'mongoose';

const generateSalonId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};
// Define sub-schemas for services, reviews, and working hours
const serviceSchema = new mongoose.Schema({
  service_id: { type: String, required: true, },
  name: { type: String, required: true },
  description: { type: String },
  price: { type: String, required: true },
  duration: { type: String, required: true },
  category: { type: String, enum: ['Male', 'Female', 'Unisex'], required: true },
  status: { type: String, enum: ['available', 'unavailable'], default: 'available' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});


const reviewSchema = new mongoose.Schema({
  review_id: { type: String, required: true },
  user_id: { type: String, required: true },
  rating: { type: String, required: true },
  comment: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  image_url: { type: String }
});

const workingHoursSchema = new mongoose.Schema({
  isOpen: { type: Boolean, default: false },
  start: { type: Date },
  end: { type: Date }
});

// Main Salon schema
const salonSchema = new mongoose.Schema({
  salon_id: { type: String, required: true, unique: true,  default: generateSalonId },
  name: { type: String, required: true },
  owner_id: { type: String, required: true },
  description: { type: String },
  address: { type: String, required: true },
  contact_phone: { type: String, required: true },
  contact_email: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active'},
  rating: { type: Number, default: 0 },
  number_of_seats: { type: Number},
  location: {
    type: {
      type: String, enum: ['Point'], default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  location_text: String,
  location_name: String,
  services: [serviceSchema],
  images: [],
  reviews: [reviewSchema],
  working_hours: {
    monday: workingHoursSchema,
    tuesday: workingHoursSchema,
    wednesday: workingHoursSchema,
    thursday: workingHoursSchema,
    friday: workingHoursSchema,
    saturday: workingHoursSchema,
    sunday: workingHoursSchema
  }
});

const Salon = mongoose.model('Salon', salonSchema);
Salon.collection.createIndex({ location: "2dsphere" });
Salon.collection.createIndex({
  location_text: "text",
  location_name: "text",
  "services.name": "text",
  name: "text"
}, {
  weights: {
    location_text: 10,
    location_name: 10,
    "services.name": 5,
    name: 1
  },
  name: "search_index"
});
export default Salon;
