// reviewed secondary_locations model 02/12
var mongoose = require("mongoose");
var validate = require("mongoose-validator");
var Schema = mongoose.Schema;

const SecondaryLocationSchema = new mongoose.Schema({
    parent_location_id:{
        type: Schema.Types.ObjectId, 
        ref: 'locations',
        required:true 
    },
    location_name:{
        type:String,
        required:true        
    },
    location_type:{
        type:String,
        enum:['input_address','select_location','draw_on_map'],
        required:true
    },
    address_1:{
        type:String,
    },
    address_2:{
        type:String,
    },
    city:{
        type:String,
    },
    zip_code:{
        type:String,
    },
    country:{
        type:String,
    },
    county:{
        type:String,
        default:null
    },
    state:{
        type:String,
        default:null
    },
    input_address:{
        type: String,
        default: null
    },
    radius:{
        type:Number,
        default:5
    },  
    lat: 
    { 
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
SecondaryLocationSchema.index({location:"2dsphere"})
module.exports = mongoose.model("secondary_locations", SecondaryLocationSchema);
