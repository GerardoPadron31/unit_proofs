//reviewed locations model 02/12
var mongoose = require("mongoose");
var validate = require("mongoose-validator");

const LocationSchema = new mongoose.Schema({       
    location_name:{
        type:String,
        required:true,
        unique:true
    },
    country:{
        type:String,
        required:true,           
    },
    state:{
        type:String,
        required:true,
        unique:true
    },
    state_code:{
        type:String,
        required:true,
        unique:true
    },
    lat:{ 
        type: String, 
        default: '',
        required:true  
    },
    lng: { 
        type: String, 
        default: '',
        required:true  
    },
    location:{
        type: { type: String },
        coordinates: { type: []}            
    },
    status:{
        type:Number,
        enum:[0,1],  /** 0= active, 1= inactive */
        default:0
    },
    deleted:{
        type:Number,
        enum:[0,1],  /** 0= not deleted, 1= deleted or trashed */
        default:0
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
LocationSchema.index({location:"2dsphere"})
module.exports = mongoose.model("locations", LocationSchema);
