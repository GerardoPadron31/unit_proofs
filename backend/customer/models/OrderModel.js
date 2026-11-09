// reviewed orders model 12/04
var mongoose = require("mongoose");
var Schema = mongoose.Schema;
const cancel_schema = new mongoose.Schema({
    type:{
        type:String,
        enum:['customer','stylist']
    },

});
const addOnSchema = new mongoose.Schema({
    service_id: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    title: {
      type: String,
      required: false,
    },
    price: {
      type: Number,
      required: false,
    },
    regular_price: {
      type: Number,
      required: false,
      default: 0,
    },
    sale_price: {
      type: Number,
      required: false,
      default: 0,
    },
    quantity: {
      type: Number,
      required: false,
    },
  });
const ordersModel = new mongoose.Schema({
    order_number:{
        type:String,
        default:"HC-" + Date.now
    },
    user_id:{
        type:Schema.ObjectId,
        ref: 'users',
        required: true
    },
    booking_status:{
        type: Number,
        /**  0-Awaiting 1-Accepted 2-Reached Location 3-Started service 4-Order completion 5-Rejected 6-customerCancelled 7-Rescheduled 8-Expired 9-StartScheduleService 10-stylistCancelled */
        enum: [0,1,2,3,4,5,6,7,8,9,10], 
        default:0
    },
    cancellation_fee:{
        type:Number,
        default:null
    },
    cancel_requested_status:{
        type:Number,
        default:null
    },
    cancel_user_type:{
        type:String,
        enum:['customer','stylist','admin', ''],
        default:'',
        required:false
    },
    cancel_reason:{
        type: String,
        default:'',
        required: false
    },
    wallet_used:{
        type: Boolean,
        default:false
    },
    stylist_earnings:{
        type: String,
        default: null       
    },
    platform_fee:{
        type: String,
        default: null
    },
    start_service_otp:{
        type: String,
        default:null
    },
    payment_status:{
        type: Number,
        enum: [0,1,2,3], /** 0-Received 1-Failed 2-Retry Payment 3-Payment Refunded */
        default:0
    },
    direct_order:{
        type:Number,
        enum:[0,1], /** 0-Regular Order 1- Direct Order */
        default:0
    },
    date:{
        type:String,
        default:''
    },
    selected_slot:{
        type:Object,
        default:{},
    },
    stylist_id:{
        type:Schema.ObjectId,
        ref: 'service_providers',
        required:false
    },
    cart:{
        type:Array,
        required:true
    },
    stylist_type:{
        type: String,
        required: false
    },
    active_location:{
        type: Object,
        required:true
    },
    add_ons: [addOnSchema],
    booking_type:{
        type:Number,
        enum: [0,1], /** 0-direct booking 1-scheduled booking */
        default:0,
    },
    order_rejected_by:{
        type: Array,
        default:[]
    },
    reschedule_count: {
        type: Number,
        default: 0,
    },
    retry_count: {
        type: Number,
        default: 0
    },
    bill_details:{
        type:Object,
        required:true,
    },
    wallet_amount_used:{
        type:String,
        required:false,
        default:0
    },
    order_accepted_at:{
        type: String,
        default:''
    },
    reached_location_at:{
        type: String,
        default:''
    },
    started_service_at:{
        type:String,
        default: null
    },
    started_scheduled_service_at: {
        type:String,
        default: null             
    },
    resent_at:{
        type:String,
        default: '',          
    },
    rescheduled_at:{
        type:String,
        default: '',
    },
    completed_at:{
        type: String,
        default: null
    },
    expired_at: {
        type: String,
    },
    started_schedule_at:{
        type: String,
        default:''
    },
    stripe_customer_id:{
        type: String,
        required: false,
        default:''
    },
    charge_id:{
        type: String,
        required: false,
        default:''
    },
    stylist_reviewed:{
        type: Boolean,
        default: false
    },
    customer_reviewed:{
        type: Boolean,
        default: false
    },
    addons_charge_id:{
        type: String,
        required: false,
        default:''
    },
    tip_amount:{
        type: Number,
        default: null
    },
    is_tipped:{
        type: Boolean,
        default: false
    },
    tip_charge_id:{
        type: String,
        default: null
    },
    cancellation_charge_id:{
        type: String,
        default: null
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

module.exports = mongoose.model("orders", ordersModel);

