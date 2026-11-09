// reviewed reward_vouchers model 02/12
var mongoose = require("mongoose");
var Schema = mongoose.Schema;

const RewardVouchers = new mongoose.Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    user_type: {
      type: String,
      default: "customer",
    },
    referral_code: {
      type: Array,
    },
    created_at: {
        type: String,
        default: Date.now
    },
    updated_at: {
        type: String,
        default: Date.now
    }
  }
);

module.exports = mongoose.model("reward_vouchers", RewardVouchers);
