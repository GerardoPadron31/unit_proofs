// reviewed sos_alarms model 02/12
var mongoose = require("mongoose");
var Schema = mongoose.Schema;

const alarmUpdateSchema = new mongoose.Schema({
  timestamp:{
    type: String,
    default: Date.now 
  },
  responsible: {
    type: Schema.Types.ObjectId,
    required: true
  },
  responsible_type: {
    type: String,
    enum: ['stylist', 'admin', 'customer'],
    required: true
  },
  action: {
    type: String,
    enum: ['create', 'update_location', 'cancel'],
    required: true
  },
  data:{
    lat: {type: Number},
    lon: {type: Number},
    accuracy : {type: Number},
  }
});

const SosAlarm = new mongoose.Schema({
  user_id : {
    type: Schema.Types.ObjectId,
    required: true
  },
  type: {
    type: String,
    enum:['stylist', 'customer'],
    //default:'stylist'
    required:true
  },
  alarm_id: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'ACTIVE'
  },
  updates: [alarmUpdateSchema]
});

module.exports = mongoose.model("sos_alarm", SosAlarm);
