import mongoose from "mongoose";
import Owner from "../models/ownerModel.js"
import Salon from '../models/salonModel.js'
import formatWorkingHours from "../utils/formatWorkingHours.js";
import Booking from "../models/bookingModel.js";
import UserModel from "moongose/models/user_model.js";
import Stylist from "../models/StylistModel.js";
import Razorpay from 'razorpay';
import dotenv from 'dotenv';
import AdminSettings from "../models/adminSettingsModel.js";
import Coupon from "../models/CouponModel.js";
dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.key_id,
  key_secret: process.env.key_secret,
});

export const addOwnerToDB = async(name, phone_number)=>{
    return Owner.insertMany({
        name,
        phone_number,
    })
}

export const addSalonToDB = async ({
    owner_id,
    locationName,
    locationText,
    salonName,
    contactNumber,
    address,
    imageUrls,
    latitude,
    longitude
}) => {
    try {
      console.log("Ownerid==>",owner_id)
        const newSalon = {
            name: salonName,
            owner_id: owner_id,
            address,
            contact_phone: contactNumber,
            location: {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)],
            },
            location_name: locationName,
            location_text: locationText,
            images: imageUrls || [],
            services: [],
            reviews: [],
        };

        const insertedSalons = await Salon.insertMany([newSalon]);

        return insertedSalons[0];
    } catch (error) {
        console.error('Error adding salon:', error);
        if (error.code === 11000) {
            throw new Error('Salon with the same name or contact number already exists');
        }
        throw new Error('Failed to add salon: ' + error.message);
    }
};

export const getSalonByOwnerID_From_DB = async(owner_id, fields) => {
  // If fields parameter is provided, format it for MongoDB projection
  let projection = {};
  
  if (fields && Array.isArray(fields) && fields.length > 0) {
      fields.forEach(field => {
          projection[field] = 1;
      });
  }
  
  // If projection is empty (no fields specified), return all fields
  // Otherwise, use the projection to return only specific fields
  return Object.keys(projection).length 
      ? Salon.find({ owner_id }, projection)
      : Salon.find({ owner_id });
}

export const getSalonDetailsByID_From_DB = async(salon_id)=>{
    return Salon.findOne({
        salon_id
    })
}

export const findOwnerFromDB_BY_Number = async(phone_number)=>{
    return Owner.findOne({
        phone_number
    })
}

export const UpdateNumberOfSeats_ON_DB = async (salon_id, seats) => {
    try {
        // Ensure seats is a number
        const numberOfSeats = parseInt(seats, 10);
        if (isNaN(numberOfSeats)) {
            throw new Error('Invalid number of seats');
        }

        const updatedSalon = await Salon.findOneAndUpdate(
            { salon_id }, 
            { number_of_seats: numberOfSeats },
            { new: true }
        );

        if (!updatedSalon) {
            throw new Error('Salon not found');
        }

        return updatedSalon;
    } catch (error) {
        console.error('Error updating number of seats:', error);
        throw new Error(error.message);
    }
};

export const updateWorkingHour_ON_DB = async (salon_id, workingHours) => {
  try {
    if (!salon_id) {
      throw new Error('Salon ID is required');
    }
    console.log(workingHours)
    // Validate and convert working hours to IST Date objects
    const updateData = {};
    for (const [day, hours] of Object.entries(workingHours)) {
      const dayLower = day.toLowerCase();
      if (hours.start && hours.end && hours.start !== '' && hours.end !== '') {
        // Parse 24-hour format (e.g., "09:00", "18:00") as IST times
        const startDate = new Date(`1970-01-01T${hours.start}:00+05:30`);
        const endDate = new Date(`1970-01-01T${hours.end}:00+05:30`);
        console.log(startDate);
        console.log(endDate);
        // Validate the parsed dates
        if (isNaN(startDate) || isNaN(endDate)) {
          throw new Error(`Invalid time format for ${day}: ${hours.start} - ${hours.end}`);
        }

        updateData[`working_hours.${dayLower}`] = {
          isOpen: true,
          start: startDate,
          end: endDate,
        };
      } else {
        updateData[`working_hours.${dayLower}`] = {
          isOpen: false,
          start: null,
          end: null,
        };
      }
      console.log(`Formatted ${dayLower}:`, updateData[`working_hours.${dayLower}`]);
    }

    // Update the database
    const updatedSalon = await Salon.findOneAndUpdate(
      { salon_id },
      { $set: updateData },
      { new: true }
    );
    console.log("Updated Salon==>",updatedSalon)
    if (!updatedSalon) {
      throw new Error(`Salon with ID ${salon_id} not found`);
    }

    return updateData;

  } catch (error) {
    console.log('Error updating working hours:', error);
    throw error;
  }
};

