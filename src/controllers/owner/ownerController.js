import { endOfDay, startOfDay } from "date-fns";
import { generateToken } from "../../config/jwt.js";
import { 
    addOwnerToDB,
    addSalonToDB,
    getSalonByOwnerID_From_DB,
    getSalonDetailsByID_From_DB,
    findOwnerFromDB_BY_Number,
    UpdateNumberOfSeats_ON_DB,
    updateWorkingHour_ON_DB,
    addService_TO_DB,
    getAppoinmentOf_SALON_FROM_DB,

} from "../../repository/ownerRepository.js";
import Booking from '../../models/bookingModel.js';
import Salon from '../../models/salonModel.js';
    
/**
 * Function to send an OTP
 */
export const sendOTP = async (req, res, next) => {
    try {
      const { phone_number, from } = req.body;
  
      if (!phone_number) {
        return res.status(400).json({ success: false, message: 'Phone number is required' });
      }
  
      const userExists = await findOwnerFromDB_BY_Number(phone_number);
  
      if (from === 'register' && userExists) {
        return res.status(400).json({ success: false, message: 'Phone number already exists' });
      }
      if(from == 'login' && !userExists){
        return res.status(400).json({ success: false, message: 'Phone number not registered' });
      }
  
      // Generate and store OTP
      const otp = Math.floor(1000 + Math.random() * 9000);
      req.session.owner_otp = otp;
      req.session.owner_phone_number = phone_number;
  
      console.log(`Owner OTP for ${phone_number}: ${otp}`);
  
      return res.status(200).json({
        success: true,
        message: 'Owner OTP sent successfully',
        data: { otp_expiry: 300 },
      });
  
    } catch (err) {
      next(err);
    }
  };

/**
 * Function to Verify OTP
 */
export const verifyOTP = async (req, res, next) => {
    try {
      const { name, otp, from } = req.body;
      if (!otp || !from) return res.status(400).json({ success: false, message: 'Invalid fields' });
  
      const storedOTP = req.session.owner_otp;
      const phone_number = req.session.owner_phone_number;
      console.log(storedOTP, phone_number)
      if (!storedOTP || !phone_number) {
        console.log("Not found");
        return res.status(400).json({ success: false, message: 'OTP not found or expired' });
      }

      console.log(storedOTP, otp)
      if (storedOTP == otp) {
        if (from === 'login') {
          const existingOwner = await findOwnerFromDB_BY_Number(phone_number);
          if (existingOwner == null) return res.status(401).json({ success: false, message: 'No owner found' });
          const token = generateToken({ owner_id: existingOwner.owner_id, phone_number }, existingOwner.role);
          console.log(token, existingOwner)
          return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: { owner_id: existingOwner.owner_id, access_token: token },
          });
        } else if (from === 'register') {
            
          const existingOwner = await findOwnerFromDB_BY_Number(phone_number);
          console.log("Registering the user" ,existingOwner);
          if (existingOwner != null) return res.status(400).json({ success: false, message: 'Phone number already used' });
          const response = await addOwnerToDB(name, phone_number);
          const token = generateToken({ owner_id: response[0].owner_id, phone_number }, response[0].role);
          req.session.destroy((err) => {
            if (err) console.error('Error destroying session:', err);
          });
          console.log(token, response[0]);
          return res.status(200).json({
            success: true,
            message: 'Owner Registration successful',
            data: { owner_id: response[0]._id, access_token: token },
          });
        } else {
          return res.status(400).json({ success: false, message: 'Invalid operation' });
        }
      } else {
        return res.status(400).json({ success: false, message: 'Invalid OTP' });
      }
    } catch (err) {
      next(err);
    }
};
  

export const addSalon = async (req, res, next) => {
    if (!req.body) {
        return res.status(400).json({
            success: false,
            message: 'Request body is missing or invalid',
        });
    }

    const {
        owner_id,
        locationName,
        locationText,
        salonName,
        contactNumber,
        address,
        imageUrls = [],
        latitude,
        longitude
    } = req.body;

    // Validate required fields
    if (
        !owner_id ||
        !locationName ||
        !locationText ||
        !salonName ||
        !contactNumber ||
        !address ||
        !latitude ||
        !longitude
    ) {
        return res.status(400).json({
            success: false,
            message: 'All required fields must be provided',
        });
    }

    try {
        const salon = await addSalonToDB({
            owner_id,
            locationName,
            locationText,
            salonName,
            contactNumber,
            address,
            imageUrls,
            latitude,
            longitude
        });

        res.status(201).json({
            success: true,
            message: 'Salon added successfully',
            data: { salon_id: salon.salon_id },
        });
    } catch (error) {
        next(err);
    }
};



export const getSalonByOwnerID = async(req,res)=>{
    const {owner_id,fields} = req.body;
    console.log("Body==>",req.body);
    if(!owner_id) return res.status(400).json({success: false, message:"All fields required"});

    const response = await getSalonByOwnerID_From_DB(owner_id,fields);
    console.log("Res=>",response);

    return res.status(200).json({
        success: true,
        message: "Fetched Salon Details",
        data:response 
    })
}

export const getSalonDetailsByID = async(req,res)=>{
    const {salon_id} = req.body;
    if(!salon_id) return res.status(400).json({success: false, message:"All fields required"});

    const response = await getSalonDetailsByID_From_DB(salon_id);
    console.log(response);

    return res.status(200).json({
        success: true,
        message: "Fetched Salon Details",
        data: response
    })
}

export const updateNumberOfSeats = async(req,res)=>{
    try{
        const {salon_id, seats} = req.body;
        if(!salon_id || !seats) return res.status(400).json({success: false, message: "All fields required"});    
        const response = await UpdateNumberOfSeats_ON_DB(salon_id, seats);
        return res.status(200).json({
            success: true,
            message: "Number of seats updated successfully",
            data: response
        });
    }catch(err){
        next(err);
    }
}

export const updateWorkingHours =async(req,res, next)=>{
    try{
        const {salon_id, workingHour} = req.body;
        console.log(workingHour);
        if(!salon_id || !workingHour) return res.status(400).json({success: false, message: "All fields required"});    
        updateWorkingHour_ON_DB(salon_id, workingHour);
        return res.status(200).json({
            success: true,
            message: "Number of seats updated successfully",
        });
    }catch(err){
        next(err);
    }
}

export const addService = async(req,res,next)=>{
  try{
    const {salon_id,name, description, price, duration, category,status} = req.body;
    if(!salon_id || !name || !description || !price || !duration || !category || !status) return res.status(400).json({success: false, message: "All fields requried"})
    console.log()

    const response = await addService_TO_DB(salon_id,name, description, price, duration, category,status)
    console.log(response);
    return res.status(200).json({
      success: true,
      message: "Service Added Successfully",
      data: response
    })
  }catch(err){
    next(err);
  }
}

export const getAppoinmentsOfSalon = async(req, res, next) => {
  try {
    const { salon_id, date } = req.body;
    
    // Validate salon_id
    if (!salon_id) {
      return res.status(400).json({
        success: false,
        message: 'salon_id is required'
      });
    }
    
    const response = await getAppoinmentOf_SALON_FROM_DB(salon_id, date.date);

    return res.status(200).json({
      success: true,
      data: response
    });
  } catch(err) {
    next(err);
  }
};
