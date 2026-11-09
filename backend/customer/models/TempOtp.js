// reviewed temp_otps model 02/12
var mongoose = require("mongoose");
const tempOtp = new mongoose.Schema({       
    phone_number:{
        type:String,
        required:false
    },
    otp:{
        type:String,
        required:false
    },
    created_at: {
        type: String,
        default: Date.now
    },
    updated_at: {
        type: String,
        default: Date.now
    }
});
module.exports = mongoose.model("temp_otp", tempOtp);
