// reviewed custom_services model 10/04
var mongoose = require("mongoose");
var validate = require("mongoose-validator");
var Schema = mongoose.Schema;

function addImageKitUrl(path){
    if(path != ""){
        path = path.includes(process.env.IMAGEKIT_URL) ? path : process.env.IMAGEKIT_URL + path
    }
    return path;
}
const videoSchema = new mongoose.Schema({
    video: {
        type: String,
        get:addImageKitUrl,
        default: ''
    },
    thumbnail: {
        type: String,
        default: ''
    },
    created_at: {
        type: String,
        default: Date.now
    },
},{
    toJSON: {getters: true},
    toObject: {getters: true},
})

const imageSchema = new mongoose.Schema({
    image: {
        type: String,
        get:addImageKitUrl,
        default: ''
    },
    created_at: {
        type: String,
        default: Date.now
    },
},{
    toJSON: {getters: true},
    toObject: {getters: true},
})

const CustomServiceSchema = new mongoose.Schema({
    title:{
        type:String,
        required:true,
        //unique:true
    },
    duration: {
        type: Number,
        default: 0,
    },
    description:{
        type:String,
        default:''
    },
    stylist_id:{
        type: Schema.Types.ObjectId, 
        ref: 'service_providers',
        required:true 
    },
    category_id:{
        type: Schema.Types.ObjectId, 
        ref: 'categories',
        required:true 
    },
    regular_price:{
        type:Number,
        default:0
    },
    regular_price_currency: {
        type: String,
        default: 'usd'
    },
    sale_price:{
        type:Number,
        default:0
    },
    sale_price_currency: {
        type: String,
        default: 'usd'
    },
    quantity: {
        type: Number,
        default: 0,
    },
    available_for:{
        type:Array,
        default:[]
    }, 
    images:[imageSchema], 
    videos:[videoSchema], 
    deleted:{
        type:Number,
        enum:[0,1], /** 0 - not deleted, 1 - soft deleted or trashed */
        default:0
    }, 
    disable:{
        type:Number,
        enum:[0,1], /** 0 - not enabled, 1 - disabled */
        default:0
    },   
    approved:{
        type:Number,
        default: 0, /** 0 for pending, 1 for approved, 2 for rejected */
    }, 
    editable:{
        type:Number,
        default:1
    },
    permalink: {
      type: String,
      default: ''
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

module.exports = mongoose.model("custom_services", CustomServiceSchema);

