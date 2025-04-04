import Booking from "../models/bookingModel.js";
import Salon from "../models/salonModel.js";
import User from "../models/userModel.js";
import UserModel from "../models/userModel.js"
import mongoose from "mongoose";
export const addUserToDB=(
    name, phone_number
)=>{

    return UserModel.insertMany({
        name,
        phone_number,
    })
}

export const updateUserLocationInDB = async (userId, latitude, longitude) => {
    return UserModel.findOneAndUpdate(
        { user_id: userId },
        {
            $set: {
                location: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                },
            },
        },
        { new: true }
    );
};


export const getSalonFeedback_FromDB = async (salon_id) => {
    return Salon.findOne(
        { salon_id },
        {
            salon_id: 1,
            name: 1,
            description: 1,
            location: 1,
            address: 1,
            contact_phone: 1,
            rating: 1,
            images: 1,
            reviews: 1
        }
    );
};

export const getSalonServices_FromDB = async(salon_id)=>{
    return Salon.findOne(
        { salon_id },
        {
            services:1
        }
    );
}

export const findUserFromDB_BY_Number = async(phone_number)=>{
    return UserModel.findOne({
        phone_number
    })
}

export const getNearestSalon_From_DB = async (latitude, longitude, radius = 500, user_id) => {
    try {
      // Parse inputs to ensure they're numbers
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      console.log(latitude, longitude);
      // Enforce a minimum search radius of 1km (1000m)
      const searchRadius = Math.max(parseFloat(radius), 1000);
      
      // Direct MongoDB find with $nearSphere
      const salons = await Salon.find({
        location: {
          $nearSphere: {
            $geometry: {
              type: "Point",
              coordinates: [lng, lat]
            },
            $maxDistance: searchRadius
          }
        },
        status: "active"
      }).lean();
      if (salons.length > 0) {
        // Process and return results
        const userDetails = await User.findOne({user_id})
        return {
          status: 200,
          data: {
            favorites: userDetails?.favorites || [],
            salons: processResults(salons, lat, lng),
            count: salons.length,
            searchRadius: searchRadius / 1000,
            method: "nearSphere"
          }
        };
      }
      
      // If no results, fall back to manual calculation
      const allSalons = await Salon.find({ status: "active" }).lean();
      
      const nearbySalons = allSalons.filter(salon => {
        // Skip salons with invalid location data
        if (!salon.location || 
            !salon.location.coordinates || 
            !Array.isArray(salon.location.coordinates) ||
            salon.location.coordinates.length !== 2) {
          return false;
        }
        
        const salonLng = parseFloat(salon.location.coordinates[0]);
        const salonLat = parseFloat(salon.location.coordinates[1]);
        
        if (isNaN(salonLng) || isNaN(salonLat)) {
          return false;
        }
        
        const distance = calculateDistance(lat, lng, salonLat, salonLng) * 1000;
        salon.distance = distance;
        salon.distanceInKm = Math.round(distance * 10) / 10;
        
        return distance <= searchRadius;
      }).sort((a, b) => a.distance - b.distance);
      
      // Fix any salons with string coordinates
      nearbySalons.forEach(async (salon) => {
        const coords = salon.location.coordinates;
        if (typeof coords[0] === 'string' || typeof coords[1] === 'string') {
          await Salon.updateOne(
            { salon_id: salon.salon_id },
            { 
              $set: { 
                "location.coordinates": [parseFloat(coords[0]), parseFloat(coords[1])]
              }
            }
          );
        }
      });
      
      return {
        status: 200,
        data: {
          favorites:[],
          salons: nearbySalons,
          count: nearbySalons.length,
          searchRadius: searchRadius / 1000,
          method: "manual"
        }
      };
      
    } catch (error) {
      console.error("Error finding nearest salons:", error);
      return {
        status: 500,
        error: "Failed to find nearest salons",
        details: error.message
      };
    }
  };

  export const confirm_booking_on_DB = async (bookingData) => {
    try {
      console.log("Booking Data==>", bookingData);
      if (!bookingData) {
        throw new Error('Booking data is required');
      }
  
      const salon = await Salon.findOne({ salon_id: bookingData.salon_id });
      if (!salon) throw new Error('Salon not found');
  
      // Helper function to extract numeric duration from string like "35 min"
      const extractDuration = (durationStr) => {
        if (typeof durationStr === 'number') return durationStr;
        if (!durationStr) return 0;
        
        const matches = durationStr.toString().match(/(\d+)/);
        return matches && matches[1] ? parseInt(matches[1]) : 0;
      };
  
      // Parse the appointment date
      const appointmentDate = new Date(bookingData.appointment_date);
      
      // Convert time string to Date object in UTC
      const convertTimeToUTC = (timeStr, baseDate) => {
        // Parse the time string which can be in format "9:00 AM" or "08:30"
        let hours, minutes;
        let formattedTimeStr = timeStr;
        
        // Check if the time includes AM/PM
        if (timeStr.includes('AM') || timeStr.includes('PM')) {
          const [timePart, period] = timeStr.split(' ');
          [hours, minutes] = timePart.split(':').map(Number);
          
          if (period === 'PM' && hours < 12) {
            hours += 12;
          } else if (period === 'AM' && hours === 12) {
            hours = 0;
          }
        } else {
          // Handle 24-hour format
          [hours, minutes] = timeStr.split(':').map(Number);
        }
        
        // Create a new date object with the appointment date and specified time
        const dateObj = new Date(baseDate);
        dateObj.setHours(hours, minutes, 0, 0);
        
        return dateObj;
      };
      
      // Handle total duration that might come as "35 min" from frontend
      const totalDuration = extractDuration(bookingData.total_duration);
      
      // Convert start time string to UTC Date object
      const startTimeUTC = convertTimeToUTC(bookingData.scheduled_start_time, appointmentDate);
      
      // Calculate end time as a Date object
      const endTimeUTC = new Date(startTimeUTC);
      endTimeUTC.setMinutes(startTimeUTC.getMinutes() + totalDuration);
  
      const existingBookings = await Booking.find({
        salon_id: bookingData.salon_id,
        appointment_date: appointmentDate,
        status: { $nin: ['cancelled', 'no-show'] },
      });
  
      const formattedBookings = existingBookings.map((b) => ({
        seat: b.seat,
        startTime: b.scheduled_start_time instanceof Date ? b.scheduled_start_time : new Date(b.scheduled_start_time),
        endTime: b.scheduled_end_time instanceof Date ? b.scheduled_end_time : new Date(b.scheduled_end_time),
      }));
  
      // Find available seat
      const findAvailableSeat = (startTime, endTime, seatCapacity, bookings) => {
        for (let seat = 0; seat < seatCapacity; seat++) {
          const hasConflict = bookings.some(booking => {
            if (booking.seat !== seat) return false;
            
            // Check for time overlap
            return !(endTime <= booking.startTime || startTime >= booking.endTime);
          });
          
          if (!hasConflict) return seat;
        }
        return -1; // No available seat
      };
  
      const seat = findAvailableSeat(startTimeUTC, endTimeUTC, salon.number_of_seats || 1, formattedBookings);
      if (seat === -1) throw new Error('No available seats');
  
      // Process services to handle duration formatting and ensure service_id
      const services = bookingData.services.map(service => ({
        service_id: service.service_id || service._id || `service_${Math.random().toString(36).substr(2, 9)}`,
        name: service.name,
        price: Number(service.price),
        duration: extractDuration(service.duration),
      }));
  
      const bookingObject = {
        salon_name: bookingData.salon_name || '',
        salon_id: bookingData.salon_id,
        user_id: bookingData.user_id || '',
        services,
        notes: bookingData.notes || '',
        appointment_date: appointmentDate,
        // Store as Date objects directly
        scheduled_start_time: startTimeUTC,
        scheduled_end_time: endTimeUTC,
        total_price: Number(bookingData.total_price),
        total_duration: totalDuration,
        payment_details: {
          payment_id: bookingData.payment_details.payment_id,
          order_id: bookingData.payment_details.order_id,
          signature: bookingData.payment_details.signature,
          payment_status: 'completed',
        },
        status: bookingData.status || 'confirmed',
        booking_date: new Date(), // Store as proper UTC Date
        seat,
      };
  
      const newBooking = new Booking(bookingObject);
      await newBooking.save();
      console.log('New Booking:', newBooking);
      return newBooking;
  
    } catch (error) {
      console.error('Error confirming booking:', error);
      throw error;
    }
  };


