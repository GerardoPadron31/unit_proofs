//reviewed customer_carts model 28/06
var mongoose = require("mongoose");
var validate = require("mongoose-validator");
var Schema = mongoose.Schema;

function addImageKitUrl(path){
    if(path != ""){
        path = path.includes(process.env.IMAGEKIT_URL) ? path : process.env.IMAGEKIT_URL + path
    }
    return path;
}
const cartItemSchema = new mongoose.Schema({
    service_id:{
        type: Schema.Types.ObjectId,        
        ref: 'services',
        required:true
    },
    title:{
        type:String,
        required:true
    },
    price:{
        type:Number,
        required:true
    },
    regular_price:{
        type:Number,
        required:false,
        default:0,
    },
    sale_price:{
        type:Number,
        required:false,
        default:0,
    },
    is_custom:{
        type: Boolean,
        required: false,
        default: false
    },
    quantity:{
        type:Number,
        required:true
    }    
});

const cartProfileSchema = new mongoose.Schema({
    firstname:{
        type:String,
        required:true
    },
    lastname:{
        type:String,
        required:true
    },
    profile:{
        type:String,
        get:addImageKitUrl,
        default:''
    },
    profile_id:{
        type: Schema.Types.ObjectId,        
        required:true
    },
    user_type:{
        type:String,
        require: true
    },
    cart_items:[cartItemSchema],
    created_at: {
        type: String,
        default: Date.now
    },
    updated_at: {
        type: String,
        default: Date.now
    }

},{
    toJSON: {getters: true},
    toObject: {getters: true},
});

const BillDetailSchema = new mongoose.Schema({
    total_service:{
        type:Number,
        default:0
    },
    service_charges:{
        type:Number,
        default:0
    },
    convenience_fee:{
        type:Number,
        default:0
    },
    discount:{
        type:Number,
        default:0
    },
    voucher_id:{
        type: Schema.Types.ObjectId, 
        ref: 'promo_codes'
    },
    voucher:{
        type:String,
        default:''
    },
    voucher_amount:{
        type:Number,
        default:0
    },
    tax:{
        type:Number,
        default:0
    },
    total_bill:{
        type:Number,
        default:0
    }
});

const CartSchema = new mongoose.Schema({ 
    user_id:{
        type: Schema.Types.ObjectId, 
        ref: 'users',
        required:true
    },
    stylist_id: {
        type: Schema.Types.ObjectId,
        ref: 'service_providers',
        required: false
    },
    location_id:{
        type: Schema.Types.ObjectId,
        required: false
    },
    service_category_id:{
        type: Schema.Types.ObjectId,
        required: false
    },
    stylist_type:{
        type: String,
        required: false
    },
    service_type:{
        type:String,
        enum:["simple-service","custom-service"],
        default:"simple-service"
    },
    cart_profiles:[cartProfileSchema],
    bill_details: BillDetailSchema,
    created_at: {
        type: String,
        default: Date.now
    },
    updated_at: {
        type: String,
        default: Date.now
    }
});

CartSchema.statics.getCartLocationStylistAndCat = function getCartLocationStylistAndCat(cart_id) {
    return this.model("customer_carts").aggregate([
        {$match:{_id:mongoose.Types.ObjectId(cart_id)}},
        {$lookup:{from:'users',localField:'user_id',foreignField:'_id',as:'user'}},
        {$unwind:{path:'$user',preserveNullAndEmptyArrays:true}},

        {$lookup:{from:'service_providers',localField:'stylist_id',foreignField:'_id',as:'stylist'}},
        {$unwind:{path:'$stylist',preserveNullAndEmptyArrays:true}},
        {$lookup:{from:'categories',localField:'service_category_id',foreignField:'_id',as:'category'}},
        {$unwind:{path:'$category',preserveNullAndEmptyArrays:true}},
        {$project:{
                "_id":0,
                "items":{$cond:{if:"$user.addresses",then:
                            {
                                "$filter":{
                                    input:"$user.addresses",
                                    as:"selected_address",
                                    cond:{$eq:["$$selected_address.active",true]}
                                },
                            }, else:[]}},

                "full_name":{$cond:{if:"$stylist.full_name",then:"$stylist.full_name", else: ""}},
                "category_name":{$cond:{if:"$category.name",then:"$category.name", else: ""}}
            }}
    ])
}
module.exports = mongoose.model("customer_carts", CartSchema);