export const addService_TO_DB = async (salon_id, name, description, price, duration, category, status, category_id) => {
  try {
    // Create a unique service ID
    const service_id = new mongoose.Types.ObjectId().toString();
    
    // Create the new service object
    const newService = {
      service_id,
      name,
      description: description || '',
      price: Number(price), // Ensure price is stored as a number
      duration,
      category, // This is the service type (Female/Male/Unisex)
      status: status || 'available',
      category_id: category_id || null, // Store category_id if provided, null otherwise
      created_at: new Date(),
      updated_at: new Date()
    };
    console.log("New service=>", newService);
    // Find the salon and push the new service to its services array
    const updatedSalon = await Salon.findOneAndUpdate(
      { salon_id: salon_id },
      { $push: { services: newService } },
      { new: true, runValidators: true }
    );

    if (!updatedSalon) {
      throw new Error(`Salon with ID ${salon_id} not found`);
    }

    // Return the newly added service
    const addedService = updatedSalon.services.find(
      service => service.service_id === service_id
    );

    return addedService;

  } catch (error) {
    console.error('Error adding service to salon:', error);
    throw new Error(`Failed to add service: ${error.message}`);
  }
};

export const getAppoinmentOf_SALON_FROM_DB = async (salon_id, date) => {
  try {
    // Parse the date string to a Date object if it's not already
    const searchDate = date instanceof Date ? date : new Date(date);
    console.log("Search Date==>",searchDate);
    // Set the time to 00:00:00 for the start of the day
    const startOfDay = new Date(searchDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    // Set the time to 23:59:59 for the end of the day
    const endOfDay = new Date(searchDate);
    endOfDay.setHours(23, 59, 59, 999);
    console.log("Start Day=>", startOfDay)
    console.log("end Day=>", endOfDay)
    // // Use the aggregation pipeline for more efficient querying and joining
    console.log("Slaon ID", salon_id);
    const bookingsWithUsers = await Booking.aggregate([
      // Match bookings for the specified salon and date
      {
        $match: {
          salon_id: salon_id,
          appointment_date: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      // Lookup user details from the User collection
      {
        $lookup: {
          from: "users", // The name of your User collection
          localField: "user_id",
          foreignField: "user_id",
          as: "user_details"
        }
      },
      // Unwind the user_details array (converts array to object)
      {
        $unwind: {
          path: "$user_details",
          preserveNullAndEmptyArrays: true // Keep bookings even if user not found
        }
      },
      // Optionally project only the fields you need
      {
        $project: {
          _id: 1,
          salon_name: 1,
          salon_id: 1,
          services: 1,
          appointment_date: 1,
          scheduled_start_time: 1,
          scheduled_end_time: 1,
          total_price: 1,
          notes: 1,
          total_duration:1,
          status: 1,
          "payment_details.payment_status": 1,
          "payment_details.payment_id":1,
          "user_details.user_id":1,
          "user_details.name": 1,
          "user_details.phone_number": 1,
          "booking_date":1,
          // Add other user fields you need
        }
      }
    ]);
    console.log("Booking=>", bookingsWithUsers)
    return {
      success: true,
      count: bookingsWithUsers.length,
      data: bookingsWithUsers
    };
  } catch (error) {
    console.error("Error in aggregation:", error);
    return { success: false, error: error.message };
  }
};

export const Add_Category_TO_DB = async(name,description,id,salon_id)=>{
  const newCategory = {
    category_id: id,
    name: name,
    description: description
  };
  console.log('new=>',newCategory)
  const updatedSalon = await Salon.findOneAndUpdate(
    { salon_id },
    { $push: { categories: newCategory } },
    { new: true, runValidators: true } 
  );
  return updatedSalon;
}

export const getDashboardData_From_DB = async (owner_id, filter = {}) => {
  try {
    console.log("Getting dashboard data for owner:", owner_id);

    // Fetch salons for the owner
    const salons = await Salon.find({ owner_id });
    console.log("Found salons:", salons.length);

    if (!salons || salons.length === 0) {
      console.log("No salons found");
      return {
        success: false,
        message: "No salons found for this owner",
        data: null
      };
    }

    const salonIds = salons.map(salon => salon.salon_id);
    const salonsWithServices = salons.map((salon) => ({
      salon_id: salon.salon_id,
      name: salon.name,
      services: salon.services.map(service => ({
        name: service.name,
        service_id: service.service_id
      }))
    }));

    // Build date filter based on input
    let dateFilter = {};
    const now = new Date();
    
    if (filter.dateRange) {
      switch (filter.dateRange.toLowerCase()) {
        case 'this week':
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
          startOfWeek.setHours(0, 0, 0, 0);
          dateFilter = { 
            appointment_date: { 
              $gte: startOfWeek,
              $lte: now 
            } 
          };
          break;
        case 'last month':
          const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
          dateFilter = { 
            appointment_date: { 
              $gte: startOfLastMonth,
              $lte: endOfLastMonth 
            } 
          };
          break;
        case 'custom':
          if (filter.startDate && filter.endDate) {
            dateFilter = { 
              appointment_date: { 
                $gte: new Date(filter.startDate),
                $lte: new Date(filter.endDate) 
              } 
            };
          }
          break;
        default: // No filter or unrecognized filter means overall data
          break;
      }
    }

    // Fetch bookings for all salons owned by this owner
    const bookingsQuery = { salon_id: { $in: salonIds } };
    if (Object.keys(dateFilter).length > 0) {
      bookingsQuery.appointment_date = dateFilter.appointment_date;
    }

    const bookings = await Booking.find(bookingsQuery);

    // Calculate dynamic stats
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, booking) => sum + booking.total_price, 0);

    return {
      success: true,
      message: "Dashboard data retrieved successfully",
      data: salonsWithServices,
      stats: [
        {
          title: 'Total Bookings',
          value: totalBookings.toString(),
          change: { direction: 'up', value: '0%', text: 'vs last period' }, // Change calculation can be added later
          type: 'bookings',
          icon: 'CalendarCheck'
        },
        {
          title: 'Total Revenue',
          value: `₹${totalRevenue.toFixed(2)}`,
          change: { direction: 'up', value: '0%', text: 'vs last period' },
          type: 'revenue',
          icon: 'DollarSign'
        }
      ],
      appointments: [], // Empty for now as requested
      stylists: salons.reduce((uniqueStylists, salon) => {
        salon.services.forEach(service => {
          // Assuming stylists might be derived from bookings or another field in the future
        });
        return uniqueStylists;
      }, [])
    };
  } catch (error) {
    console.error("Error in getDashboardData_From_DB:", error);
    return {
      success: false,
      message: error.message || "Failed to retrieve dashboard data",
      data: null
    };
  }
};

export const addNewAppoint_By_Owner_Into_DB = async (newAppointment) => {
  try {
    // Destructure the incoming appointment data
    const {
      customer,
      services, // Array of { name, service_id } objects
      time,
      stylist,
      salon: defaultSalon,
      salon_id,
      date
    } = newAppointment;
    console.log("New appointment===>",newAppointment);
    // Fetch salon details
    const salon = await Salon.findOne({ salon_id });
    if (!salon) {
      throw new Error('Salon not found');
    }

    // Match requested services with salon's services using service_id
    const requestedServiceIds = services.map(s => s.service_id);
    const matchedServices = salon.services.filter(service =>
      requestedServiceIds.includes(service.service_id)
    );

    if (matchedServices.length !== services.length) {
      throw new Error('One or more requested services not found in salon');
    }

    // Calculate total price and duration
    const totalPrice = matchedServices.reduce((sum, service) => sum + parseFloat(service.price), 0);
    const totalDuration = matchedServices.reduce((sum, service) => sum + parseInt(service.duration), 0);

    // Parse appointment date and time
    const appointmentDate = new Date(date);
    const [hours, minutes] = time.split(':');
    appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Convert appointment date to UTC
    const utcAppointmentDate = new Date(appointmentDate.getTime() - (5 * 60 + 30) * 60 * 1000);

    // Calculate end time
    const endTime = new Date(appointmentDate);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);

    // Convert end time to UTC
    const utcEndTime = new Date(endTime.getTime() - (5 * 60 + 30) * 60 * 1000);

    // Format start and end time in IST format for display
    const options = { 
      weekday: 'short', year: 'numeric', month: 'short', day: '2-digit', 
      hour: '2-digit', minute: '2-digit', second: '2-digit', 
      timeZone: 'Asia/Kolkata', timeZoneName: 'longOffset', hour12: false 
    };
    const formattedStartTime = appointmentDate.toLocaleString('en-US', options) + ' (India Standard Time)';
    const formattedEndTime = endTime.toLocaleString('en-US', options) + ' (India Standard Time)';

    // Generate unique IDs
    const generateId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const bookingId = generateId('BOOK');
    const paymentId = generateId('PAY');
    const orderId = generateId('ORD');

    // Format services for Booking schema
    const formattedServices = matchedServices.map(service => ({
      service_id: service.service_id,
      name: service.name,
      price: parseFloat(service.price),
      duration: parseInt(service.duration)
    }));

    // Create new booking document
    const booking = new Booking({
      salon_name: defaultSalon,
      salon_id,
      user_id: customer.name,
      services: formattedServices,
      appointment_date: utcAppointmentDate,
      scheduled_start_time: formattedStartTime,
      scheduled_end_time: formattedEndTime,
      total_price: totalPrice,
      total_duration: totalDuration,
      payment_details: {
        payment_id: paymentId,
        order_id: orderId,
        signature: `${paymentId}_${orderId}_${Date.now()}`,
        payment_status: 'offline'
      },
      status: 'confirmed',
      booking_date: new Date(),
      seat: 1, 
      notes: stylist === 'Any' ? 'Any available stylist' : `Assigned to ${stylist}`,
      buffer_time: 5,
      reminder_sent: false,
      late_notification_sent: false,
      stylist,
      payment_type: 'Offline'
    });

    // Save to database
    const savedBooking = await booking.save();

    return {
      success: true,
      bookingId: savedBooking._id,
      message: 'Appointment created successfully',
      data: savedBooking
    };
  } catch (error) {
    console.error('Error creating appointment:', error);
    return {
      success: false,
      message: error.message || 'Failed to create appointment',
      error: error.stack
    };
  }
};


