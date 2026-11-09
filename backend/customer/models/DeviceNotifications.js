//reviewed device_notifications model 07/09
const mongoose = require("mongoose");

const deviceNotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    default: "",
  },
  type: {
    type: String,
    default: "",
  },
});

module.exports = mongoose.model(
  "device_notifications",
  deviceNotificationSchema
);
