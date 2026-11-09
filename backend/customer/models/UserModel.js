// reviewed users model 21/04
var mongoose = require("mongoose");
var validate = require("mongoose-validator");
var uniqueValidator = require("mongoose-unique-validator");
var nameValidator = [
  validate({
    validator: "isLength",
    arguments: [5, 50],
    message: "Should be between {ARGS[0]} and {ARGS[1]} characters",
  }),
  validate({
    validator: "isAlpha",
    message: "Should contain a-z A-Z characters only",
  }),
];
var emailValidator = [
  validate({
    validator: "isEmail",
    message: "Entered Email is not valid",
  }),
  validate({
    validator: "normalizeEmail",
  }),
];
// var confirmPasswordValidator = [
//     check('password').exists(),
//     check('confirm_password', 'Confirm password field must have the same value as the password field')
//       .exists()
//       .custom((value, { req }) => value === req.body.password)
//   ];
var passwordValidator = [
  validate({
    validator: "isLength",
    arguments: [5, 20],
    message: "Should be between {ARGS[0]} and {ARGS[1]} characters",
  }),
  validate({
    validator: "isAlphanumeric",
    message: "Should contain alpha-numeric characters only",
  }),
];
var postalCodeValidator = [
  validate({
    validator: "isPostalCode",
    arguments: "any",
    message: "Entered Postal Code is not a valid",
  }),
];
var phoneNumberValidator = [
  validate({
    validator: "isMobilePhone",
    arguments: "any",
    message: "Entered Phone Number is not a valid",
  }),
];
var isAlphaNumericValidator = [
  validate({
    validator: "matches",
    arguments: /^[-\w\s]+$/,
    message: "Should contain alpha-numeric characters only",
  }),
];
function addImageKitUrl(path){
  if(path != ""){
    path = path.includes(process.env.IMAGEKIT_URL) ? path : process.env.IMAGEKIT_URL + path
  }
  return path;
}
const famaliyMemberSchema = new mongoose.Schema({
  firstname: {
    type: String,
    required: true,
  },
  lastname: {
    type: String,
    required: true,
  },
  profile: {
    type: String,
    get:addImageKitUrl,
    default: "",
  },
  dob: {
    type: Date,
    required: true,
  },
  relation: {
    type: String,
    enum: ["daughter", "son", "father", "mother", "wife", "husband"],
    required: true,
  },
  user_type: {
    type: String,
    enum: ["men", "women", "kids", "senior", "undefined"],
  },
  default_profile: {
    type: Boolean,
    default: 0,
  },
  created_at: {
    type: String,
    default: Date.now,
  },
  updated_at: {
    type: String,
    default: Date.now,
  },
},{
  toJSON: {getters: true},
  toObject: {getters: true},

});
const addressSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    default: "",
  },
  address_type: {
    type: String,
    enum:['home','work','other'],
    default: "home",
  },
  lat: {
    type: String,
    required: true,
  },
  lng: {
    type: String,
    required: true,
  },
  location: {
    type: {
      type: String
    },
    coordinates: {
      type: []
    },
  },
  state: {
    type: String,
    default: "",
  },
  state_code: {
    type: String,
    required: true
  },
  country: {
    type: String,
    default: "",
  },
  country_code: {
    type: String,
    default: null,
  },
  city: {
    type: String,
    default: "",
  },
  zip_code: {
    type: String,
    default: "",
  },
  active: {
    type: Boolean,
    default: 0,
  },
  deleted: {
    type: Boolean,
    default: false
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
const BlockStylistSchema = new mongoose.Schema({
  stylist_id: {
    type: mongoose.Schema.ObjectId
  },
  name: {
    type: String
  },
  image: {
    type: String
  },
  block_status: {
    type: String,
    enum: ["inactive", "active"],
    default: "active",
  },
  experience: {
    type: String
  },
});
const userSchema = new mongoose.Schema({
  firstname: {
    type: String,
    required: true,
  },
  lastname: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: emailValidator,
  },
  password: {
    type: String,
    //required: true,
    //  validate:passwordValidator
  },
  profile: {
    type: String,
    get:addImageKitUrl,
    default: "",
  },
  country_code: {
    type: String,
    required: true,
  },
  phone_number: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: false,
    default: null,
  },
  gender: {
    type: String,
    enum: ["men", "women", "other"],
    required: true,
  },
  dob: {
    type: Date,
    default: "",
  },
  preference: {
    type: Array,
    default: ["men","women"],
  },
  default_profile: {
    type: Boolean,
    default: 1,
  },
  user_type: {
    type: String,
    enum: ["men", "women", "kids", "senior", "undefined"],
    required: true
  },
  addresses: [addressSchema],
  family_members: [famaliyMemberSchema],
  number_of_bookings: {
    type: Number,
    default: 0,
  },
  wallet_balance: {
    type: Number,
    default: 0,
  },
  blocked_stylist: [BlockStylistSchema],
  stripe_customer_id: {
    type: String,
    default: null
  },
  status: {
    type: Boolean,
    default: 1 /** inactive - 0 and active -1  */ ,
  },
  deleted: {
    type: Boolean,
    default: false
  },
  devices: {
    type: Array,
    default: [],
  },
  default_refund_method: {
    type: String,
    default: "wallet",
  },
  access_token: {
    type: String,
    default: null,
  },
  /* referral_code: {
    type: {
      type: Number,
      default: 0
    },
    code: {
      type: String,
      default: 0,
      required: true
    },
  }, */
  referral: {
    user_redeem:{
      type: Number,
      default:0
    },
    referrer:[
      {
        user_id:{
          type: mongoose.Schema.Types.ObjectId,
        },
        user_type:{
          type: String,
          enum: ["customer","stylist"],
        },
        voucher_code: {
          type: String
        },
        created_at: {
          type: String,
          default: Date.now,
        }
      }
    ]
  },
  invite_status: {
    type: Object,
  },
  sendbird_id: {
    type: String,
    default: null
  },
  sendbird_token: {
    type: String,
    default: null
  },
  media_record: [{
    reference: {
      type: String
    },
    url: {
      type: String
    },
    created_at: {
      type: String,
      default: Date.now,
    },
  }],
  media_id: {
    type: String,
    required: true,
    unique: true
  },
  created_at: {
    type: String,
    default: Date.now,
  },
  updated_at: {
    type: String,
    default: Date.now,
  },
},{
  toJSON: {getters: true},
  toObject: {getters: true},

});
userSchema.plugin(uniqueValidator);
addressSchema.index({
  location: "2dsphere"
});
module.exports = mongoose.model("users", userSchema);


