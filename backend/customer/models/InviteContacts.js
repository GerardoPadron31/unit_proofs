// reviewed invite_contacts model 02/12
var mongoose = require("mongoose");

const InviteContacts = new mongoose.Schema(
  {
    phone_number: {
      type: String,
      unique: true,
      required: true,
    },
    created_at: {
      type: String,
      default: Date.now,
    },
    updated_at: {
      type: String,
      default: Date.now,
    },
  }
);

module.exports = mongoose.model("invite_contacts", InviteContacts);
