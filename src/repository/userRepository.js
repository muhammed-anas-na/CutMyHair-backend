import Booking from "../models/bookingModel.js";
import Salon from "../models/salonModel.js";
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

export const getNearestSalon_From_DB = async (latitude, longitude, radius = 5000) => {
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
        return {
          status: 200,
          data: {
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
    console.log("Booking Data==>",bookingData);
    if (!bookingData) {
      throw new Error('Booking data is required');
    }

    const salon = await Salon.findOne({ salon_id: bookingData.salon_id });
    if (!salon) throw new Error('Salon not found');

    let startTime = bookingData.scheduled_start_time;
    if (!startTime.includes(' ')) {
      const [hours, minutes] = startTime.split(':').map(Number);
      startTime = convertMinutesToTime(hours * 60 + minutes);
    }
    const endTime = calculateEndTime(startTime, Number(bookingData.total_duration));

    const existingBookings = await Booking.find({
      salon_id: bookingData.salon_id,
      appointment_date: new Date(bookingData.appointment_date).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
      status: { $nin: ['cancelled', 'no-show'] },
    });

    const formattedBookings = existingBookings.map((b) => ({
      seat: b.seat,
      startTime: b.scheduled_start_time,
      endTime: b.scheduled_end_time,
    }));

    const seat = findAvailableSeat(startTime, endTime, salon.number_of_seats, formattedBookings);
    if (seat === -1) throw new Error('No available seats');

    const services = bookingData.services.map(service => ({
      service_id: service.service_id,
      name: service.name,
      price: Number(service.price),
      duration: Number(service.duration),
    }));

    const bookingObject = {
      salon_name: bookingData.salon_name || '',
      salon_id: bookingData.salon_id,
      user_id: bookingData.user_id || '',
      services,
      notes: bookingData.notes || '',
      appointment_date: new Date(new Date(bookingData.appointment_date).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })),
      scheduled_start_time: startTime,
      scheduled_end_time: endTime,
      total_price: Number(bookingData.total_price),
      total_duration: Number(bookingData.total_duration),
      payment_details: {
        payment_id: bookingData.payment_details.payment_id,
        order_id: bookingData.payment_details.order_id,
        signature: bookingData.payment_details.signature,
        payment_status: 'completed',
      },
      status: bookingData.status || 'confirmed',
      booking_date: new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
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

// function convertTimeToMinutes(timeString) {
//   const [hours, minutes] = timeString.split(':').map(Number);
//   return hours * 60 + minutes;
// }

// function convertMinutesToTime(minutes) {
//   const hours = Math.floor(minutes / 60);
//   const mins = minutes % 60;
//   return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
// }

export const getBookings_FROM_DB = async(user_id)=>{
  return Booking.find({user_id});
}

export const getBookingsDetails_FROM_DB = async(booking_id)=>{
  return Booking.findById(booking_id);
}


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
  


// const calculateEndTime = (startTime, durationMinutes) => {
//   const [hours, minutes] = startTime.split(':').map(Number);
  
//   const startDate = new Date();
//   startDate.setHours(hours, minutes, 0, 0);
  
//   const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  
//   const endHours = endDate.getHours();
//   const endMinutes = endDate.getMinutes();
  
//   return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
// };
  
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
  
  

