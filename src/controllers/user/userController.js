import Razorpay from 'razorpay';
import { generateToken } from '../../config/jwt.js';
import {
  addUserToDB,
  updateUserLocationInDB,
  getSalonFeedback_FromDB,
  getSalonServices_FromDB,
  findUserFromDB_BY_Number,
  getNearestSalon_From_DB,
  confirm_booking_on_DB,
  getBookings_FROM_DB,
  getBookingsDetails_FROM_DB,
  search_FROM_DB,
  getAllSalons_From_DB,
  AddFavoritesToDB,
  RemoveFavorites_FROM_DB,
  getFavorites_FROM_DB,
  GET_USER_DETAILS_FROM_DB
} from '../../repository/userRepository.js';
import axios from 'axios';
import Salon from '../../models/salonModel.js';
import Booking from '../../models/bookingModel.js';
import OTP from '../../models/otpModel.js'

const razorpay = new Razorpay({
  key_id: 'rzp_test_SNNaKxo04yi7Lf',
  key_secret: '8p02U92ji39GYBIQ7om8QUYX',
})

export const sendOTP = async (req, res, next) => {
  try {
    const { phone_number, from } = req.body;

    if (!phone_number) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const userExists = await findUserFromDB_BY_Number(phone_number);

    if (from === 'register' && userExists) {
      return res.status(400).json({ success: false, message: 'Phone number already exists' });
    }
    if (from === 'login' && !userExists) {
      return res.status(400).json({ success: false, message: 'Phone number not registered' });
    }

    // Generate and store OTP
    const { otpId, otp } = await OTP.generateOTP(phone_number, from);
    
    console.log(`OTP for ${phone_number}: ${otp}`);

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: { 
        otpId, // Send this to client instead of the actual OTP
        otp_expiry: 300 
      },
    });

  } catch (err) {
    next(err);
  }
};

export const verifyOTP = async (req, res, next) => {
  try {
    const { name, otp, otpId, from } = req.body;
    
    if (!otp || !otpId || !from) {
      return res.status(400).json({ success: false, message: 'Invalid fields' });
    }

    const verificationResult = await OTP.verifyOTP(otpId, otp);
    
    if (!verificationResult.success) {
      return res.status(400).json({ success: false, message: verificationResult.message });
    }

    const phone_number = verificationResult.phoneNumber;

    if (from === 'login') {
      const user = await findUserFromDB_BY_Number(phone_number);
      if (!user) {
        return res.status(401).json({ success: false, message: 'No user found' });
      }
      const token = generateToken({ user_id: user.user_id, phone_number }, user.role);
      return res.status(200).json({
        success: true,
        message: 'Login Successful',
        data: { user_id: user.user_id, access_token: token },
      });
    } else { // register
      const existingUser = await findUserFromDB_BY_Number(phone_number);
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Phone number already used' });
      }
      const response = await addUserToDB(name, phone_number);
      const token = generateToken({ 
        user_id: response[0].user_id, 
        phone_number 
      }, response[0].role);
      
      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        data: { user_id: response[0].user_id, access_token: token },
      });
    }
  } catch (err) {
    next(err);
  }
};

export const updateUserLocation = async (req, res, next) => {
  try {
    const { user_id, latitude, longitude } = req.body;
    if (!user_id || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Invalid fields' });
    }
    const response = await updateUserLocationInDB(user_id, latitude, longitude);
    res.status(200).json({
      success: true,
      message: 'Location Updated Successfully',
      data: { latitude, longitude, location_in_text: '' },
    });
  } catch (err) {
    next(err);
  }
};

export const getSalonFeedback = async (req, res, next) => {
  try {
    const { salon_id } = req.body;
    if (!salon_id) return res.status(400).json({ success: false, message: 'All fields required' });
    const response = await getSalonFeedback_FromDB(salon_id);
    res.status(200).json({ success: true, data: response });
  } catch (err) {
    next(err);
  }
};

export const getSalonServices = async (req, res, next) => {
  try {
    const { salon_id } = req.body;
    if (!salon_id) return res.status(400).json({ success: false, message: 'All fields required' });
    const response = await getSalonServices_FromDB(salon_id);
    res.status(200).json({ success: true, data: response });
  } catch (err) {
    next(err);
  }
};