export const getReports_FROM_DN = async (salonId, days = 90) => {
  try {
    if (!salonId) {
      throw new Error('Salon ID is required');
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Find the salon to verify it exists
    const salon = await Salon.findOne({ salon_id: salonId });
    if (!salon) {
      throw new Error('Salon not found');
    }

    // Get all bookings for this salon within the date range
    const bookings = await Booking.find({
      salon_id: salonId,
      appointment_date: { $gte: startDate, $lte: endDate }
    }).lean();

    if (!bookings.length) {
      return {
        bookings: [],
        overview: {
          totalRevenue: 0,
          totalBookings: 0,
          completionRate: 0,
          avgServiceValue: 0
        },
        revenue: {
          totalRevenue: 0,
          avgTicketValue: 0,
          dailyRevenue: [],
          maxDailyRevenue: 0,
          avgDailyRevenue: 0
        },
        services: {
          servicePerformance: []
        },
        bookingMetrics: {
          total: 0,
          completed: 0,
          cancelled: 0,
          noShow: 0,
          avgDuration: 0
        }
      };
    }

    // Calculate overview metrics
    // Consider bookings with status 'completed' OR bookings with payment_status 'success'/'completed'
    const completedBookings = bookings.filter(b => 
      b.status === 'completed' || 
      b.payment_details?.payment_status === 'success' || 
      b.payment_details?.payment_status === 'completed'
    );
    
    const totalRevenue = completedBookings.reduce((sum, b) => sum + b.total_price, 0);
    const totalBookings = bookings.length;
    const completionRate = totalBookings > 0 ? (completedBookings.length / totalBookings) * 100 : 0;
    const avgServiceValue = completedBookings.length > 0 ? totalRevenue / completedBookings.length : 0;

    // Group bookings by date to calculate daily revenue
    const bookingsByDate = {};
    completedBookings.forEach(booking => {
      const dateStr = booking.appointment_date.toISOString().split('T')[0];
      if (!bookingsByDate[dateStr]) {
        bookingsByDate[dateStr] = [];
      }
      bookingsByDate[dateStr].push(booking);
    });

    // Calculate daily revenue
    const dailyRevenue = Object.keys(bookingsByDate).map(date => {
      const dayRevenue = bookingsByDate[date].reduce((sum, booking) => sum + booking.total_price, 0);
      return { date, revenue: dayRevenue };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate maximum and average daily revenue
    const maxDailyRevenue = dailyRevenue.length > 0 ? 
      Math.max(...dailyRevenue.map(day => day.revenue)) : 0;
    const avgDailyRevenue = dailyRevenue.length > 0 ? 
      totalRevenue / dailyRevenue.length : 0;

    // Calculate service performance
    const servicePerformance = {};
    
    // Iterate through all bookings to collect service data
    bookings.forEach(booking => {
      const isRevenueCountable = 
        booking.status === 'completed' || 
        booking.payment_details?.payment_status === 'success' || 
        booking.payment_details?.payment_status === 'completed';
        
      booking.services.forEach(service => {
        if (!servicePerformance[service.name]) {
          servicePerformance[service.name] = {
            totalBookings: 0,
            revenue: 0,
            totalDuration: 0
          };
        }
        servicePerformance[service.name].totalBookings++;
        
        // Count revenue for completed bookings or those with successful payments
        if (isRevenueCountable) {
          servicePerformance[service.name].revenue += service.price;
        }
        
        servicePerformance[service.name].totalDuration += service.duration;
      });
    });

    // Format service performance for reporting
    const formattedServicePerformance = Object.keys(servicePerformance).map(name => {
      const data = servicePerformance[name];
      return {
        name,
        totalBookings: data.totalBookings,
        revenue: data.revenue,
        avgDuration: data.totalDuration / data.totalBookings
      };
    }).sort((a, b) => b.totalBookings - a.totalBookings);  // Sort by bookings first, then revenue

    // Calculate booking metrics
    const completedCount = bookings.filter(b => b.status === 'completed').length;
    const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;
    const noShowCount = bookings.filter(b => b.status === 'no-show').length;
    const avgDuration = totalBookings > 0 ? 
      bookings.reduce((sum, b) => sum + b.total_duration, 0) / totalBookings : 0;

    // Return comprehensive data needed for all dashboard tabs
    return {
      bookings: bookings,
      overview: {
        totalRevenue,
        totalBookings,
        completionRate,
        avgServiceValue
      },
      revenue: {
        totalRevenue,
        avgTicketValue: avgServiceValue,
        dailyRevenue,
        maxDailyRevenue,
        avgDailyRevenue
      },
      services: {
        servicePerformance: formattedServicePerformance
      },
      bookingMetrics: {
        total: totalBookings,
        completed: completedCount,
        cancelled: cancelledCount,
        noShow: noShowCount,
        avgDuration
      }
    };
  } catch (error) {
    console.error('Error fetching salon reports:', error);
    throw new Error('Failed to fetch salon reports data: ' + error.message);
  }
};

export const getSalonReports = async (req, res) => {
  try {
    const { salonId } = req.params;
    const { timeframe } = req.query;
    
    // Convert timeframe to days
    let days = 90; // Default to 90 days (quarter)
    if (timeframe === 'week') {
      days = 7;
    } else if (timeframe === 'month') {
      days = 30;
    } else if (timeframe === 'custom' && req.query.startDate && req.query.endDate) {
      // Custom date range handling can be added here
      const startDate = new Date(req.query.startDate);
      const endDate = new Date(req.query.endDate);
      days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    }

    const reportData = await getReports(salonId, days);
    res.status(200).json(reportData);
  } catch (error) {
    console.error('Error in getSalonReports:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch salon reports' 
    });
  }
};

export const getReportsWithAggregation = async (salonId, days = 90) => {
  try {
    if (!salonId) {
      throw new Error('Salon ID is required');
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Verify salon exists
    const salon = await Salon.findOne({ salon_id: salonId });
    if (!salon) {
      throw new Error('Salon not found');
    }

    // Fetch all bookings for this range (needed for the frontend to display)
    const bookings = await Booking.find({
      salon_id: salonId,
      appointment_date: { $gte: startDate, $lte: endDate }
    }).lean();

    // Calculate metrics using aggregation pipeline for better performance
    const metrics = await Booking.aggregate([
      // Match bookings for this salon in the date range
      {
        $match: {
          salon_id: salonId,
          appointment_date: { $gte: startDate, $lte: endDate }
        }
      },
      // Group by status to get counts
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [
                { 
                  $or: [
                    { $eq: ["$status", "completed"] },
                    { $eq: ["$payment_details.payment_status", "success"] },
                    { $eq: ["$payment_details.payment_status", "completed"] }
                  ]
                }, 
                "$total_price", 
                0
              ]
            }
          },
          totalDuration: { $sum: "$total_duration" }
        }
      }
    ]);

    // Process metrics results
    let totalBookings = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let noShowCount = 0;
    let totalRevenue = 0;
    let totalDuration = 0;

    metrics.forEach(item => {
      const count = item.count || 0;
      totalBookings += count;

      if (item._id === 'completed') {
        completedCount = count;
      } else if (item._id === 'cancelled') {
        cancelledCount = count;
      } else if (item._id === 'no-show') {
        noShowCount = count;
      }

      // Add up revenue from all status groups (the condition is in the aggregation)
      totalRevenue += item.totalRevenue || 0;
      totalDuration += item.totalDuration || 0;
    });

    // Count paid/completed bookings (for completion rate)
    const paidBookingsCount = await Booking.countDocuments({
      salon_id: salonId,
      appointment_date: { $gte: startDate, $lte: endDate },
      $or: [
        { status: 'completed' },
        { 'payment_details.payment_status': 'success' },
        { 'payment_details.payment_status': 'completed' }
      ]
    });

    // Calculate derived metrics
    const completionRate = totalBookings > 0 ? (paidBookingsCount / totalBookings) * 100 : 0;
    const avgServiceValue = paidBookingsCount > 0 ? totalRevenue / paidBookingsCount : 0;
    const avgDuration = totalBookings > 0 ? totalDuration / totalBookings : 0;

    // Daily revenue calculation using aggregation
    const dailyRevenueAgg = await Booking.aggregate([
      {
        $match: {
          salon_id: salonId,
          appointment_date: { $gte: startDate, $lte: endDate },
          $or: [
            { status: 'completed' },
            { 'payment_details.payment_status': 'success' },
            { 'payment_details.payment_status': 'completed' }
          ]
        }
      },
      {
        $group: {
          _id: { 
            $dateToString: { format: "%Y-%m-%d", date: "$appointment_date" } 
          },
          revenue: { $sum: "$total_price" }
        }
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          revenue: 1
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    // Service performance calculation
    const servicePerformanceAgg = await Booking.aggregate([
      {
        $match: {
          salon_id: salonId,
          appointment_date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $unwind: "$services"
      },
      {
        $group: {
          _id: "$services.name",
          totalBookings: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [
                { 
                  $or: [
                    { $eq: ["$status", "completed"] },
                    { $eq: ["$payment_details.payment_status", "success"] },
                    { $eq: ["$payment_details.payment_status", "completed"] }
                  ]
                },
                "$services.price",
                0
              ]
            }
          },
          totalDuration: { $sum: "$services.duration" }
        }
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          totalBookings: 1,
          revenue: 1,
          avgDuration: { $divide: ["$totalDuration", "$totalBookings"] }
        }
      },
      {
        $sort: { totalBookings: -1 }
      }
    ]);

    // Calculate max and avg daily revenue
    const maxDailyRevenue = dailyRevenueAgg.length > 0 ?
      Math.max(...dailyRevenueAgg.map(day => day.revenue)) : 0;
    
    const avgDailyRevenue = dailyRevenueAgg.length > 0 ?
      totalRevenue / dailyRevenueAgg.length : 0;

    // Return data in the same format as the frontend expects
    return {
      bookings: bookings,
      overview: {
        totalRevenue,
        totalBookings,
        completionRate,
        avgServiceValue
      },
      revenue: {
        totalRevenue,
        avgTicketValue: avgServiceValue,
        dailyRevenue: dailyRevenueAgg,
        maxDailyRevenue,
        avgDailyRevenue
      },
      services: {
        servicePerformance: servicePerformanceAgg
      },
      bookingMetrics: {
        total: totalBookings,
        completed: completedCount,
        cancelled: cancelledCount,
        noShow: noShowCount,
        avgDuration
      }
    };
  } catch (error) {
    console.error('Error fetching salon reports with aggregation:', error);
    throw new Error('Failed to fetch salon reports data: ' + error.message);
  }
};

