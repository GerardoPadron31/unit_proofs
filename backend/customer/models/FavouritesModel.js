//reviewed favourites model 02/12
var mongoose = require("mongoose");

const FavouriteSchema = new mongoose.Schema({
    user_id:{
        type:mongoose.Types.ObjectId,
        required: true
    },
    service_id:{
        type: mongoose.Types.ObjectId,
        default:''
    },
    stylist_id:{
        type:mongoose.Types.ObjectId,
        default:''
    },
    type:{
        type:Number,
        default:0   // 0-service 1-Custom service
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

module.exports = mongoose.model("favourites", FavouriteSchema);