export const getLocationNameByCoordinates = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    const accessToken = 'pk.eyJ1IjoicWlmeSIsImEiOiJjbTc2OGlvZ2IwNjNnMm5wejhybXNhbXd3In0.oiEiHV6rkY5IlL6qGJwkRA';
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${accessToken}`;
    
    const response = await axios.get(url);
    const locationName = response.data.features?.[0]?.place_name || 'Unknown location';
    const locationText = response.data.features?.[0]?.text || 'Unknown location';
    res.json({ locationName, locationText });
  } catch (err) {
    next(err);
  }
};

export const getLocationFromText = async (req, res, next) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Location text is required' });
    }
    
    const accessToken = 'pk.eyJ1IjoicWlmeSIsImEiOiJjbTc2OGlvZ2IwNjNnMm5wejhybXNhbXd3In0.oiEiHV6rkY5IlL6qGJwkRA';
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${accessToken}`;
    
    const response = await axios.get(url);
    const locations = response.data.features.map(feature => ({
      name: feature.place_name,
      text: feature.text || 'Unknown',
      latitude: feature.center[1],
      longitude: feature.center[0]
    }));
    
    res.json({ locations });
  } catch (err) {
    next(err);
  }
};

export const getNearestSalon = async(req,res,next)=>{
  try{
    console.log("Nearest salon fun")
    const {latitude, longitude, radius=5, user_id} = req.body;
    if(!latitude || !longitude || !radius) return res.status(400).json({success: false, message: "All field required"});
    const response = await getNearestSalon_From_DB(latitude,longitude,radius, user_id);
    console.log(response)
    return res.status(200).json(response)

  }catch(err){
    next(err);
  }
}

export const createOrder = async(req,res,next)=>{
  try{
    const {amount} = req.body;
    console.log("AMount == >" , amount);
    if(!amount) return res.statu(400).json({success: false, message: "All fields required"});
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: 'INR',
      receipt: "receipt_" + Math.random().toString(3).substring(7),
    })
    console.log(order)
    return res.status(200).json({success: true, message: "Order Created", orderId: order.id})
  }catch(err){
    console.log(err);
    next(err);
  }
}

export const confirmBooking = async(req,res,next)=>{
  try{
    const response = await confirm_booking_on_DB(req.body);
    console.log(response);
    return res.status(200).json({
      success: true,
      message:"Booking Confirmed",
      data: response,
    })
  }catch(err){
    console.log(err);
    next(err);
  }
}

export const getUserBookings = async(req,res,next)=>{
  try{
    const {user_id} = req.body;
    if(!user_id) return res.status(400).json({success: false, message: "All fields requied"});

    const response = await getBookings_FROM_DB(user_id);
    console.log(response);
    return res.status(200).json({success: true, response});
  }catch(err){
    console.log(err);
    next(err);
  }
}

export const getBookingDetails = async(req,res,next)=>{
  try{
    const {booking_id} = req.body;
    if(!booking_id) return res.status(400).json({success: false, message: "All fields requied"});

    const response = await getBookingsDetails_FROM_DB(booking_id);
    console.log(response);
    return res.status(200).json({success: true, response});
  }catch(err){
    console.log(err);
    next(err);
  }
}

export const search = async(req,res,next)=>{
  try{
    console.log("Body==>" , req.body);
    const response = await search_FROM_DB(req.body.searchParams);;
    console.log(response);
    return res.status(200).json(response);
  }catch(err){
    console.log(err);
    next(err);
  }
}