export const getSalonReportsOptimized = async (req, res) => {
  try {
    const { salonId } = req.params;
    const { timeframe } = req.query;
    
    // Convert timeframe to days
    let days = 90; // Default to 90 days (quarter)
    if (timeframe === 'week') {
      days = 7;
    } else if (timeframe === 'month') {
      days = 30;
    } else if (timeframe === 'custom' && req.query.startDate && req.query.endDate) {
      const startDate = new Date(req.query.startDate);
      const endDate = new Date(req.query.endDate);
      days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    }

    // Use the aggregation-based function for better performance
    const reportData = await getReportsWithAggregation(salonId, days);
    res.status(200).json(reportData);
  } catch (error) {
    console.error('Error in getSalonReportsOptimized:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch salon reports' 
    });
  }
};


export const addStylist_TO_DB = async (salon_id, newStylist) => {
  try {
    return Stylist.findOneAndUpdate(
      { salon_id },
      { $push: { stylists: newStylist } },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Error adding stylist:', error);
  }
};

export const GET_STYLIST_FROM_SALON_ID = async(salon_id)=>{
  return Stylist.find({
    salon_id
  });
}

export const GET_OWNER_SETTINGS = async(owner_id)=>{
  return Owner.find({owner_id})
}

export const GET_FINANCE_REPORT_FROM_DB = async (salon_id) => {
  try {
    if (!salon_id) {
      throw new Error("Salon ID is required");
    }

    // Get the current date
    const now = new Date();
    
    // Calculate start of current month
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Calculate start of previous month
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // Calculate end of previous month
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    // Get completed bookings for the salon with successful payments
    const completedBookings = await Booking.find({
      salon_id: salon_id,
      status: 'confirmed',
      payment_type:"Online",
      //'payment_details.payment_status': 'success'
    });
    
    // Get all bookings for the current month
    const currentMonthBookings = await Booking.find({
      salon_id: salon_id,
      status: 'confirmed',
      payment_type:"Online",
      'payment_details.payment_status': 'completed',
      // appointment_date: { $gte: currentMonthStart, $lte: now }
    });
    
    // Get all bookings for the previous month
    const previousMonthBookings = await Booking.find({
      salon_id: salon_id,
      status: 'confirmed',
      payment_type:"Online",
      'payment_details.payment_status': 'completed',
      //appointment_date: { $gte: previousMonthStart, $lte: previousMonthEnd }
    });
    
    // Get pending bookings (confirmed but not completed)
    const pendingBookings = await Booking.find({
      salon_id: salon_id,
      status: 'confirmed',
      payment_type:"Online",
      appointment_date: { $gte: now }
    }).sort({ appointment_date: 1 }).limit(10);
    
    // Get recent transactions (all types)
    const recentTransactions = await Booking.find({
      salon_id: salon_id,
      payment_type:"Online",
      $or: [
        { status: 'completed' },
        { status: 'confirmed' }
      ]
    }).sort({ booking_date: -1 }).limit(20);
    
    // Calculate financial metrics
    const totalEarnings = completedBookings.reduce((sum, booking) => sum + booking.total_price, 0);
    console.log(completedBookings)
    const currentMonthEarnings = currentMonthBookings.reduce((sum, booking) => sum + booking.total_price, 0);
    
    const previousMonthEarnings = previousMonthBookings.reduce((sum, booking) => sum + booking.total_price, 0);
    
    // Calculate earnings growth rate compared to previous month
    const growthRate = previousMonthEarnings === 0 ? 
      100 : // If previous month was 0, set growth to 100%
      ((currentMonthEarnings - previousMonthEarnings) / previousMonthEarnings) * 100;
    
    // Calculate available for withdrawal (assuming 70% of earnings are available)
    const availableForWithdrawal = Math.floor(totalEarnings * 0.7);
    
    // Get withdrawal history (mockup - in a real scenario you'd have a separate model)
    // This would need to be replaced with actual withdrawal data from your database
    const withdrawalHistory = [
      { id: 1, amount: 0, date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7), status: 'completed' },
      { id: 2, amount: 0, date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14), status: 'completed' },
      { id: 3, amount: 0, date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 21), status: 'completed' },
    ];
    
    // Calculate total withdrawn (mockup - would be from actual withdrawal data)
    const totalWithdrawn = withdrawalHistory.reduce((sum, withdrawal) => sum + withdrawal.amount, 0);
    
    // Format transactions for the UI
    const formattedTransactions = recentTransactions.map(booking => {
      return {
        id: booking._id.toString(),
        type: booking.status === 'confirmed' || booking.status === 'completed' ? 'deposit' : 'pending',
        amount: booking.total_price,
        date: booking.appointment_date.toISOString().split('T')[0],
        description: `${booking.services.map(s => s.name).join(', ')} - ${booking.stylist || 'Staff'}`
      };
    });
    
    // Format pending payments for the UI
    const pendingPayments = pendingBookings.map(booking => {
      return {
        id: booking._id.toString(),
        amount: booking.total_price,
        date: booking.appointment_date.toISOString().split('T')[0],
        description: `${booking.services.map(s => s.name).join(', ')} - ${booking.stylist || 'Staff'}`
      };
    });
    
    // Monthly withdrawal summary data
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    // Sample monthly data (would be from actual data in a real scenario)
    // Last 6 months withdrawals
    const monthlySummary = Array(6).fill(0).map((_, i) => {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return {
        month: monthNames[month.getMonth()],
        year: month.getFullYear(),
        amount: Math.random() * 30000 + 10000 // Random amount between 10k and 40k
      };
    }).reverse();
    
    // Calculate average, maximum and projections
    const withdrawalAmounts = withdrawalHistory.map(w => w.amount);
    const averageWithdrawal = withdrawalAmounts.length > 0 ? 
      withdrawalAmounts.reduce((sum, amount) => sum + amount, 0) / withdrawalAmounts.length : 0;
    const largestWithdrawal = Math.max(...withdrawalAmounts, 0);
    const totalThisMonth = currentMonthBookings.reduce((sum, booking) => sum + booking.total_price, 0) * 0.7;
    const projectedNextMonth = totalThisMonth * (1 + (growthRate / 100));
    
    // Return all the financial data for the UI
    return {
      success: true,
      data: {
        currentBalance: Math.round(totalEarnings - totalWithdrawn),
        availableForWithdrawal: Math.round(availableForWithdrawal),
        totalWithdrawn: Math.round(totalWithdrawn),
        recentTransactions: formattedTransactions,
        pendingPayments: pendingPayments,
        withdrawalHistory: withdrawalHistory,
        monthlySummary: monthlySummary,
        metrics: {
          averageWithdrawal: Math.round(averageWithdrawal),
          largestWithdrawal: Math.round(largestWithdrawal),
          totalThisMonth: Math.round(totalThisMonth),
          projectedNextMonth: Math.round(projectedNextMonth),
          growthRate: growthRate.toFixed(2)
        }
      }
    };
  } catch (error) {
    console.error("Error getting finance report:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// WITHDRAW_AMOUNT_FROM_DB function
export const WITHDRAW_AMOUNT_FROM_DB = async (salon_id, amount, upiId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate inputs
    if (!salon_id || !amount || !upiId) {
      throw new Error('Missing required parameters: salon_id, amount, or upiId');
    }
    if (amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    // Check if salon exists and has sufficient balance
    const salon = await Salon.findOne({ salon_id }).session(session);
    if (!salon) {
      throw new Error('Salon not found');
    }
    if (salon.balance < amount) {
      throw new Error('Insufficient balance for withdrawal');
    }

    // Convert amount to paise (Razorpay requires amount in paise)
    // const amountInPaise = Math.round(amount * 100);

    // Create Razorpay payout
    const payoutData = {
      account_number: 'IPVVfvcYIsVDBK', // Your Razorpay fund account ID
      amount: amount,
      currency: 'INR',
      mode: 'UPI',
      purpose: 'payout',
      fund_account: {
        account_type: 'vpa',
        vpa: {
          address: upiId,
        },
      },
      queue_if_low_balance: true,
      reference_id: `PAYOUT_${salon_id}_${Date.now()}`,
      narration: `Payout to salon ${salon_id}`,
    };
    console.log(payoutData);
    const payoutResponse = await razorpay.orders.create(payoutData);

    // Update salon balance
    salon.balance -= amount;
    await salon.save({ session });

    // Log payout in Payout collection
    const payout = new Payout({
      salon_id,
      amount,
      upi_id: upiId,
      payout_id: payoutResponse.id,
      status: payoutResponse.status === 'processed' ? 'processed' : 'pending',
      razorpay_response: payoutResponse,
    });
    await payout.save({ session });

    // Commit transaction
    await session.commitTransaction();

    return {
      success: true,
      message: 'Payout initiated successfully',
      payout_id: payoutResponse.id,
      status: payoutResponse.status,
    };
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    console.log(error.error)
    throw new Error(`Payout failed: ${error}`);
  } finally {
    session.endSession();
  }
};

export const UPDATE_SERVICES_IN_DB = async (data) => {
  const {
    salon_id,
    service_id,
    service_name,
    service_desc,
    service_price,
    service_duration,
    service_category,
    service_status,
    categoryID,
  } = data;

  // Validate required fields
  if (!salon_id || !service_id) {
    throw new Error("Salon ID and Service ID are required");
  }

  // Prepare update object
  const updateData = {
    $set: {
      "services.$.name": service_name,
      "services.$.description": service_desc,
      "services.$.price": service_price,
      "services.$.duration": service_duration,
      "services.$.category": service_category,
      "services.$.status": service_status,
      "services.$.categoryID": categoryID,
    },
  };

  // Update service in Salon's services array
  
  const updatedSalon = await Salon.findOneAndUpdate(
    { salon_id: salon_id, "services.service_id": service_id },
    updateData,
    {
      new: true,
      runValidators: true,
      projection: { services: { $elemMatch: { service_id } } },
    }
  );

  if (!updatedSalon) {
    throw new Error("Salon or service not found");
  }

  // Find the updated service
  const updatedService = updatedSalon.services.find(
    (service) => service.service_id === service_id
  );

  return {
    success: true,
    message: "Service updated successfully",
    service: updatedService,
  };
};

export const UPDATE_CATEGORY_IN_DB = async (data) => {
  console.log(data);
  const { salon_id, category_id, name, description } = data;
  if (!salon_id || !category_id || !name) {
    throw new Error("Salon ID, Category ID, and Name are required");
  }
  // Prepare update object
  const updateData = {
    $set: {
      "categories.$.name": name,
      "categories.$.description": description || "",
    },
  };
  const updatedSalon = await Salon.findOneAndUpdate(
    { salon_id, "categories.category_id": category_id },
    updateData,
    {
      new: true,
      runValidators: true,
      projection: { categories: { $elemMatch: { category_id } } },
    }
  );

  if (!updatedSalon) {
    throw new Error("Salon or category not found");
  }
  const updatedCategory = updatedSalon.categories.find(
    (category) => category.category_id === category_id
  );
  return {
    success: true,
    message: "Category updated successfully",
    category: updatedCategory,
  };
};

export const DELETE_STYLIST_FROM_DB = async ({ salon_id, id }) => {
  // Validate input
  if (!salon_id || !id) {
    throw new Error("Salon ID and Stylist ID are required");
  }

  // Convert id to ObjectId if necessary
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid Stylist ID format");
  }

  // Update the Stylist document by pulling the stylist with the specified id
  const updatedStylist = await Stylist.findOneAndUpdate(
    { salon_id },
    { $pull: { stylists: { _id: id } } },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedStylist) {
    throw new Error("Salon or stylist not found");
  }

  return {
    success: true,
    message: "Stylist deleted successfully",
    stylist: updatedStylist,
  };
};

export const UPDATE_SALON_IMAGE_IN_DB = async ({ salon_id, urls }) => {
  // Validate input
  console.log(urls);
  if (!salon_id) {
    throw new Error("Salon ID is required");
  }
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    throw new Error("At least one image URL is required");
  }

  // Validate URLs
  const validUrls = urls.filter(url => typeof url === 'string' && url.trim() !== '');
  if (validUrls.length === 0) {
    throw new Error("No valid image URLs provided");
  }

  // Update the Salon document by pushing the new URLs to the images array
  const updatedSalon = await Salon.findOneAndUpdate(
    { salon_id },
    { $addToSet: { images: { $each: validUrls } } },
    {
      new: true,
      runValidators: true,
      projection: { salon_id: 1, images: 1 },
    }
  );

  if (!updatedSalon) {
    throw new Error("Salon not found");
  }

  return {
    success: true,
    message: "Salon images updated successfully",
    salon: {
      salon_id: updatedSalon.salon_id,
      images: updatedSalon.images,
    },
  };
};