const User = module.exports = mongoose.model("users", userSchema);
module.exports.addCard = function(data, callback) {
  console.log("Payment option data", data);
  var query = {
    _id: data.userId,
    // "cards.lastd":{ $ne: data.lastd },
    // "cards.type":{ $ne: data.type }
  }
  var update = {
    $addToSet: {
      cards: {
        type: data.type,
        logo: data.logo,
        // userId:data.userId,
        lastd: data.lastd,
        cardId: data.cardId,
        exp_year: data.exp_year,
        exp_month: data.exp_month,
        account_holder_name: data.holder_name,
        zip_code: data.zip_code,
        isDefault: data.isDefault,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }
  }
  // User.updateOne(query,update,callback);
  User.findOneAndUpdate(query, update, {
    fields: {
      cards: 1
    },
    new: true
  }, callback);
}
module.exports.deleteCard = function(data, callback) {
  var query = {
    _id: data.userId,
    "cards._id": data.cardId
  }
  var update = {
    $pull: {
      cards: {
        _id: data.cardId
      }
    }
  }
  User.findOneAndUpdate(query, update, {
    fields: {
      cards: 1
    },
    new: true
  }, callback);
}
module.exports.setDefaultCard = async function(data, callback) {
  let updateData = {
    "cards.$.isDefault": data.isDefault,
  }
  this.findOneAndUpdate({
    "cards._id": data.cardId,
    _id: data.userId
  }, {
    $set: updateData
  }, {
    fields: {
      cards: 1
    },
    new: true
  }, callback);
}
module.exports.unsetDefaultCardsWithUserId = async function(data, callback) {
  let updateData = {
    "cards.$[elem].isDefault": data.isDefault,
  }
  let arrayFilter = {
    "arrayFilters": [{
      "elem.isDefault": true
    }],
  }
  this.updateMany({
    _id: data.userId
  }, {
    $set: updateData
  }, arrayFilter, callback);
}