// function findAvailableSeat(startTime, endTime, maxSeats, bookings) {
//   const startMinutes = convertTimeToMinutes(startTime);
//   const endMinutes = convertTimeToMinutes(endTime);

//   for (let seat = 0; seat < maxSeats; seat++) {
//     if (!bookings.some((b) => b.seat === seat && (
//       convertTimeToMinutes(b.startTime) < endMinutes &&
//       convertTimeToMinutes(b.endTime) > startMinutes
//     ))) {
//       return seat;
//     }
//   }
//   return -1; // No seat available
// }

// Convert 12-hour time string to minutes since midnight
const convertTimeToMinutes = (timeStr) => {
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let totalMinutes = hours * 60 + minutes;
  if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60; // Add 12 hours for PM
  if (period === 'AM' && hours === 12) totalMinutes -= 12 * 60; // Midnight adjustment
  return totalMinutes;
};

// Convert minutes to 12-hour IST string
const convertMinutesToTime = (minutes) => {
  const totalHours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = totalHours >= 12 ? 'PM' : 'AM';
  const hour12 = totalHours % 12 || 12;
  return `${hour12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${period}`;
};

// Calculate end time
const calculateEndTime = (startTime, duration) => {
  const startMins = convertTimeToMinutes(startTime);
  const endMins = startMins + duration;
  return convertMinutesToTime(endMins);
};

