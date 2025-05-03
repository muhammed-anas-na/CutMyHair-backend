import mongoose from "mongoose";
const Schema = mongoose.Schema;

const bookingStatusEnum = [
  'pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'
];

const ServiceSchema = new Schema({
  service_id: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  duration: { type: Number, required: true, min: 0 }
});

const PaymentDetailsSchema = new Schema({
  payment_id: { type: String, required: true },
  order_id: { type: String, required: true },
  signature: { type: String, required: true },
  payment_status: { type: String, default: "success" }
});

const BookingSchema = new Schema({
  salon_name: { type: String, required: true },
  salon_id: { type: String, required: true, index: true },
  user_id: { type: String, required: true, index: true },
  services: {
    type: [ServiceSchema],
    required: true,
    validate: [array => array.length > 0, 'At least one service is required']
  },
  appointment_date: { type: Date, required: true },
  scheduled_start_time: {
    type: String,
    required: true,
  },
  scheduled_end_time: {
    type: String,
    required: true,
  },
  actual_start_time: { type: Date },
  actual_end_time: { type: Date },
  total_price: { type: Number, required: true, min: 0 },
  notes: { type: String },
  total_duration: { type: Number, required: true, min: 0 },
  payment_details: { type: PaymentDetailsSchema, required: true },
  status: {
    type: String,
    required: true,
    enum: bookingStatusEnum,
    default: 'confirmed'
  },
  booking_date: { type: Date, required: true, default: Date.now },
  buffer_time: { type: Number, default: 5 },
  reminder_sent: { type: Boolean, default: false },
  late_notification_sent: { type: Boolean, default: false },
  seat: { type: Number, required: true, min: 0, default: 0 },
  stylist:String,
}, {
  timestamps: true
});

const Booking = mongoose.model('Booking', BookingSchema);
export default Booking;