export const getAvailableTimeSlots = async (req, res, next) => {
  try {
    const { salon_id, date, total_duration } = req.query;
    console.log('Request Params:', { salon_id, date, total_duration });

    if (!salon_id || !date || !total_duration) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }

    const duration = parseInt(total_duration);
    console.log('Parsed Duration:', duration);
    if (isNaN(duration) || duration <= 0) {
      return res.status(400).json({ success: false, message: 'total_duration must be a positive number' });
    }

    const requestedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    console.log('Requested Date:', requestedDate);
    console.log('Today (normalized):', today);

    if (requestedDate < today) {
      return res.status(400).json({ success: false, message: 'Cannot book appointments for past dates', timeSlots: [] });
    }

    const salon = await Salon.findOne({ salon_id });
    console.log('Salon Data:', salon);
    if (!salon) {
      return res.status(404).json({ success: false, message: 'Salon not found' });
    }

    const salonCapacity = salon.number_of_seats || 1;
    const slotInterval = 15;
    console.log('Salon Capacity:', salonCapacity, 'Slot Interval:', slotInterval);

    const dateObj = new Date(date);
    console.log('Date Object:', dateObj);
    if (isNaN(dateObj)) {
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }

    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const dayWorkingHours = salon.working_hours[dayOfWeek];
    console.log('Day of Week:', dayOfWeek, 'Working Hours:', dayWorkingHours);

    if (!dayWorkingHours || !dayWorkingHours.isOpen) {
      return res.status(200).json({ success: true, message: 'Salon is closed on this date', timeSlots: [] });
    }

    const openTime = `${dayWorkingHours.start.getUTCHours().toString().padStart(2, '0')}:${dayWorkingHours.start.getUTCMinutes().toString().padStart(2, '0')}`;
    const closeTime = `${dayWorkingHours.end.getUTCHours().toString().padStart(2, '0')}:${dayWorkingHours.end.getUTCMinutes().toString().padStart(2, '0')}`;
    const openMinutes = convertTimeToMinutes(openTime);
    const closeMinutes = convertTimeToMinutes(closeTime);
    console.log('Open Time (UTC):', openTime, 'Close Time (UTC):', closeTime);
    console.log('Open Minutes:', openMinutes, 'Close Minutes:', closeMinutes);

    const now = new Date();
    const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 
                                   now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()));
    const dateObjUTC = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()));
    const isToday = dateObjUTC.toDateString() === nowUTC.toDateString();
    console.log('Is Today Check:', isToday, 'Now UTC:', nowUTC, 'Date Obj UTC:', dateObjUTC);

    let startTime = openTime;
    if (isToday) {
      const nowIST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const currentTimeIST = `${nowIST.getHours().toString().padStart(2, '0')}:${nowIST.getMinutes().toString().padStart(2, '0')}`;
      console.log('Current Time (IST):', currentTimeIST);

      const currentMinutesIST = convertTimeToMinutes(currentTimeIST);
      const currentMinutesUTC = currentMinutesIST - 330;
      const currentTimeUTC = convertMinutesToTime(currentMinutesUTC > 0 ? currentMinutesUTC : currentMinutesUTC + 24 * 60);
      console.log('Current Time (UTC):', currentTimeUTC);

      startTime = roundToNextTimeSlot(currentTimeUTC, slotInterval);
      const startMinutes = convertTimeToMinutes(startTime);

      if (startMinutes < openMinutes) startTime = openTime;
      if (startMinutes >= closeMinutes || startMinutes + duration > closeMinutes) {
        return res.status(200).json({ success: true, message: 'No available slots remaining today', timeSlots: [] });
      }
      console.log('Today Detected - Rounded Start Time (UTC):', startTime);
    } else {
      console.log('Not Today - Start Time (UTC):', startTime);
    }

    const startOfDay = new Date(dateObj);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateObj);
    endOfDay.setHours(23, 59, 59, 999);
    console.log('Start of Day:', startOfDay, 'End of Day:', endOfDay);

    const bookings = await Booking.find({
      salon_id,
      appointment_date: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['cancelled', 'no-show'] },
    });
    console.log('Bookings Count:', bookings.length);

    const formattedBookings = bookings
      .map((booking) => {
        let startTime = standardizeTimeFormat(booking.scheduled_start_time);
        let endTime = standardizeTimeFormat(booking.scheduled_end_time);

        if (booking.scheduled_start_time.includes('GMT+0530')) {
          const startDate = new Date(booking.scheduled_start_time);
          const endDate = new Date(startDate.getTime() + booking.total_duration * 60 * 1000);
          if (isNaN(startDate) || isNaN(endDate)) {
            console.warn(`Invalid booking time for booking ID ${booking._id}`);
            return null;
          }
          startTime = `${startDate.getUTCHours().toString().padStart(2, '0')}:${startDate.getUTCMinutes().toString().padStart(2, '0')}`;
          endTime = `${endDate.getUTCHours().toString().padStart(2, '0')}:${endDate.getUTCMinutes().toString().padStart(2, '0')}`;
        }

        return {
          seat: booking.seat === 0 || booking.seat === 1 ? 0 : booking.seat,
          startTime,
          endTime,
        };
      })
      .filter((booking) => booking !== null);
    console.log('Formatted Bookings (UTC):', formattedBookings);

    const timeSlots = [];
    let currentMinutes = convertTimeToMinutes(startTime);
    console.log('Initial Current Minutes:', currentMinutes);

    while (currentMinutes + duration <= closeMinutes) {
      const slotStartTime = convertMinutesToTime(currentMinutes);
      const slotEndTime = convertMinutesToTime(currentMinutes + duration);
      console.log('Checking Slot (UTC):', slotStartTime, '-', slotEndTime);

      let availableSeats = 0;
      for (let seatIndex = 0; seatIndex < salonCapacity; seatIndex++) {
        console.log('Checking Seat:', seatIndex);
        if (!hasConflict(slotStartTime, slotEndTime, seatIndex, formattedBookings)) {
          availableSeats++;
        }
      }
      console.log('Available Seats for Slot:', availableSeats);

      if (availableSeats > 0) {
        timeSlots.push({
          formattedTime: slotStartTime,
          availableSeats,
        });
      }

      currentMinutes += slotInterval;
    }
    console.log('Generated Time Slots Count:', timeSlots.length);

    return res.status(200).json({
      success: true,
      message: 'Available time slots retrieved successfully',
      data: { timeSlots },
    });
  } catch (err) {
    console.error('Error in getAvailableTimeSlots:', err);
    next(err);
  }
};

