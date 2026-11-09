// reviewed service_providers model 21/04
var mongoose = require("mongoose");
var validate = require("mongoose-validator");
var Schema = mongoose.Schema;
var uniqueValidator = require('mongoose-unique-validator');
var nameValidator = [
  validate({
    validator: "isLength",
    arguments: [5, 50],
    message: "Should be between {ARGS[0]} and {ARGS[1]} characters"
  }),
  validate({
    validator: "isAlpha",
    message: "Should contain a-z A-Z characters only"
  })
];
var emailValidator = [
  validate({
    validator: "isEmail",
    message: "Entered Email is not valid"
  }),
  validate({
    validator: "normalizeEmail"
  })
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
    message: "Should be between {ARGS[0]} and {ARGS[1]} characters"
  }),
  validate({
    validator: "isAlphanumeric",
    message: "Should contain alpha-numeric characters only"
  })
];
var postalCodeValidator = [
  validate({
    validator: "isPostalCode",
    arguments: "any",
    message: "Entered Postal Code is not a valid"
  })
];
var phoneNumberValidator = [
  validate({
    validator: "isMobilePhone",
    arguments: "any",
    message: "Entered Phone Number is not a valid"
  })
];
var isAlphaNumericValidator = [
  validate({
    validator: "matches",
    arguments: /^[-\w\s]+$/,
    message: "Should contain alpha-numeric characters only"
  })
];
const preferenceSchema = new mongoose.Schema({
  all: {
    type: Number,
    enum: [0, 1],
    default: 1 /* 1- active, 0- incative */
  },
  men: {
    type: Number,
    enum: [0, 1],
    default: 1 /* 1- active, 0- incative  */
  },
  women: {
    type: Number,
    enum: [0, 1],
    default: 1 /* 1- active, 0- incative   */
  },
  kids: {
    type: Number,
    enum: [0, 1],
    default: 1 /* 1- active, 0- incative   */
  },
  senior: {
    type: Number,
    enum: [0, 1],
    default: 1 /* 1- active, 0- incative   */
  }
});
function addImageKitUrl(path){
  if(path != ""){
    path = path.includes(process.env.IMAGEKIT_URL) ? path : process.env.IMAGEKIT_URL + path
  }
  return path;
}
const portfolioImageSchema = new mongoose.Schema({
  image: {
    type: String,
    get:addImageKitUrl,
    default: ''
  },
  isCompleted: {
    type: Boolean,
    default: false
  }
},{
  toJSON: {getters: true},
  toObject: {getters: true},

})
const portfolioVideoSchema = new mongoose.Schema({
  video: {
    type: String,
    get:addImageKitUrl,
    default: ''
  },
  thumbnail: {
    type: String,
    default: ''
  },
  isCompleted: {
    type: Boolean,
    default: false
  }
},{
  toJSON: {getters: true},
  toObject: {getters: true},

})
const Note = new mongoose.Schema({
  text: String,
  createdAt: {
    type: String,
    default: Date.now
  }
});
const Log = new mongoose.Schema({
  action: String,
  createdAt: {
    type: String,
    default: Date.now
  }
})
const serviceProviderSchema = new mongoose.Schema({
  firstname: {
    type: String,
    required: true
  },
  lastname: {
    type: String,
    required: true
  },
  middlename: {
    type: String
  },
  full_name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: emailValidator
  },
  password: {
    type: String,
    required: true,
    //  validate:passwordValidator
  },
  profile: {
    type: String,
    get:addImageKitUrl,
    default: ''
  },
  country_code: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: false,
  },
  phone_number: {
    type: String,
    required: true,
    validate: phoneNumberValidator
  },
  gender: {
    type: String,
    enum: ['men', 'women', 'other'],
    required: true
  },
  player_id: {
    type: String,
    required: false
  },
  tags: {
    type: Array,
    required: false
  },
  otp: {
    type: String,
    required: false
  },
  dob: {
    type: Date,
    default: ''
  },
  wallet: {
    type: Number,
    default: 0
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'categories',
    required: true
  },
  specialization: {
    type: Schema.Types.ObjectId,
    //ref: 'categories.specialization',
    ref: 'specializations',
    required: true
  },
  experience: {
    type: String,
    enum: ['junior', 'senior', 'advanced'],
    required: true
  },
  address: {
    type: String,
    required: true,
    select:false
  },
  status: {
    type: Boolean,
    default: true
  },
  is_signing_completed: {
    type: Boolean,
    default: false
  },
  is_bank_linked: {
    type: Boolean,
    default: false
  },
  is_personalized_completed: {
    type: Boolean,
    default: false
  },
  is_workpreference_complete: {
    type: Boolean,
    default: false
  },
  learn_to_use_app: {
    type: Boolean,
    default: false
  },
  city: {
    type: String,
    default: '',
    select:false
  },
  state: {
    type: String,
    default: '',
    select:false
  },
  zip_code: {
    type: String,
    default: '',
    select:false
  },
  ssn_number: {
    type: String,
    default: '',
    select:false
  },
  cosmetology_license: {
    type: String,
    default: '',
    select:false
  },
  cosmetology_license_image: {
    type: String,
    get:addImageKitUrl,
    default: ''
  },
  driving_license: {
    type: String,
    default: '',
    select:false
  },
  driving_license_image: {
    type: String,
    get:addImageKitUrl,
    default: ''
  },
  contractor: {
    type: Number,
    enum: [0, 1],
    default: 0,
    select:false
  },
  liability_waiver: {
    type: Number,
    enum: [0, 1],
    default: 0,
    select:false
  },
  liability_waiver_image: {
    type: String,
    get:addImageKitUrl,
    default: ''
  },
  privacy_policy: {
    type: Number,
    enum: [0, 1],
    default: 0,
    select:false
  },
  terms_condition: {
    type: Number,
    enum: [0, 1],
    default: 0,
    select:false
  },
  online: {
    type: Number,
    enum: [0, 1],
    /** 0 =  offline, 1= online */
    default: 1
  },
  radius: {
    type: Number,
    default: 5
  },
  order_type: {
    type: Array,
    default: []
  },
  preferences: {
    type: Array,
    default: []
  },
  register_location: {
    type: {
      type: String,
      select:false,
    },
    coordinates: {
      type: [],
      select:false,
    }
  },
  blocked_customer: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
  }],
  /* referral_code: {
    type: Array
  },
  customer_referral_code: {
    type: String,
    required: false,
  },
  stylist_referral_code: {
    type: String,
    required: false,
  }, */
  live_location: {
    type: {
      type: String
    },
    coordinates: {
      type: []
    }
  },
  devices: {
    type: Array,
    default: []
  },
  is_mobile_verified: {
    type: Number,
    enum: [0, 1],
    default: 0
  },
  about: {
    type: String,
    default: ''
  },
  languages: {
    type: Array,
    default: []
  },
  skills: {
    type: Array,
    default: []
  },
  contract: {
    type: String,
    default: ''
  },
  contract_signed: {
    type: Boolean,
    default: false
  },
  is_stylist_onboarding_complete: {
    type: Boolean,
    default: false
  },
  registration_status: {
    type: String,
    enum: ["awaiting", "rejected", "accepted", "hold", "deleted"],
    /** 0-awaiting 1-Rejected 2-Accepted */
    default: "awaiting"
  },
  verificationCount: {
    type: Number                
  },
  verificationFirstRequestedAt: {
    type: String
  },
  verificationLastRequestedAt: {
    type: String                           
  },
  registeredOn: {
    type: String,
    enum: ['iOS', 'Android', 'Website'],
  },
  recruiter: {
    type: Schema.Types.ObjectId,
    ref: 'Recruiter'
  },
  shopify_customer_id:{
    type: Number                  
  },
  noteList: [Note],
  logs: [Log],
  is_first_login: {
    type: Boolean,
    default: 1 /**1-first login 0-not a first login  */
  },
  deleted: {
    type: Boolean,
    default: 0 /** 1 for trash */
  },
  portfolio_images: [portfolioImageSchema],
  portfolio_videos: [portfolioVideoSchema],
  access_token: {
    type: String,
    default: null
  },
  referral: {
    stylist_redeem:{
      type: Number,
      default:0
    },
    referrer:[
      {
        user_id:{
          type: Schema.Types.ObjectId,
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
  active_schedule_type: {
    type: String,
    default: 'basic'
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
serviceProviderSchema.plugin(uniqueValidator);
serviceProviderSchema.index({
  live_location: "2dsphere"
});
serviceProviderSchema.index({
  full_name: "text"
});
module.exports = mongoose.model("service_providers", serviceProviderSchema);
