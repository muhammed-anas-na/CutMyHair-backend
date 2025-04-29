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
    Add_Category_TO_DB,
    getDashboardData_From_DB,
    addNewAppoint_By_Owner_Into_DB,
    getReports_FROM_DN,
    getOwnerProfile_FROM_DB
    
} from "../../repository/ownerRepository.js";
import OTP from '../../models/otpModel.js'

export const sendOTP = async (req, res, next) => {
  try {
    const { phone_number, from } = req.body;

    if (!phone_number) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    if (!['register', 'login'].includes(from)) {
      return res.status(400).json({ success: false, message: 'Invalid operation' });
    }

    const userExists = await findOwnerFromDB_BY_Number(phone_number);

    if (from === 'register' && userExists) {
      return res.status(400).json({ success: false, message: 'Phone number already exists' });
    }
    if (from === 'login' && !userExists) {
      return res.status(400).json({ success: false, message: 'Phone number not registered' });
    }

    // Generate and store OTP using the schema
    const { otpId, otp } = await OTP.generateOTP(phone_number, from);
    
    console.log(`Owner OTP for ${phone_number}: ${otp}`);

    return res.status(200).json({
      success: true,
      message: 'Owner OTP sent successfully',
      data: { 
        otp_id: otpId,
        otp_expiry: 300 // 5 minutes in seconds
      },
    });

  } catch (err) {
    next(err);
  }
};

export const verifyOTP = async (req, res, next) => {
  try {
    console.log(req.body);
    const { name, otp, otp_id, from } = req.body;

    if (!otp || !otp_id || !from) {
      return res.status(400).json({ success: false, message: 'OTP, OTP ID, and operation type are required' });
    }

    if (!['register', 'login'].includes(from)) {
      return res.status(400).json({ success: false, message: 'Invalid operation' });
    }

    // Verify OTP using the schema
    const verification = await OTP.verifyOTP(otp_id, otp);

    if (!verification.success) {
      return res.status(400).json(verification);
    }

    // Check if the purpose matches the request
    if (verification.purpose !== from) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP purpose mismatch' 
      });
    }

    const phone_number = verification.phoneNumber;

    if (from === 'login') {
      const existingOwner = await findOwnerFromDB_BY_Number(phone_number);
      if (!existingOwner) {
        return res.status(401).json({ success: false, message: 'No owner found' });
      }
      
      const token = generateToken(
        { owner_id: existingOwner.owner_id, phone_number },
        existingOwner.role
      );
      
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: { 
          owner_id: existingOwner.owner_id, 
          access_token: token 
        },
      });
    } else if (from === 'register') {
      const existingOwner = await findOwnerFromDB_BY_Number(phone_number);
      if (existingOwner) {
        return res.status(400).json({ 
          success: false, 
          message: 'Phone number already used' 
        });
      }
      
      const response = await addOwnerToDB(name, phone_number);
      const token = generateToken(
        { owner_id: response[0].owner_id, phone_number },
        response[0].role
      );
      
      return res.status(200).json({
        success: true,
        message: 'Owner Registration successful',
        data: { 
          owner_id: response[0].owner_id, 
          access_token: token 
        },
      });
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
            message: "Working Hour Updated",
        });
    }catch(err){
        next(err);
    }
}

export const addService = async (req, res, next) => {
  try {
    const { salon_id, name, description, price, duration, category, status, category_id } = req.body;
    
    // Required fields validation
    if (!salon_id || !name || !price || !duration || !category) {
      return res.status(400).json({
        success: false,
        message: "Required fields: salon_id, name, price, duration, category"
      });
    }
    console.log("Reqbody==>",req.body)
    const response = await addService_TO_DB(salon_id, name, description, price, duration, category, status, category_id);
    
    return res.status(200).json({
      success: true,
      message: "Service Added Successfully",
      data: response
    });
  } catch (err) {
    next(err);
  }
};

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

export const addCategory = async(req,res,next)=>{
  try{
    console.log(req.body);
    const {name, description, category_id, salon_id} = req.body;
    if(!name || !category_id || !salon_id) return res.status(400).json({success:false, message:"All fields Required"})
    const response = await Add_Category_TO_DB(name,description,category_id, salon_id);
  console.log(response);
    return res.status(200).json({
      success:true,
      response
    })
  }catch(err){
    next(err);
  }
}

export const getDashboardData = async(req,res,next)=>{
  try{
    console.log(req.body);
    const {userId} = req.body;
    const response = await getDashboardData_From_DB(userId)
    res.status(200).json(response)
  }catch(err){
    next(err);
  }
}

export const addNewAppoinmentByOwner = async(req,res,next)=>{
  try{
    const response = await addNewAppoint_By_Owner_Into_DB(req.body);
    return res.json(response);;
  }catch(err){
    next(err);
  }
}

export const getReports = async(req,res,next)=>{
  try{
    const {salon_id} = req.body;
    console.log(salon_id);
    const response = await getReports_FROM_DN(salon_id);
    res.status(200).json(response);
  }catch(err){
    next(err);
  }
}

export const getOwnerProfile = async(req,res,next)=>{
  try{
    const {user_id} = req.body;
    const response = await getOwnerProfile_FROM_DB(user_id);
    res.status(200).json(response);
  }catch(err){
    next(err);
  }
}

