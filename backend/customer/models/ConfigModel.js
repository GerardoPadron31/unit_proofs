//reviewed configs model 02/12
let mongoose = require("mongoose");
var Schema = mongoose.Schema;
const scheduleSchema = new mongoose.Schema({
    day:{
        type:Number,
        required:false
    },
    dayName: {
        type: String,
        required: true,
    },
    start_time:{
        type:String,
        required:true
    },
    end_time:{
        type:String,
        required:true,
    },
    disable:{
        type:Boolean,
        default:false,
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

const stripeFeeSchema = new mongoose.Schema({
    fee_fixed: {
        type: Number,
    },
    fee_percent: {
        type: Number,
    },
    country: {
        type: String,
    },
    country_code: {
        type: String,
    },
    currency: {
        type: String,
    },
});

const configGlobal = new mongoose.Schema({
    customer_stylist_radius: {
        type: Number,
        default:0,
        required: false
    },
    stylist_walking_duration: {
        type: Number,
        default: 0,
        required:false
    },
    service_request_limit: {
        type: Number,
        default:0,
        required: false
    },
    booking_reschedule_limit: {
        type: Number,
        default:0,
        required: false
    },
    SD_service_request_expiration_duration: {
        type: Number,
        default:0,
        required: false
    },
    OD_service_request_expiration_duration: {
        type: Number,
        default:0,
        required: false
    },
    servicelist_pending_booking_duration: {
        type: Number, 
        default: 0,
        required: false
    },
    max_retry_limit: {
        type: Number,
        default:0,
        required:  false
    },
    service_request_expiration_duration: {
        type: String,
        default:"",
        required: false
    },
    stylist_earning_withdrawal_threshold:{
        type: Number,
        default:0,
        required: false
    },
    stylist_earning_withdrawal_limit:{
        type: Number,
        default:0,
        required: false
    },
    customer:{
        type:Object,
        default:{}
    },
    stylist:{
        type:Object,
        default:{}
    },
    support_email:{
        type: String,
        default:"",
        required: false
    },
    support_mobile_number:{
        type: String,
        default:"",
        required: false
    },
    schedule:[scheduleSchema],
    processing_details: [stripeFeeSchema],
    holidays: [""],
    platform_commissions: {
        type: Number,
        default: 0,
        required: false
    },
    platform_convenience_fees: {
        type: Number,
        default: 0,
        required: false
    },
    platform_service_tax: {
        type: Number,
        default: 0,
        required: false
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
module.exports = mongoose.model("configs", configGlobal);
