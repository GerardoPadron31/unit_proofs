//reviewed faqs model 02/12
var mongoose = require("mongoose");
var validate = require("mongoose-validator");

const FaqSchema = new mongoose.Schema({  
        title:{
            type:String,
            required:true
        },
        content:{
            type:String,
            required:true
        },
        section:{
            type:Array,           
            default:[]
        },
        status:{
            type:Number,
            enum:[0,1],
            default:0 /** 0=draft, 1=published */
        },
        disable:{
            type:Number,
            enum:[0,1],
            default:0 /** 0= disabled, 1= enabled */
        },
        assign_for:{
            type:Array,           
            default:[]
        },
        deleted:{
            type:Boolean,
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

module.exports = mongoose.model("faqs", FaqSchema);
