// reviewed customer_transactions model 21/04
var mongoose = require("mongoose");
var validate = require("mongoose-validator");
var Schema = mongoose.Schema;
const CustomerTransactions = new mongoose.Schema({
    user_id:{
        type: Schema.Types.ObjectId,
        required: true
    },
    order_id:{
        type: Schema.Types.ObjectId,
        required: false
    },
    amount:{
        type:Number,
        default:0
    },
    message: {
        type:String,
        default:''
    },
    type:{
        type:String,
        enum:["refund","reward","order"],
        default:"refund"
    },
    transaction_type:{
        type:String,
        enum:["addition","deduction"],
        default:"addition"
    },
    entry_type:{
        type:String,
        default:""
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

module.exports = mongoose.model("customer_transactions", CustomerTransactions);