// Round to next slot
const roundToNextTimeSlot = (timeStr, interval) => {
  const minutes = convertTimeToMinutes(timeStr);
  const nextSlot = Math.ceil(minutes / interval) * interval;
  return convertMinutesToTime(nextSlot);
};

// Check for conflicts
const hasConflict = (startTime, endTime, seat, bookings) => {
  const startMins = convertTimeToMinutes(startTime);
  const endMins = convertTimeToMinutes(endTime);
  return bookings.some(booking => {
    const bookingStart = convertTimeToMinutes(booking.startTime);
    const bookingEnd = convertTimeToMinutes(booking.endTime);
    return booking.seat === seat && startMins < bookingEnd && endMins > bookingStart;
  });
};

// Find available seat
const findAvailableSeat = (startTime, endTime, totalSeats, bookings) => {
  for (let seat = 0; seat < totalSeats; seat++) {
    if (!hasConflict(startTime, endTime, seat, bookings)) return seat;
  }
  return -1;
};

export const getBookings_FROM_DB = async(user_id)=>{
  return Booking.find({user_id});
}

export const getBookingsDetails_FROM_DB = async (booking_id) => {
  try {
    // Validate input
    if (!booking_id) {
      throw new Error('Booking ID is required');
    }

    // Find booking by ID
    const bookingData = await Booking.findById(booking_id);
    if (!bookingData) {
      throw new Error(`Booking with ID ${booking_id} not found`);
    }

    // Find salon data using salon_id from booking
    const salonData = await Salon.findOne({ salon_id: bookingData.salon_id });
    if (!salonData) {
      throw new Error(`Salon with ID ${bookingData.salon_id} not found`);
    }

    // Create a new object with booking data and add salon details
    const enrichedBookingData = {
      ...bookingData.toObject(),
      contact_phone: salonData.contact_phone,
      location: salonData.location,
      location_text: salonData.location_text,
    };

    return enrichedBookingData;

  } catch (error) {
    console.error('Error fetching booking details:', error);
    throw error;
  }
};


//Search for salons in the database
export const search_FROM_DB = async (searchParams = {}) => {
  try {
    const {
      query = '',
      searchType = 'location',
      limit = 20,
      skip = 0,
      userLocation = null
    } = searchParams;

    // Base query object
    let queryObj = {};
    
    // Handle different search types
    if (searchType == 'location' && query) {
      // Search by location text or name
      console.log("Location query")
      queryObj = {
        $or: [
          { location_text: { $regex: query, $options: 'i' } },
          { location_name: { $regex: query, $options: 'i' } },
          { address: { $regex: query, $options: 'i' } },
        ]
      };
    } else if (searchType === 'service' && query) {
      // Search for salons that offer a specific service
      console.log("Service query")
      queryObj = {
        'services.name': { $regex: query, $options: 'i' }
      };
    } else if (query) {
      console.log("Other query")
      // General search across multiple fields
      queryObj = {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { location_text: { $regex: query, $options: 'i' } },
          { location_name: { $regex: query, $options: 'i' } },
          { 'services.name': { $regex: query, $options: 'i' } }
        ]
      };
    }
    
    // If user location is provided, add a geoWithin query to filter by radius
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      const radiusInKm = userLocation.radius || 10;
      const radiusInRadians = radiusInKm / 6371; // Earth's radius in km
      console.log("User have location")
      queryObj = {
        ...queryObj,
        location: {
          $geoWithin: {
            $centerSphere: [
              [userLocation.longitude, userLocation.latitude],
              radiusInRadians
            ]
          }
        }
      };
    }
    
    // Execute query with pagination
    console.log("QUery =>",queryObj);
    const salons = await Salon.find(queryObj)
      .skip(skip)
      .limit(limit);
      
    // Get total count for pagination
    const totalCount = await Salon.countDocuments(queryObj);
    
    // If we have user location, calculate and add distance to each salon
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      const salonsWithDistance = salons.map(salon => {
        const salonDoc = salon.toObject();
        
        // Calculate distance between user and salon (in kilometers)
        if (salonDoc.location && salonDoc.location.coordinates) {
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            salonDoc.location.coordinates[1],
            salonDoc.location.coordinates[0]
          );
          
          return {
            ...salonDoc,
            distance: parseFloat(distance.toFixed(2))
          };
        }
        
        return {
          ...salonDoc,
          distance: null
        };
      });
      
      // Sort by distance (null values at the end)
      salonsWithDistance.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
      
      return {
        salons: salonsWithDistance,
        totalCount,
        page: Math.floor(skip / limit) + 1,
        totalPages: Math.ceil(totalCount / limit)
      };
    }
    
    return {
      salons,
      totalCount,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(totalCount / limit)
    };
  } catch (error) {
    console.error('Error in salon search:', error);
    throw new Error('Failed to search salons');
  }
};
  

