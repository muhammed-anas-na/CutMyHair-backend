import mongoose from "mongoose";
import Owner from "../models/ownerModel.js"
import Salon from '../models/salonModel.js'
import formatWorkingHours from "../utils/formatWorkingHours.js";
import Booking from "../models/bookingModel.js";
import UserModel from "moongose/models/user_model.js";

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


// Database function
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

    if (!updatedSalon) {
      throw new Error(`Salon with ID ${salon_id} not found`);
    }

    return updateData;

  } catch (error) {
    console.log('Error updating working hours:', error);
    throw error;
  }
};

export const addService_TO_DB = async(salon_id, name, description, price, duration, category, status) => {
    try {
      // Validate inputs
      if (!salon_id || !name || !price || !duration || !category) {
        throw new Error('Missing required fields for service');
      }
      
      // Create a unique service ID
      const service_id = new mongoose.Types.ObjectId().toString();
      
      // Create the new service object
      const newService = {
        service_id,
        name,
        description: description || '',
        price,
        duration,
        category,
        status: status || 'available',
        created_at: new Date(),
        updated_at: new Date()
      };
      
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


