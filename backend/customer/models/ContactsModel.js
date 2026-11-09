//reviewed contacts model 02/12
var mongoose = require("mongoose");
var validate = require("mongoose-validator");
var Schema = mongoose.Schema;
const Contacts = new mongoose.Schema({
    user_id:{
        type: Schema.Types.ObjectId,
        required: true
    },
    type:{
        type:String,
        enum:['stylist','customer'],
        default:'customer'
    },
    name:{
        type:String,
        required:true
    },
    phone_number:{
        type: String,
        required: true
    },
    status:{
        type:Boolean,
        default:1
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

module.exports = mongoose.model("contacts", Contacts);