export const getAllSalons_From_DB = async()=>{
  return Salon.find();
}

export const AddFavoritesToDB = async(salon_id, user_id) => {
  try {
    // Find the user by user_id
    const user = await User.findOne({ user_id });
    
    // Check if user exists
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if salon is already in favorites
    const isFavorite = user.favorites.some(fav => fav.salon_id === salon_id);
    
    if (isFavorite) {
      // Salon is already in favorites
      return { success: true, message: 'Salon is already in favorites' };
    }
    
    // Add the salon to favorites array
    user.favorites.push({ salon_id });
    
    // Save the updated user document
    await user.save();
    
    return { success: true, message: 'Salon added to favorites' };
  } catch (error) {
    console.error('Error adding salon to favorites:', error);
    return { success: false, message: error.message };
  }
}

export const RemoveFavorites_FROM_DB = async(salon_id, user_id) => {
  try {
    // Find the user by user_id
    const user = await User.findOne({ user_id });
    
    // Check if user exists
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if the salon is in the user's favorites
    const favoriteIndex = user.favorites.findIndex(fav => fav.salon_id === salon_id);
    
    if (favoriteIndex === -1) {
      // Salon is not in favorites
      return { success: false, message: 'Salon not found in favorites' };
    }
    
    // Remove the salon from favorites array
    user.favorites.splice(favoriteIndex, 1);
    
    // Save the updated user document
    await user.save();
    
    return { success: true, message: 'Salon removed from favorites' };
  } catch (error) {
    console.error('Error removing salon from favorites:', error);
    return { success: false, message: error.message };
  }
}

export const getFavorites_FROM_DB = async(user_id) => {
  try {
    // Find the user by user_id
    const user = await User.findOne({ user_id });
    
    // Check if user exists
    if (!user) {
      throw new Error('User not found');
    }
    
    // Get all salon IDs from favorites
    const salonIds = user.favorites.map(fav => fav.salon_id);
    
    // Early return if no favorites
    if (salonIds.length === 0) {
      return { 
        success: true, 
        data: {
          success: true,
          favorites: [],
          salons: [],
          message: 'User has no favorites'
        }
      };
    }
    
    // Find all salons that match the salon_ids in favorites
    const salons = await Salon.find({ salon_id: { $in: salonIds } });
    
    // Return both the favorites array and the salon details
    return { 
      success: true, 
      data: {
        success: true,
        favorites: user.favorites || [],
        salons: salons || [],
        message: 'Favorites retrieved successfully'
      }
    };
  } catch (error) {
    console.error('Error retrieving favorites:', error);
    return { 
      success: false, 
      data: {
        success: false,
        favorites: [],
        salons: [],
        message: error.message
      }
    };
  }
}
  // Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
}
  
  // Process results to include distance
function processResults(salons, userLat, userLng) {
    return salons.map(salon => {
        console.log("Salon=>",salon)
      const salonLng = parseFloat(salon.location.coordinates[0]);
      const salonLat = parseFloat(salon.location.coordinates[1]);
      const distance = calculateDistance(userLat, userLng, salonLat, salonLng)
      
      return {
        ...salon,
        distance,
        distanceInKm: Math.round(distance * 10) / 10
      };
    }).sort((a, b) => a.distance - b.distance);
}
  
  