export const DELETE_SALON_IMAGE_IN_DB = async ({ salon_id, image_url }) => {
  // Validate input
  console.log(image_url);
  if (!salon_id) {
    throw new Error("Salon ID is required");
  }
  if (!image_url || typeof image_url !== 'string' || image_url.trim() === '') {
    throw new Error("Valid image URL is required");
  }

  // Update the Salon document by pulling the specified image URL
  const updatedSalon = await Salon.findOneAndUpdate(
    { salon_id },
    { $pull: { images: image_url.trim() } },
    {
      new: true,
      runValidators: true,
      projection: { salon_id: 1, images: 1 },
    }
  );

  if (!updatedSalon) {
    throw new Error("Salon not found");
  }

  // Check if the image was actually removed (optional, for better feedback)
  const imageExisted = !updatedSalon.images.includes(image_url.trim());

  return {
    success: true,
    message: imageExisted ? "Image deleted successfully" : "Image not found in salon",
    salon: {
      salon_id: updatedSalon.salon_id,
      images: updatedSalon.images,
    },
  };
};

export const checkOTPEnabledByAdmin = async()=>{
  const adminSettings = await AdminSettings.findOne();
  return adminSettings.isOTPEnabled;
}

export const CREATE_COUPON_IN_DB = async(data)=>{
try{
  const {code, discountPercentage, expirationDate, maxUses, validForFirstTimeUsers} = data;
  const coupon = new Coupon({code, discountPercentage, expirationDate, maxUses, validForFirstTimeUsers});
  await coupon.save();
  return coupon;
}catch(err){
  return err;
}
}