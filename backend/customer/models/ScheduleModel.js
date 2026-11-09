// reviewed schedules model 02/12
var mongoose = require("mongoose");
var validate = require("mongoose-validator");
var Schema = mongoose.Schema;

const ScheduleTimesSchema = new mongoose.Schema({
    active:{
        type:Number,
        enum:[0,1],
        default:1
    },
    start_time:{
        type:String,
        required:true
    },
    end_time:{
        type:String,
        required:true,
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

const ScheduledDaysSchema = new mongoose.Schema({
    day:{
        type:Number,
        required:true
    },
    active:{
        type:Number,
        enum:[0,1],
        default:1
    },
    scheduled_times : [ScheduleTimesSchema],
    created_at: {
        type: String,
        default: Date.now
    },
    updated_at: {
        type: String,
        default: Date.now
    }
});

const ScheduleSchema = new mongoose.Schema({ 
    schedule_type:{
        type: String,
        required:true
    },
    stylist_id:{
        type: Schema.Types.ObjectId, 
        ref: 'service_providers',
        required:true
    },
    active:{
        type:Number,
        enum:[0,1],
        default:1
    },
    week:{
        type:Number,
        required: false
    },
    scheduled_days:[ScheduledDaysSchema],
    created_at: {
        type: String,
        default: Date.now
    },
    updated_at: {
        type: String,
        default: Date.now
    }
});

module.exports = mongoose.model("schedules", ScheduleSchema);