// Helper functions remain the same, except for standardizeTimeFormat
function convertTimeToMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

function convertMinutesToTime(minutes) {
  while (minutes < 0) minutes += 24 * 60;
  minutes = minutes % (24 * 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function roundToNextTimeSlot(timeString, interval) {
  const minutes = convertTimeToMinutes(timeString);
  const roundedMinutes = Math.ceil(minutes / interval) * interval;
  return convertMinutesToTime(roundedMinutes);
}

function standardizeTimeFormat(timeString) {
  if (timeString.includes('GMT+0530') || timeString.includes('India Standard Time')) {
    const date = new Date(timeString);
    if (isNaN(date)) return timeString;
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  if (timeString.includes('AM') || timeString.includes('PM')) {
    const [time, period] = timeString.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    if (period === 'AM') {
      const adjustedHours = hours === 12 ? 0 : hours;
      return `${adjustedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } else {
      const adjustedHours = hours === 12 ? 12 : hours + 12;
      return `${adjustedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  return timeString;
}

function hasConflict(startTime, endTime, seatIndex, bookings) {
  const slotStart = convertTimeToMinutes(startTime);
  const slotEnd = convertTimeToMinutes(endTime);

  return bookings.some((booking) => {
    if (booking.seat !== seatIndex) return false;
    const bookingStart = convertTimeToMinutes(booking.startTime);
    const bookingEnd = convertTimeToMinutes(booking.endTime);
    return !(slotEnd <= bookingStart || slotStart >= bookingEnd);
  });
}

export const getAllSalons = async(req,res,next)=>{
  try{
    const response = await getAllSalons_From_DB();
    return res.status(200).json({
      success:true,
      response
    })
  }catch(err){
    next(err);
  }
}


export const addToFavorites = async(req,res,next)=>{
  try{
    const {salon_id , user_id} = req.body;
    if(!salon_id || !user_id){
      return res.status(400).json({success: false, message: "All Fields Requried"})
    }
    const response = await AddFavoritesToDB(salon_id, user_id);
    return res.status(200).json({success:true, response});
  }catch(err){
    console.log(err);
    next(err);
  }
}

export const removeFromFavorites = async(req,res,next)=>{
  try{
    const {salon_id , user_id} = req.body;
    if(!salon_id || !user_id){
      return res.status(400).json({success: false, message: "All Fields Requried"})
    }
    const response = await RemoveFavorites_FROM_DB(salon_id, user_id);
    return res.status(200).json({success:true, response});
  }catch(err){
    console.log(err);
    next(err);
  }
}

export const getAllFavorites = async(req,res,next)=>{
  try{
    const {user_id} = req.body;
    console.log(req.body)
    if(!user_id){
      return res.status(400).json({success: false, message: "All Fields Required"})
    }
    const data = await getFavorites_FROM_DB(user_id)
    return res.status(200).json({success:true, data})
  }catch(err){
    next(err);
  }
}

export const getUserDetails = async(req,res,next)=>{
  try{
    const {user_id} = req.body;
    if(!user_id){
      return res.status(400).json({success: false, message: "All Fields Required"})
    }
    const data = await GET_USER_DETAILS_FROM_DB(user_id)
    return res.status(200).json({success:true, data})
  }catch(err){
    next(err);
  }
}