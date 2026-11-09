// reviewed ratings model 02/12

var mongoose = require("mongoose");

const RatingModel = new mongoose.Schema({
    user_id: {
        type: mongoose.Types.ObjectId,
        ref: "users",
        required: true,
    },
    stylist_id: {
        type: mongoose.Types.ObjectId,
        ref: "service_providers",
        required: true,
    },
    order_id: {
        type: mongoose.Types.ObjectId,
        ref: "orders",
        required: true,
    },
    reviewed_by: {
        type: String,
        enum: ["stylist", "customer"],
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    value: {
        type: Number, // 1 to 5 *****
        enum: [1, 2, 3, 4, 5],
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
});

module.exports = mongoose.model("ratings", RatingModel);
