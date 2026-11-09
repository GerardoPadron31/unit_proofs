const axios = require('axios');
const CategoryModel = require("../models/CategoryModel");
const ServiceModel = require("../models/ServiceModel");
const ServiceProviderModel = require("../models/ServiceProviderModel");
const UserModel = require("../models/UserModel");
const BookingModel = require("../models/OrderModel");
const ConfigModel = require("../models/ConfigModel")
const CartModel = require("../models/CartModel");
const FavouriteModel = require("../models/FavouritesModel")
const ScheduleModel = require("../models/ScheduleModel")
const TransactionModel = require("../models/CustomerTransactionModel")
const LocationModel = require("../models/LocationModel")
const OrderModel = require("../models/OrderModel")
let Faq = require("../models/FaqModel");
const CustomerTransaction = require("../models/CustomerTransactionModel")
const {body, validationResult, query} = require("express-validator");
//helper file to prepare responses.
const apiResponse = require("../helpers/apiResponse");
const utility = require("../helpers/utility");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
const constants = require("../helpers/constant");
var empty = require('is-empty');
const moment = require("moment");
const CustomServiceModel = require('../models/CustomServiceModel');

const { convert } = require('html-to-text');

const stripe = require("stripe")(process.env.STRIPE_KEY);

exports.listCategories = [
    (req, res) => {

        //get current logged in user
        // 	utility.verifyUser(req.headers.authorization.split(' ')[1]).then(auth=>{
        let page = 1;
        if (req.body.page) {
            page = req.body.page;
        }
        let resPerPage = 10;
        let skip = (resPerPage * page) - resPerPage;
        CategoryModel.aggregate([
            {
                $match: {
                    status: true
                }
            },
            {
                $lookup: {
                    from: "sub_categories",
                    localField: "_id",
                    foreignField: "category_id",
                    as: "sub_categories"
                }
            },
            {
                $project: {
                    _id: 1,
                    status: 1,
                    featured_image: {
                        $cond:{
                            if:{$eq:["$featured_image", ""]},
                            then:"",
                            else:{$concat:[constants.IMAGEKIT_URL,"$featured_image"]}
                        }
                    },
                    name: 1,
                    "sub_categories": {
                        $map: {
                            input: "$sub_categories",
                            as: "subcategory",
                            in: {
                                "_id": "$$subcategory._id",
                                "name":"$$subcategory.name",
                                "category_id": "subcategory.category_id",
                                "description": "$$subcategory.description",
                                "permalink": "$$subcategory.permalink",
                                "featured_image": {
                                    $cond:{
                                        if:{$eq:["$$subcategory.featured_image", ""]},
                                        then:"",
                                        else:{$concat:[constants.IMAGEKIT_URL,"$$subcategory.featured_image"]}
                                    }
                                },
                                "section_image": {
                                    $cond:{
                                        if:{$eq:["$$subcategory.section_image", ""]},
                                        then:"",
                                        else:{$concat:[constants.IMAGEKIT_URL,"$$subcategory.section_image"]}
                                    }
                                },
                                "seo_title": "$$subcategory.seo_title",
                                "seo_description": "$$subcategory.seo_description",
                                "index": "$$subcategory.index",
                                "no_index": "$$subcategory.no_index",
                                "follow": "$$subcategory.follow",
                                "no_follow": "$$subcategory.no_follow",
                                "canonical_url": "$$subcategory.canonical_url",
                                "status": "$$subcategory.status",
                                "created_at": "$$subcategory.created_at",
                                "updated_at": "$$subcategory.updated_at",
                                "deleted": "$$subcategory.deleted",
                            },
                        },
                    }
                }
            },
            {$skip: skip},
            {$limit: resPerPage},
            {$sort: {created_at: -1}},
        ], async function (cat_err, categories) {
            if (cat_err) {
                return apiResponse.ErrorResponse(res, cat_err.message, {});
            }

            ServiceProviderModel.countDocuments({online: 1,registration_status: 'accepted', deleted:0}, function (count_err, count) {
                return apiResponse.successResponseWithExtraData(res, "Categories found successfully.", {active_stylist: count}, categories);
            });

        });
        // }).catch(auth_err=>{
        //     console.log('auth_err',auth_err);
        //     return apiResponse.ErrorResponse(res, 'Authorization failed.',{});
        // });
    }
];

exports.listCustomerTransaction = [
    async (req, res) => {
        try {
            const { customerId } = req.params;
            const limit = req.query.limit || 10

            if (!customerId) {
                return apiResponse.ErrorResponse(res, 'customer id is required.', {});
            }

            const userData = await UserModel.findOne({ _id: ObjectId(customerId)}, { stripe_customer_id: 1 }).lean();

            if (!userData) {
                return apiResponse.ErrorResponse(res, "user not found.", {});
            }
            if (!userData.stripe_customer_id) {
                return apiResponse.successResponseWithData(res, 'Fetched!', []);
            }
            
            const customerCharges = await utility.getTodaysCustomerCharge(userData.stripe_customer_id, limit);
            return apiResponse.successResponseWithData(res, "Fetched!", customerCharges);
        } catch (e) {
            return apiResponse.ErrorResponse(res, e.message, []);
        }
    },
];

exports.listService = [
    //body("category_id").exists().notEmpty().trim().withMessage("Category id is required"),
    // body("age_group").exists().notEmpty().trim().withMessage("Age group is required"),
    //body("profile_id").exists().notEmpty().trim().withMessage("Profile id is required"),
    //body("country").exists().notEmpty().trim().withMessage("Country is required"),
    //body("state_code").exists().notEmpty().trim().withMessage("State code is required"),
    async (req, res) => {
        try {
            // Extract the validation errors from a request.
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return apiResponse.validationErrorWithData(res, errors.array()[0]["msg"], errors.array());
            }

            let auth = await utility.verifyUser(req.headers.authorization.split(" ")[1]);
            // todo check if error handling
            const addresses = await UserModel.findOne({_id:ObjectId(auth._id)},{addresses:{$elemMatch:{active:true}}});
            if(!addresses || !addresses.addresses[0]){
              return apiResponse.ErrorResponse(res, "No address could be found in database");
            }
            
            // Perform FindNearbyStylist to get stylist_count in response 
            LogicFindNearbyStylist(
              addresses.addresses[0].location.coordinates[0],
              addresses.addresses[0].location.coordinates[1],
              auth._id
            )
            .then(async nearby_result =>{

                //console.log("-----")
                //console.log(result);
                //console.log("-----")

                // Assign default values if necessary 
                if(req.body.category_id){
                  const categoryData = await CategoryModel.findOne({ status: 1, _id: ObjectId(req.body.category_id) }).lean();

                  if (empty(categoryData)) {
                    return apiResponse.ErrorResponseWithoutData(res, "Invalid Params");
                  }
                }else{
                  const categoryData = await CategoryModel.findOne({status:1, name:'Hair Care'},{_id:1});
                  req.body.category_id = categoryData._id;
                }

                if(!req.body.country || !req.body.state_code){
                  req.body.country = addresses.addresses[0].country;
                  req.body.state_code = addresses.addresses[0].state_code;
                }

               
                var actual_age_group = "";

                let profiles_query = req.body.profile_id ? {_id: ObjectId(req.body.profile_id)} : {default_profile:true};

                const profiles = await UserModel.findOne({_id:ObjectId(auth._id)},{default_profile:1, dob:1, user_type:1, family_members:{$elemMatch:profiles_query}});
                if(!profiles){
                    return apiResponse.ErrorResponse(res, "No profile could be found");
                }

                if(profiles.default_profile || !profiles.family_members[0]){  // Deal as account holder
                  req.body.profile_id = profiles._id;
                  req.body.age_group = undefined;
                  actual_age_group = profiles.user_type;
                }else if(profiles.family_members[0]){
                  req.body.profile_id = req.body.profile_id ? String(req.body.profile_id) : String(profiles.family_members[0]._id);
                  let age = new Date().getFullYear() - profiles.family_members[0].dob.getFullYear();
                  if (age > 18 && age < 65) {
                    
                    if (profiles.family_members[0].relation == "husband" || profiles.family_members[0].relation == "father"){
                      req.body.age_group = "men"
                    } else {
                      req.body.age_group = "women"
                    }
                  } else if (age > 64) {
                    req.body.age_group = "senior"
                  } else {
                    req.body.age_group = "kids"
                  }
                  actual_age_group = req.body.age_group;
                }

                console.log("category", req.body.category_id);
                console.log("country", req.body.country);
                console.log("state_code", req.body.state_code);
                console.log("profile_id", req.body.profile_id);
                console.log("age_group", req.body.age_group);
                console.log("actual_age_group", actual_age_group);

                let page = req.body.page ? parseInt(req.body.page) : 1;
                let limit = req.body.limit ? parseInt(req.body.limit) : 10;
                let skip = limit * page - limit;
                let subcategory_id = req.body.subcategory_id || "all";
                let stylist_level = req.body.stylist_level || "junior";
                let active_country = req.body.country;
                let active_state_code = req.body.state_code;

                let locations = await LocationModel.aggregate([
                    {
                        $match: {
                            deleted: 0,
                            status: 0, // Why status:0??
                            country: active_country,
                            state_code: active_state_code,
                        },
                    },
                ]);

                let location_ids = locations.map((obj) => ObjectId(obj._id));

                let Query = {
                    status: true,
                    deleted: false,
                    disable: false,
                    stylist_type: { $in: [stylist_level] },
                    parent_location: { $in: location_ids },
                    category_id: ObjectId(req.body.category_id),
                };

                if (subcategory_id !== "all") {
                    Query.subcategory_id = ObjectId(req.body.subcategory_id);
                }

                if (req.body.age_group) {
                    Query.age_group = { $in: [req.body.age_group] };
                }

                ServiceModel.aggregate([
                    { $match: Query },
                    {
                        $lookup: {
                            from: "favourites",
                            let: { user_id: ObjectId(auth._id), service_id: "$_id" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: { $and: [{ $eq: ["$$user_id", "$user_id"] }, { $eq: ["$$service_id", "$service_id"] }] },
                                    },
                                },
                            ],
                            as: "is_fav",
                        },
                    },
                    {
                        $addFields: {
                            cart_quantity: 0,
                            service_id: { $toString: "$service_id" },
                        },
                    },
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $project: {
                            _id: 1,
                            duration: 1,
                            category_id: 1,
                            available_for: { $cond: ["$age_group", "$age_group", ""] },
                            stylist_type: 1,
                            description: 1,
                            regular_price: 1,
                            cart_quantity: 1,
                            sale_price: 1,
                            quantity: 1,
                            featured_image: {
                                $cond:{
                                    if:{$eq:["$featured_image", ""]},
                                    then:"",
                                    else:{$concat:[constants.IMAGEKIT_URL,"$featured_image"]}
                                }
                            },
                            section_image: {
                                $cond:{
                                    if:{$eq:["$section_image", ""]},
                                    then:"",
                                    else:{$concat:[constants.IMAGEKIT_URL,"$section_image"]}
                                }
                            },
                            images: {
                                $map: {
                                    input: "$mobile_images",
                                    as: "images",
                                    in: {$concat:[constants.IMAGEKIT_URL,"$$images"]},
                                },
                            },
                            videos: {
                                $map: {
                                    input: "$mobile_videos",
                                    as: "video",
                                    in: {
                                        _id: "$$video._id",
                                        video: { $concat: [constants.IMAGEKIT_URL, "$$video.url"] },
                                        thumbnail: "",
                                    },
                                },
                            },
                            web_images: {
                                $map: {
                                    input: "$web_images",
                                    as: "images",
                                    in: {$concat:[constants.IMAGEKIT_URL,"$$images"]},
                                },
                            },
                            web_videos: {
                                $map: {
                                    input: "$web_videos",
                                    as: "video",
                                    in: {
                                        _id: "$$video._id",
                                        video: { $concat: [constants.IMAGEKIT_URL, "$$video.url"] },
                                    },
                                },
                            },
                            is_fav: { $size: "$is_fav" },
                            title: 1,
                            created_at: 1,
                            status: 1,
                            updated_at: 1
                        },
                    },
                ])
                    .then(async (services) => {
                        var is_cart_used = false;
                        var is_pending_booking = false;
                        var pending_booking_id = "";

                        const config = await ConfigModel.findOne({},{SD_service_request_expiration_duration:1, OD_service_request_expiration_duration:1, servicelist_pending_booking_duration:1});
                        var pending_bookings = await BookingModel.find(
                            {
                              user_id:ObjectId(auth._id), 
                              booking_status:0
                            },
                            {
                              _id:1,
                              date:1, 
                              booking_type:1,
                              /* Compare with account holder instead of family_member wide
                              cart:{
                                $elemMatch:{
                                  profile_id: ObjectId(req.body.profile_id)
                                }
                              }
                              */
                            });

                        pending_bookings.some(booking=>{
                          //console.log(booking);
                          let expr_date = Number(booking.date) 
                            + (
                                ( 
                                 booking.order_type == 1 
                                  ? config.SD_service_request_expiration_duration
                                  : config.OD_service_request_expiration_duration
                                )
                              * 60 * 1000) 
                            + config.servicelist_pending_booking_duration * 60 * 1000;

                          //console.log(Date.now() < expr_date)

                          if(Date.now() < expr_date){
                            is_pending_booking = true;
                            pending_booking_id = String(booking._id);
                          }
                          
                        })

                        // Search in cart model to fullfill is_cart_used value
                            let cartItems = await CartModel.aggregate([
                                { $match: { user_id: ObjectId(auth._id) } },
                                {
                                    $project: {
                                        cart_profiles: {
                                            $filter: {
                                                input: "$cart_profiles",
                                                as: "cart",
                                                cond: { $eq: ["$$cart.profile_id", ObjectId(req.body.profile_id)] },
                                            },
                                        },
                                    },
                                },
                            ]);


                            // cart quantity update in service list
                            if (
                                cartItems.length > 0 &&
                                cartItems[0].cart_profiles.length > 0 &&
                                cartItems[0].cart_profiles[0].cart_items.length > 0
                            ) {
                                is_cart_used = true;
                                for (let i = 0; i < cartItems[0].cart_profiles[0].cart_items.length; i++) {
                                    let index = services
                                        .map((element) => {
                                            return element._id.toString();
                                        })
                                        .indexOf(cartItems[0].cart_profiles[0].cart_items[i].service_id.toString());
                                    if (index > -1) {
                                        services[index].cart_quantity = cartItems[0].cart_profiles[0].cart_items[i].quantity;
                                    }
                                }
                            }

                        await Promise.all(services.map(async (service)=>{
                          service.web_description = service.description;  
                          service.description = convert(service.web_description, {wordwrap:null});
                        }));

                        services.sort((a,b)=>(a.available_for > b.available_for) ? 1 : -1);

                        // Order showing age_group matching first
                        services = services.reduce((i, service)=>{
                          if(service.available_for.includes(actual_age_group)){
                            return [service, ...i];
                          }else{
                            return [...i, service];
                          }
                        }, []);


                        if (!empty(services) && nearby_result.stylist_count > 0) {

                            return apiResponse.successResponseWithExtraData(
                                res,
                                "Fetched!",
                                {
                                    subcategory_id: subcategory_id || "",
                                    sub_categories: "",
                                },
                                {
                                    stylist_count: nearby_result.stylist_count,
                                    online_stylist_count: nearby_result.online_stylist_count,
                                    is_cart_used: is_cart_used,
                                    is_pending_booking: is_pending_booking,
                                    pending_booking_id: pending_booking_id,
                                    result: services,
                                    currentPage: page,
                                }
                            );
                        } else {
                            return apiResponse.successResponseWithExtraData(
                                res,
                                "No records found.",
                                {
                                    subcategory_id: subcategory_id || "",
                                    sub_categories: "",
                                },
                                {
                                    stylist_count: nearby_result.stylist_count,
                                    online_stylist_count: nearby_result.online_stylist_count,
                                    is_cart_used: is_cart_used,
                                    is_pending_booking: is_pending_booking,
                                    pending_booking_id: pending_booking_id,
                                    result: [],
                                    currentPage: page,
                                }
                            );
                        }
                    })
                    .catch((err) => {
                        return apiResponse.ErrorResponse(res, err.message, []);
                    });

            })
            .catch(err =>{
              return apiResponse.ErrorResponse(res, err, {});
            })
        } catch (err) {
            console.log(err);
            return apiResponse.ErrorResponse(res, err.message, []);
        }
    }
];

exports.getStylistServices = [
    body("stylist_id").exists().notEmpty().trim().withMessage("Stylist id is required"),
    body("stylist_level").exists().notEmpty().trim().withMessage("Stylist level is required"),
    //body("profile_id").exists().notEmpty().trim().withMessage("Profile id is required"),
    //body("country").exists().notEmpty().trim().withMessage("Country is required"),
    //body("state_code").exists().notEmpty().trim().withMessage("State code is required"),
    async (req, res) => {
        try {
            // Extract the validation errors from a request.
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
            } else {
                let auth = await utility.verifyUser(req.headers.authorization.split(" ")[1]);

                // Verify non has blocked the other
                const styl_unblocked = await UserModel.findOne(
                    {
                      _id:ObjectId(auth._id),
                      blocked_stylist:
                        {
                          $not:
                            {
                              $elemMatch:
                                {
                                  stylist_id: ObjectId(req.body.stylist_id),
                                  block_status: 'active'
                                }
                            }
                        }
                    });

                const cust_unblocked = await ServiceProviderModel.findOne(
                    {
                      _id:ObjectId(req.body.stylist_id),
                      blocked_customer:
                        {
                          $nin:[ObjectId(auth._id)]
                        }
                    });

                if(!styl_unblocked || !cust_unblocked){
                  return apiResponse.successResponseWithNoData(res, 'Stylist not found');
                }

                let page = req.body.page ? parseInt(req.body.page) : 1;
                const limit = req.body.limit ? parseInt(req.body.limit) : 10;
                let skip = (limit * page) - limit;

                if(!req.body.country || !req.body.state_code){
                  const addresses = await UserModel.findOne({_id:ObjectId(auth._id)},{addresses:{$elemMatch:{active:true}}});
                  if(!addresses || !addresses.addresses[0]){
                    return apiResponse.ErrorResponse(res, "No address could be found in database");
                  }


                  req.body.country = addresses.addresses[0].country;
                  req.body.state_code = addresses.addresses[0].state_code;
                }

                let active_country = req.body.country;
                let active_state_code = req.body.state_code;

                const locations = await LocationModel.aggregate([
                    {
                        $match: {
                            deleted: 0,
                            status: 0, // Why status:0??
                            country: active_country,
                            state_code: active_state_code,
                        },
                    },
                ]);

                let location_ids = locations.map((obj) => {
                    return ObjectId(obj._id);
                });


                // Get age group

                var age_group = "";
                let profiles_query = req.body.profile_id ? {_id: ObjectId(req.body.profile_id)} : {default_profile: true};

                const profiles = await UserModel.findOne({_id:ObjectId(auth._id)},{default_profile:1, dob:1, user_type:1, family_members:{$elemMatch:profiles_query}});
                /*
                const profiles = await UserModel.findOne(
                    {$or:
                      [
                        {_id:req.body.profile_id},
                        {family_members:
                          {$elemMatch:
                            {_id:req.body.profile_id}
                          }
                        }
                      ]
                    },
                    {
                      _id:1, 
                      user_type:1, 
                      family_members:{$elemMatch:{_id:req.body.profile_id}}
                    });
                */
                if(!profiles){
                  return apiResponse.ErrorResponse(res, "No profile could be found");
                }

                if(profiles.default_profile || !profiles.family_members[0]){
                  req.body.profile_id = profiles._id;
                  age_group = profiles.user_type;
                }else{
                  req.body.profile_id = req.body.profile_id ? String(req.body.profile_id) : String(profiles.family_members[0]._id);
                  let age  = new Date().getFullYear() - profiles.family_members[0].dob.getFullYear();
                  if(age > 18 && age < 65){
                    if (profiles.family_members[0].relation == "husband" || profiles.family_members[0].relation == "father"){
                      age_group = "men";
                    }else{
                      age_group = "women";
                    }
                  }else if(age > 64){
                    age_group = "senior";
                  }else{
                    age_group = "kids";
                  }

                }

                console.log(age_group)

                let Query = {
                    status: true,
                    deleted: false,
                    disable: false,
                    stylist_type: { $in: [req.body.stylist_level] },
                    parent_location: { $in: location_ids },
                };

                let user  = await utility.verifyUser(req.headers.authorization.split(' ')[1])
                
                // Custom service and normal service projections matched to have same fields
                const servicesToList = await CustomServiceModel.aggregate([
                    {
                        $match: {
                            stylist_id: ObjectId(req.body.stylist_id),
                            deleted: 0,
                            approved: 1,
                        },
                    },
                    { $lookup: { from: "service_providers", localField: "stylist_id", foreignField: "_id", as: "stylist" } },
                    { $unwind: { path: "$stylist_detail", preserveNullAndEmptyArrays: true } },
                    {
                        $lookup: {
                            from: "favourites",
                            let: { user_id: ObjectId(user._id), service_id: "$_id" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [{ $eq: ["$$user_id", "$user_id"] }, { $eq: ["$$service_id", "$service_id"] }],
                                        },
                                    },
                                },
                            ],
                            as: "is_fav",
                        },
                    },
                    {
                        $addFields: {
                            is_custom_service: true,
                            cart_quantity: 0,
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            duration: 1,
                            category_id: 1,
                            available_for: 1,
                            stylist_type: { $cond: { if: "$stylist.experience", then: "$stylist.experience", else: "null" } },
                            is_custom_service: 1,
                            description: 1,
                            regular_price: 1,   
                            cart_quantity: 1,
                            sale_price: 1,
                            quantity: 1,
                            images: {
                                $map: {
                                    input: "$images",
                                    as: "images",
                                    in: {$concat:[constants.IMAGEKIT_URL,"$$images.image"]},
                                },
                            },
                            featured_image: {
                                $first: {
                                    $map: {
                                        input: "$images",
                                        as: "images",
                                        in: {
                                            $cond:{
                                                if:{$eq:["$$images.image", ""]},
                                                then:"",
                                                else:{$concat:[constants.IMAGEKIT_URL,"$$images.image"]}
                                            }
                                        },
                                    },
                                },
                            },
                            section_image: {
                                $first: {
                                    $map: {
                                        input: "$images",
                                        as: "images",
                                        in: {
                                            $cond:{
                                                if:{$eq:["$$images.image", ""]},
                                                then:"",
                                                else:{$concat:[constants.IMAGEKIT_URL,"$$images.image"]}
                                            }
                                        },
                                    },
                                },
                            },
                            videos: {
                                $map: {
                                    input: "$videos",
                                    as: "video",
                                    in: {
                                        _id: "$$video._id",
                                        video: { $concat: [constants.IMAGEKIT_URL, "$$video.video"] },
                                    },
                                },
                            },
                            regular_price_currency: 1,
                            sale_price_currency: 1,
                            is_fav: { $size: "$is_fav" },
                            title: 1,
                            created_at: 1,
                            status: 1,
                            updated_at: 1,
                        },
                    },
                    {
                        $unionWith: {
                            coll: "services",
                            pipeline: [
                                {
                                    $match: Query,
                                },
                                {
                                    $lookup: {
                                        from: "favourites",
                                        let: { user_id: ObjectId(user._id), service_id: "$_id" },
                                        pipeline: [
                                            {
                                                $match: {
                                                    $expr: {
                                                        $and: [
                                                            { $eq: ["$$user_id", "$user_id"] },
                                                            { $eq: ["$$service_id", "$service_id"] },
                                                        ],
                                                    },
                                                },
                                            },
                                        ],
                                        as: "is_fav",
                                    },
                                },
                                {
                                    $addFields: {
                                        cart_quantity: 0,
                                        service_id: { $toString: "$service_id" },
                                        is_custom_service: false,
                                    },
                                },
                                {
                                    $project: {
                                        _id: 1,
                                        duration: 1,
                                        category_id: 1,
                                        available_for: { $cond: ["$age_group", "$age_group", ""] },
                                        stylist_type: 1,
                                        is_custom_service: 1,
                                        description: 1,
                                        regular_price: 1,
                                        cart_quantity: 1,
                                        sale_price: 1,
                                        quantity: 1,
                                        featured_image:{
                                            $cond:{
                                                if:{$eq:["$featured_image", ""]},
                                                then:"",
                                                else:{$concat:[constants.IMAGEKIT_URL,"$featured_image"]}
                                            }
                                        },
                                        section_image:{
                                            $cond:{
                                                if:{$eq:["$section_image", ""]},
                                                then:"",
                                                else:{$concat:[constants.IMAGEKIT_URL,"$section_image"]}
                                            }
                                        },
                                        images:{
                                            $map: {
                                                input: "$mobile_images",
                                                as: "images",
                                                in: {$concat:[constants.IMAGEKIT_URL,"$$images"]},
                                            },
                                        },
                                        videos: {
                                            $map: {
                                                input: "$mobile_videos",
                                                as: "video",
                                                in: {
                                                    _id: "$$video._id",
                                                    video: { $concat: [constants.IMAGEKIT_URL, "$$video.url"] },
                                                },
                                            },
                                        },
                                        web_images: {
                                            $map: {
                                                input: "$web_images",
                                                as: "images",
                                                in: {$concat:[constants.IMAGEKIT_URL,"$$images"]},
                                            },
                                        },
                                        web_videos: {
                                            $map: {
                                                input: "$web_videos",
                                                as: "video",
                                                in: {
                                                    _id: "$$video._id",
                                                    video: { $concat: [constants.IMAGEKIT_URL, "$$video.url"] },
                                                },
                                            },
                                        },
                                        regular_price_currency: 1,
                                        sale_price_currency: 1,
                                        is_fav: { $size: "$is_fav" },
                                        title: 1,
                                        created_at: 1,
                                        status: 1,
                                        updated_at: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $facet: {
                            result: [{ $skip: skip }, { $limit: limit }],
                            totalCount: [
                                {
                                    $count: "count",
                                },
                            ],
                        },
                    },
                ]);

                 let cartItems = await CartModel.aggregate([
                    { $match: { user_id: ObjectId(user._id) } },
                    {
                        $project: {
                            stylist_id: "$stylist_id",
                            cart_profiles: {
                                $filter: { input: "$cart_profiles", as: "cart", cond: { $eq: ["$$cart.profile_id", ObjectId(req.body.profile_id)] } },
                            },
                        },
                    },
                ]);
       
                // cart quantity updation
                if (cartItems.length > 0 && cartItems[0].cart_profiles.length > 0 
                    && String(cartItems[0].stylist_id) == String(req.body.stylist_id) 
                    && cartItems[0].cart_profiles[0].cart_items.length > 0) {
                    for (let i = 0; i < cartItems[0].cart_profiles[0].cart_items.length; i++) {
                        let index = servicesToList[0].result
                            .map((element) => {
                                return element._id.toString();
                            })
                            .indexOf(cartItems[0].cart_profiles[0].cart_items[i].service_id.toString());
                        if (index > -1) {
                            servicesToList[0].result[index].cart_quantity = cartItems[0].cart_profiles[0].cart_items[i].quantity;
                        }
                    }
                }

                // Split array into services and custom_services
                let all_services = servicesToList[0].result.reduce((i, service)=>{
                    i[service.is_custom_service ? "custom" : "not_custom"].push(service);
                    return i;
                },{custom:[], not_custom:[]});

                all_services.not_custom.sort((a,b)=>(a.available_for > b.available_for) ? 1 : -1);
                all_services.custom.sort((a,b)=>(a.available_for > b.available_for) ? 1 : -1);

                // Order showing age_group matching first
                all_services.custom = all_services.custom.reduce((i, service)=>{
                  if(service.available_for.includes(age_group)){
                    return [service, ...i];
                  }else{
                    return [...i, service];
                  }
                },[]);

                all_services.not_custom = all_services.not_custom.reduce((i, service)=>{
                  if(service.available_for.includes(age_group)){
                    return [service, ...i];
                  }else{
                    return [...i, service];
                  }
                },[])

                servicesToList[0].result = [...all_services.custom, ...all_services.not_custom];


                const data = {
                    result: servicesToList[0].result,
                    currentPage: page,
                    totalPage: Math.ceil(servicesToList[0]?.totalCount[0]?.count / limit || 0),
                };
                return apiResponse.successResponseWithData(res, "Service Fetched!", data);
            }
        } catch (err) {
            console.log(err);
            return apiResponse.ErrorResponse(res, err.message, []);
        }
    }
];

exports.exploreServices = [
    //body("category_id").exists().notEmpty().trim().withMessage("Category id is required"),
    // body("age_group").exists().notEmpty().trim().withMessage("Age group is required"),
    // body("profile_id").exists().notEmpty().trim().withMessage("Profile id is required"),
    async (req, res) => {
        try {
            // Extract the validation errors from a request.
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
            } else {

                let config = await ConfigModel.findOne({},{customer_stylist_radius:1})
                let page = 1;
                if (req.body.page) {
                    page = req.body.page;
                }
                let radius = config && config.customer_stylist_radius?config.customer_stylist_radius:20
                let resPerPage = req.body.limt?parseInt(req.body.limt):10;
                let skip = (resPerPage * page) - resPerPage;
                console.log(parseInt(radius))
                // let auth = await utility.verifyUser(req.headers.authorization.split(' ')[1])
                // console.log(auth);
                if(!req.body.category_id ||req.body.category_id == null || req.body.category_id == ""){
                  const categoryData = await CategoryModel.findOne({status:1, name:'Hair Care'},{_id:1});
                  req.body.category_id = String(categoryData._id);
                }

                CategoryModel.findOne({status: 1, _id: ObjectId(req.body.category_id)}, {
                    _id: 1,
                    sub_categories: 1
                }, async function (cat_err, category) {
                    // console.log(category);
                    if(cat_err) {
                        apiResponse.ErrorResponseWithoutData(res,"Something went wrong!")
                        return;
                    }
                    /* 
                    let locationIds = [];
                    if(req.body.lat && req.body.lng) { // if getting services according to location
                        let locations = await LocationModel.aggregate([
                            {$geoNear:{
                                    near: {
                                        type: "Point",
                                        coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)]
                                    },
                                    key: "location",
                                    distanceField: "distance",
                                    //includeLocs: "dist.location",
                                    maxDistance: parseInt(radius) * 1609.34, //it will return records in 5 mile
                                    // distanceMultiplier: 1 / 1000,
                                    spherical: true
                                }},
                            {$match:
                                    {
                                        deleted:0,
                                        status:0
                                    }
                            }
                        ])
                        locationIds = locations.map(obj=>{
                            return ObjectId(obj._id);
                        })
                    }
                    */

                    let locationIds = await LocationModel.distinct("_id", {state_code:"TX", country:"United States"});

                    let subcategory_id = (req.body.subcategory_id) ? req.body.subcategory_id : 'all';
                    let stylist_level = (req.body.stylist_level) ? req.body.stylist_level : 'junior';
                    //console.log(locationIds);

                    let Query = null;
                    if (subcategory_id == 'all') {
                        Query = {
                            status: true,
                            deleted: false,
                            disable: false,
                            category_id: ObjectId(req.body.category_id),
                            stylist_type: {$in: [stylist_level]},
                            // age_group: {$in: [req.body.age_group]},
                            parent_location: {$in:locationIds}
                        };
                    } else {
                        Query = {
                            status: true,
                            deleted: false,
                            disable: false,
                            category_id: ObjectId(req.body.category_id),
                            subcategory_id: ObjectId(req.body.subcategory_id),
                            stylist_type: {$in: [stylist_level]},
                            // age_group: {$in: [req.body.age_group]},
                            parent_location: {$in:locationIds}
                        };
                    }
                    // if(locationIds.length === 0) {
                    //     delete Query.parent_location;
                    // }
                    console.log(Query)
                    if (category) {
                        ServiceModel.aggregate([
                            {$match:Query},
                            {
                                $lookup:
                                    {from:'ratings',
                                        localField:'_id',
                                        foreignField:"service_id",
                                        as:"ratings"
                                    }
                            },
                            {$addFields:{
                                    cart_quantity:0,
                                    service_id:{$toString:"$service_id"},
                                    is_fav:0,
                                }},
                            {$limit: resPerPage},
                            {$skip: skip},
                            {$project:{
                                    _id: 1,
                                    duration: 1,
                                    available_for: {$cond:["$age_group","$age_group",""]},
                                    stylist_type: 1,
                                    description: 1,
                                    regular_price: 1,
                                    cart_quantity:1,
                                    sale_price: 1,
                                    quantity: 1,
                                    featured_image: {
                                        $cond:{
                                            if:{$eq:["$featured_image", ""]},
                                            then:"",
                                            else:{$concat:[constants.IMAGEKIT_URL,"$featured_image"]}
                                        }
                                    },
                                    section_image: {
                                        $cond:{
                                            if:{$eq:["$section_image", ""]},
                                            then:"",
                                            else:{$concat:[constants.IMAGEKIT_URL,"$section_image"]}
                                        }
                                    },
                                    images: {
                                        $map: {
                                            input: "$mobile_images",
                                            as: "images",
                                            in: {$concat:[constants.IMAGEKIT_URL,"$$images"]},
                                        },
                                    },
                                    videos: {
                                        $map: {
                                            input: "$mobile_videos",
                                            as: "video",
                                            in: {
                                                _id: "$$video._id",
                                                video: { $concat: [constants.IMAGEKIT_URL, "$$video.url"] },
                                                thumbnail: "",
                                            },
                                        },
                                    },
                                    web_images: {
                                        $map: {
                                            input: "$web_images",
                                            as: "images",
                                            in: {$concat:[constants.IMAGEKIT_URL,"$$images"]},
                                        },
                                    },
                                    web_videos: {
                                        $map: {
                                            input: "$web_videos",
                                            as: "video",
                                            in: {
                                                _id: "$$video._id",
                                                video: { $concat: [constants.IMAGEKIT_URL, "$$video.url"] },
                                            },
                                        },
                                    },
                                    "rating_count":{$size:"$ratings"},
                                    "avg_rating":{ $toString: {$cond:[{$size:"$ratings"},{$avg:"$ratings.value"},0]} },
                                    "is_fav":1,
                                    title: 1,
                                    created_at: 1,
                                    status: 1,
                                    updated_at: 1
                                }}
                        ]).then(async services => {
                            if (!empty(services)) {
                                return apiResponse.successResponseWithExtraData(res, "Services found successfully.", {
                                    subcategory_id: subcategory_id,
                                    sub_categories: category.sub_categories
                                }, {result:services});
                            } else {
                                return apiResponse.successResponseWithExtraData(res, "No records found.", {
                                    subcategory_id: subcategory_id,
                                    sub_categories: category.sub_categories
                                }, {result: []});
                            }
                        }).catch(err => {
                            return apiResponse.ErrorResponse(res, err.message, []);
                        })
                    } else {
                        ServiceModel.aggregate([
                            {$match:Query},
                            {$match:{deleted: false,disable: false}},
                            {
                                $lookup:
                                    {from:'ratings',
                                        localField:'_id',
                                        foreignField:"service_id",
                                        as:"ratings"
                                    }
                            },
                            {$addFields:{
                                    cart_quantity:0,
                                    is_fav:0,
                                }},
                            {$limit: resPerPage},
                            {$skip: skip},
                            {$project:{
                                    _id: 1,
                                    duration: 1,
                                    available_for: {$cond:["$age_group","$age_group",""]},
                                    stylist_type: 1,
                                    description: 1,
                                    regular_price: 1,
                                    cart_quantity:1,
                                    sale_price: 1,
                                    quantity: 1,
                                    featured_image: {
                                        $cond:{
                                            if:{$eq:["$featured_image", ""]},
                                            then:"",
                                            else:{$concat:[constants.IMAGEKIT_URL,"$featured_image"]}
                                        }
                                    },
                                    section_image: {
                                        $cond:{
                                            if:{$eq:["$section_image", ""]},
                                            then:"",
                                            else:{$concat:[constants.IMAGEKIT_URL,"$section_image"]}
                                        }
                                    },
                                    images: {
                                        $map: {
                                            input: "$mobile_images",
                                            as: "images",
                                            in: {$concat:[constants.IMAGEKIT_URL,"$$images"]},
                                        },
                                    },
                                    videos: {
                                        $map: {
                                            input: "$mobile_videos",
                                            as: "video",
                                            in: {
                                                _id: "$$video._id",
                                                video: { $concat: [constants.IMAGEKIT_URL, "$$video.url"] },
                                                thumbnail: "",
                                            },
                                        },
                                    },
                                    web_images: {
                                        $map: {
                                            input: "$web_images",
                                            as: "images",
                                            in: {$concat:[constants.IMAGEKIT_URL,"$$images"]},
                                        },
                                    },
                                    web_videos: {
                                        $map: {
                                            input: "$web_videos",
                                            as: "video",
                                            in: {
                                                _id: "$$video._id",
                                                video: { $concat: [constants.IMAGEKIT_URL, "$$video.url"] },
                                            },
                                        },
                                    },
                                    "rating_count":{$size:"$ratings"},
                                    "avg_rating":{ $toString: {$cond:[{$size:"$ratings"},{$avg:"$ratings.value"},0]} },
                                    "is_fav":1,
                                    title: 1,
                                    created_at: 1,
                                    status: 1,
                                    updated_at: 1
                                }}


                        ]).then(async services => {
                            if (!empty(services)) {
                                return apiResponse.successResponseWithExtraData(res, "Services found successfully.", {
                                    subcategory_id: '',
                                    sub_categories: ''
                                }, {result:services});
                            } else {
                                return apiResponse.successResponseWithExtraData(res, "No records found.", {
                                    subcategory_id: '',
                                    sub_categories: ''
                                }, {result:[]});
                            }
                        }).catch(err => {
                            return apiResponse.ErrorResponse(res, err.message, []);
                        })
                        // return apiResponse.ErrorResponseWithExtraData(res, "This category not found", {}, []);
                    }
                });
            }
        } catch (err) {
            console.log(err);
            return apiResponse.ErrorResponse(res, err.message, []);
        }
    }
]

exports.setPreference = async (req, res, next) => {
    try {
        body("user_id").trim().exists().notEmpty().withMessage("User id is required");
        body("preference").isArray().withMessage("Preference is required")
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }
        let user = await UserModel.findOne({_id: req.body.user_id}, {_id: 1})
        if (!user) {
            return apiResponse.ErrorResponseWithoutData(res, 'Record not found!')
        }
        UserModel.updateOne({_id: req.body.user_id}, {preference: req.body.preference}).then(() => {
            UserModel.findOne({_id: req.body.user_id}, {preference: 1, _id: 0}).then(data => {
                return apiResponse.successResponseWithData(res, 'Record updated!', data)
            }).catch(err => {
                return apiResponse.ErrorResponseWithoutData(res, err.message)
            })
        }).catch(err => {
            return apiResponse.ErrorResponseWithoutData(res, err.message)
        })
    } catch (e) {
        return apiResponse.ErrorResponse(res, e.message, []);
    }
}
exports.searchStylist = [

    (req, res) => {
        try {
            utility.verifyUser(req.headers.authorization.split(' ')[1]).then(auth => {
                UserModel.findOne({_id: ObjectId(auth._id), 'addresses.active': 1}, async function (user_err, user) {
                    if (user_err) {
                        return apiResponse.ErrorResponse(res, user_err.message, {});
                    }

                    if (user != null) {
                        let config = await ConfigModel.findOne({},{customer_stylist_radius:1, stylist_walking_duration:1})
                        let radius = config && config.customer_stylist_radius?config.customer_stylist_radius:20
                        let page = 1;
                        let search = '';
                        if (req.body.page) {
                            page = req.body.page;
                        }
                        let resPerPage = req.body.limit ? parseInt(req.body.limit) : 10;
                        let skip = (resPerPage * page) - resPerPage;
                        search = (req.body.search) ? req.body.search : '';
                        let genderFilter = req.body.gender_filter?req.body.gender_filter.split(','):undefined;
                        let ratingFilter = req.body.rating_filter?parseInt(req.body.rating_filter):0;
                        let nameFilter = req.body.name_filter?req.body.name_filter:undefined;
                        let sort = req.body.sort?req.body.sort:"avg_rating";
                        let sortingObj ={}
                        let genderMatchingObj ={}
                        let ratingMatchingObj ={}
                        let nameMatchObj = {}
                        //Sorting
                        if(sort == "avg_rating"){
                            sortingObj= {$sort:{"avg_rating":-1}};
                        }else if(sort == "most_preferred"){
                            sortingObj= {$sort:{"stylist_fav_count":-1}};
                        }else if(sort == "completed_services"){
                            sortingObj= {$sort:{"completed_order_count":-1}};
                        }else{
                            sortingObj= {$sort:{"avg_rating":-1}};
                        }
                        // gender Filter

                        if(genderFilter){
                            genderMatchingObj = {$match:{gender:{$in:genderFilter}}}
                        }else{
                            genderMatchingObj = {$match:{gender:{$in:['men','women']}}}
                        }

                        // rating Filter
                        if(ratingFilter === 0 ) {
                            ratingMatchingObj = {$match:{avg_rating:{$gte:0}}}
                        }else{
                            ratingMatchingObj = {$match:{avg_rating:{$gte:ratingFilter}}}
                        }

                        // Name Filter
                        if(nameFilter){
                            nameMatchObj = {$match:{full_name:{$regex:nameFilter,$options:"i"}}}
                        }else{
                            nameMatchObj = {$match:{online:1}}
                        }
                        _active_adress = user.addresses.find(function (elem) {
                            if (elem.active == 1) {
                                return elem;
                            }
                        });

                        _blocked_stylists = user.blocked_stylist.filter(elem => elem.block_status == "active").map(elem => elem.stylist_id);

                        if (_active_adress) {
                            
                            const gender = [];
                            let preference = typeof user.preference.length!=="undefined" && user.preference.length > 0 ? user.preference : [];
                            if(preference.length > 0){
                                for (let i = 0; i < preference.length; i++) {
                                    const genderValue = preference[i];
                                    gender.push(genderValue)
                                }
                            } else {
                                gender.push("men", "women")
                            }

                            //console.log(_active_adress.lng,_active_adress.lat)
                            let stylist_level = (req.body.stylist_type) ? (req.body.stylist_type) : 'senior';
                            let stylistObj = {};

                            if (stylist_level) {
                              stylistObj = {
                                $match: {
                                  experience: stylist_level,
                                }
                              };
                            }

                            let QueryOnline = [];
                            let QueryOffline = [];

                            QueryOffline.push({
                                $geoNear:
                                    {
                                        near: {
                                            type: "Point",
                                            coordinates: [parseFloat(_active_adress.lng), parseFloat(_active_adress.lat)]
                                        },
                                        key: "register_location",
                                        //key: {$cond:[{$eq : ["$online",0]},"register_location", "live_location"]},
                                        query: {
                                          registration_status: "accepted",
                                          deleted: false,
                                          status: true,
                                          online:0
                                        },
                                        distanceField: "customer_distance",
                                        //includeLocs: "dist.location",
                                        maxDistance: config.customer_stylist_radius * constants.METERS_PER_MILE, //it will return records in 5 mile
                                        distanceMultiplier: constants.MILES_PER_METER,
                                        spherical: true
                                    }
                            });
                            
                            QueryOnline.push({
                                $geoNear:
                                    {
                                        near: {
                                            type: "Point",
                                            coordinates: [parseFloat(_active_adress.lng), parseFloat(_active_adress.lat)]
                                        },
                                        key: "live_location",
                                        query: {
                                          registration_status: "accepted",
                                          deleted: false,
                                          status: true,
                                          online:1
                                        },
                                        distanceField: "customer_distance",
                                        //includeLocs: "dist.location",
                                        maxDistance: config.customer_stylist_radius * constants.METERS_PER_MILE, //it will return records in 5 mile
                                        distanceMultiplier: constants.MILES_PER_METER,
                                        spherical: true
                                    }
                            });
                            
                            
                            if (search && search!='') {
                                var QueryText = {
                                    $match: {
                                        full_name: {
                                            /* "^"+search+".*"*/
                                            $regex: search + ".*$",
                                            $options: "i"
                                        }
                                    }
                                };
                                QueryOnline.push(QueryText);
                                QueryOffline.push(QueryText);
                            }

                            var QueryConditions = [{
                              // Check if stylist walking distance reach customer
                              $match:
                                {
                                  $expr: 
                                    {
                                      $lte:["$customer_distance", "$radius"]
                                    }
                                }
                            },

                            // Check if any of the possible stylists is blocked by the customer
                            {
                              $match:
                                {
                                  "_id" : {$nin : _blocked_stylists }
                                }
                            },

                            // Check if this customer is blocked by any of the possible stylists
                            {
                              $match: 
                                {
                                  $expr:
                                    {
                                      $not:
                                        {
                                          $in: [ObjectId(user._id), "$blocked_customer"]
                                        }
                                    }
                                } 
                            },
                            {
                                $lookup:
                                    {
                                       from:"ratings",
                                       localField:"_id",
                                       foreignField:"stylist_id",
                                       pipeline:[
                                        {
                                          $match:{
                                            $expr:{
                                              $eq: ["$reviewed_by", "customer"]
                                            }
                                          }
                                        }
                                       ],
                                       as:"ratings"
                                    }
                            },
                            {
                                $lookup:{
                                    from:'orders',
                                        localField:'_id',
                                        foreignField:"stylist_id",
                                        as:"orders"
                                }
                            },
                            {
                                $lookup:{
                                    from:'favourites',
                                        localField:'_id',
                                        foreignField:"stylist_id",
                                        as:"favs"
                                }
                            },
                            {
                                $addFields:{
                                    "completed_orders":{
                                        $filter:{
                                            input:"$orders",
                                            as:"order",
                                            cond:{$eq:["$$order.booking_status",4]}
                                        }
                                    }
                                }
                            },
                            stylistObj,
                            {
                                $match: {
                                    gender: {$in: gender}
                                }
                            },
                            {
                                $project: {
                                        _id: 1,
                                        firstname: 1,
                                        lastname: 1,
                                        middlename: 1,
                                        live_location:1,
                                        register_location:1,
                                        radius:1,
                                        completed_order_count:{
                                            $cond:["$completed_orders", {$size:"$completed_orders"},0]
                                        },
                                        "stylist_fav_count":{$cond:["$favs",{$size:"$favs"},0]},


                                        online: 1,
                                        "rating_count":{$size:"$ratings"},
                                        "avg_rating":{ $toString: {$cond:[{$size:"$ratings"},{$avg:"$ratings.value"},0]} },
                                        experience: 1,

                                        //distance: 1,
                                        gender:1,
                                        profile:{
                                            $cond:{
                                                if:{$eq:["$profile", ""]},
                                                then:"",
                                                else:{$concat:[constants.IMAGEKIT_URL,"$profile"]}
                                            }
                                        },
                                }
                            }
                            ];
                            

                            QueryOnline = QueryOnline.concat(QueryConditions);
                            QueryOffline = QueryOffline.concat(QueryConditions);

                            const promiseOnline = new Promise((resolve, reject)=>{
                              ServiceProviderModel.aggregate(QueryOnline, function(err, res){err ? reject(err) : resolve(res) });
                            });
                            const promiseOffline = new Promise((resolve, reject)=>{
                              ServiceProviderModel.aggregate(QueryOffline, function(err, res){err ? reject(err) : resolve(res)});
                            });

                            await Promise.all([promiseOnline, promiseOffline]).then(async(values) => {
                              //console.log(values);   

                              var stylists = values[0].concat(values[1]);
                                if (stylists.length > 0) {
                                  // Call nextbillion api to calc travel distance and duration
                                  stylists = await Promise.all(stylists.map(async (stylist) => {
                                    return new Promise((resolve, reject) => {

                                      let nextb_url = `https://api.nextbillion.io/directions/json?origin=${stylist.online ? String(stylist.live_location.coordinates[1]) : String(stylist.register_location.coordinates[1])},${stylist.online ? String(stylist.live_location.coordinates[0]) : String(stylist.register_location.coordinates[0])}&destination=${_active_adress.lat},${_active_adress.lng}&mode=car&departure_time=${Math.floor(Date.now()/1000)}&key=${process.env.NEXT_BILLION_KEY}`;
                                      console.log(nextb_url);

                                      axios.get(nextb_url).then((response)=>{
                                        stylist.distance = response.data.routes[0].distance * constants.MILES_PER_METER;
                                        stylist.duration = Math.floor(response.data.routes[0].duration / 60);   // Convert to minutes
                                        resolve(stylist);
                                      }, (error)=>{
                                        console.log(error);
                                        stylist.distance = null;
                                        stylist.duration = null;
                                        resolve(stylist);
                                      })
                                    })
                                  }))

                                  stylists = stylists.filter(stylist => stylist.distance != null || stylist.duration != null);
                                  stylists = stylists.filter(stylist => (stylist.online && stylist.distance <= stylist.radius && stylist.duration <= config.stylist_walking_duration) || (!stylist.online && stylist.distance <= radius))
                                  stylists = stylists.map((stylist)=>{
                                    delete stylist.register_location
                                    return stylist;
                                  })
                                  return apiResponse.successResponseWithData(res, "", stylists);
                                    //data.stylist = stylists;
                                }
                                else{
                                  return apiResponse.successResponseWithData(res, "No stylist could be found.", {});
                                }
                            });
                        }
                        else{
                            return apiResponse.ErrorResponse(res, "No active location found.", {});
                        }
                    } else {
                        return apiResponse.ErrorResponse(res, "No user could be found.", {});
                    }
                });

            }).catch(auth_err => {
                return apiResponse.ErrorResponse(res, 'Authorization failed.', {});
            });
        } catch (err) {
            return apiResponse.ErrorResponse(res, err.message, {});
        }
    }
];

exports.showAllInactiveStylist = [
    (req, res) => {
        try {
            console.log("reached1");
            utility.verifyUser(req.headers.authorization.split(' ')[1]).then(auth => {
                UserModel.findOne({_id: ObjectId(auth._id), 'addresses.active': 1}, async function (user_err, user) {
                    if (user_err) {
                        return apiResponse.ErrorResponse(res, user_err.message, {});
                    }
                    if (user != null) {
                        let page = 1;
                        //let search = '';
                        if (req.body.page) {
                            page = req.body.page;
                        }
                        let limit = req.body.limit ? parseInt(req.body.limit) : 10;
                        let skip = (limit * page) - limit;

                        _active_adress = user.addresses.find(function (elem) {
                            if (elem.active == 1) {
                                return elem;
                            }
                        });

                        _blocked_stylists = user.blocked_stylist.filter(elem => elem.block_status == "active").map(elem => elem.stylist_id);

                        console.log("reached2");
                        if (_active_adress) {
                            //let stylist_level = (req.body.stylist_level) ? (req.body.stylist_level) : 'senior';
                            //let preference = user.preference.length > 0 ? user.preference : [];
                            let genderFilter = req.body.gender_filter?req.body.gender_filter.split(','):undefined;
                            let ratingFilter = req.body.rating_filter?parseInt(req.body.rating_filter):0;
                            let nameFilter = req.body.name_filter?req.body.name_filter:undefined;
                            let stylistTypeFilter = req.body.stylist_type ? req.body.stylist_type : undefined;
                            let sort = req.body.sort?req.body.sort:"avg_rating";
                            let sortingObj ={}
                            let requestId = req.headers.requestid;
                            let genderMatchingObj ={}
                            let ratingMatchingObj ={}
                            let nameMatchObj = {}
                            let stylistObj = {}
                            //Sorting
                            if(sort == "avg_rating"){
                                sortingObj= {$sort:{"avg_rating":-1}};
                            }else if(sort == "most_preferred"){
                                sortingObj= {$sort:{"stylist_fav_count":-1}};
                            }else if(sort == "completed_services"){
                                sortingObj= {$sort:{"completed_order_count":-1}};
                            }else{
                                sortingObj= {$sort:{"avg_rating":-1}};
                            }

                            if(genderFilter && genderFilter.length){
                                genderMatchingObj = {$match:{gender:{$in:genderFilter}}}
                             } else {
                                genderMatchingObj = {$match:{gender:{$in:["men", "women"]}}}
                            }

                            if(stylistTypeFilter){
                                stylistObj = {$match: { experience: { $in: [stylistTypeFilter] } }}
                            } else {
                                stylistObj = { $match: { experience: { $in: ['advanced', 'senior'] } }}
                            }

                            // Name Filter
                            if(nameFilter){
                                nameMatchObj = {$match:{full_name:{$regex:nameFilter,$options:"i"}}}
                            }else{
                                nameMatchObj = {$match: {online: 0 }}
                            }
                            //console.log(_active_adress)
                            console.log("reached3");
                            const config = await ConfigModel.findOne();

                            ServiceProviderModel.aggregate([
                                // Search by config.customer_stylist_radius around the active location, search only offline, non-deleted stylists
                                {
                                  $geoNear:
                                    {
                                      near: {
                                        type: "Point",
                                        coordinates: [parseFloat(_active_adress.lng), parseFloat(_active_adress.lat)]
                                      },
                                      key: "register_location",
                                      query: {
                                        online: 0,
                                        registration_status: "accepted",
                                        deleted: false,
                                        status: true
                                      },
                                      distanceField: "customer_distance",
                                      maxDistance: config.customer_stylist_radius * constants.METERS_PER_MILE,
                                      distanceMultiplier: constants.MILES_PER_METER,
                                      spherical: true
                                    }
                                },
                                // Check if stylist walking distance reach customer
                                {
                                  $match:
                                    {
                                      $expr:
                                        {
                                          $lte:["$customer_distance", "$radius"]
                                        }
                                    }
                                },
                                // Check if any of the possible stylists is blocked by the customer
                                {
                                  $match:
                                    {
                                      "_id" : {$nin : _blocked_stylists}
                                    }
                                },
                                // Check if this customer si blocked by any of the possible stylists
                                {
                                  $match:
                                    {
                                      $expr:
                                        {
                                          $not: {
                                            $in:[ObjectId(user._id), "$blocked_customer"]
                                          }
                                        }
                                    }
                                },
                                //nameMatchObj,
                                //genderMatchingObj,
                                stylistObj,
                                {
                                    $lookup:{
                                        from:'ratings',
                                        localField:"_id",
                                        foreignField:"stylist_id",
                                        pipeline:[
                                          {
                                            $match:{
                                              $expr:{
                                                $eq: ["$reviewed_by", "customer"]
                                              }
                                            }
                                          }
                                        ],
                                        as:"ratings"
                                    }
                                },
                                {
                                    $lookup:{
                                        from:'orders',
                                        localField:'_id',
                                        foreignField:"stylist_id",
                                        as:"orders"
                                    }
                                },
                                {
                                    $lookup:{
                                        from:'favourites',
                                        localField:'_id',
                                        foreignField:"stylist_id",
                                        as:"favs"
                                    }
                                },
                                {
                                    $addFields:{
                                        "completed_orders":{
                                            $filter:{
                                                input:"$orders",
                                                as:"order",
                                                cond:{$eq:["$$order.booking_status",4]}
                                            }
                                        }
                                    }
                                },
                                {
                                    $project: {
                                        _id: 1,
                                        firstname: 1,
                                        lastname: 1,
                                        middlename: 1,
                                        register_location: 1,
                                        radius: 1,
                                        completed_order_count:{
                                            $cond:["$completed_orders", {$size:"$completed_orders"},0]
                                        },
                                        "stylist_fav_count":{$cond:["$favs",{$size:"$favs"},0]},
                                        online: 1,
                                        "rating_count":{$size:"$ratings"},
                                        "avg_rating":{ $toString: {$cond:[{$size:"$ratings"},{$avg:"$ratings.value"},0]} },
                                        experience: 1,
                                        gender:1,
                                        profile: {
                                            $cond:{
                                                if:{$eq:["$profile", ""]},
                                                then:"",
                                                else:{$concat:[constants.IMAGEKIT_URL,"$profile"]}
                                            }
                                        },
                                    }
                                },
                                //{$skip: skip},
                                //{$limit: limit}
                            ], async function (active_stylist_err, active_stylists) {
                                console.log("reached4");
                                if (active_stylist_err) {
                                    console.log("reached5");
                                    console.log(active_stylist_err);
                                    return apiResponse.ErrorResponse(res, active_stylist_err.message, []);
                                }
                                console.log("reached6");
                                if (active_stylists.length > 0) {
                                    // Call nextbillion api to calc travel distance 
                                    active_stylists = await Promise.all(active_stylists.map(async (stylist) =>{
                                      return new Promise((resolve, reject) => {

                                        let nextb_url = "https://api.nextbillion.io/directions/json?origin=" + stylist.register_location.coordinates[1] + "," + stylist.register_location.coordinates[0] + "&destination=" + _active_adress.lat + "," + _active_adress.lng + "&mode=car&departure_time=" + Math.floor(Date.now()/1000)+"&key=" + process.env.NEXT_BILLION_KEY
                                        console.log(nextb_url);
                                        axios.get(nextb_url).then((response)=>{
                                          stylist.distance = response.data.routes[0].distance * constants.MILES_PER_METER;
                                          resolve(stylist);
                                        }, (error)=>{
                                          console.log(error.response.data);
                                          stylist.distance = null;
                                          resolve(stylist);
                                        });
                                      })      
                                    }))

                                    active_stylists = active_stylists.filter(stylist => stylist.distance != null && stylist.distance <= stylist.radius);

                                    // ToDo, refactor with if above
                                    if(active_stylists.length == 0){
                                        return apiResponse.successResponseWithData(res, "No records found.", { totalPage: 1, currentPage: 1, result: [] });
                                    }

                                    console.log("active stylist callled!!!")
                                    let stylistArr = [];
                                    for (let i=0;i<active_stylists.length;i++) {
                                        if(active_stylists[i].experience === 'senior') {
                                            stylistArr.push(active_stylists[i])
                                        }
                                        if(active_stylists[i].experience === 'advanced') {
                                            stylistArr.push(active_stylists[i])
                                        }
                                    }
                                    
                                    if(page){
                                        //stylistArr = { totalPage: Math.ceil(stylistArr.length/limit), currentPage: stylistArr.length > 0 ? parseInt(page) : 0, result: stylistArr}
                                        stylistArr = { result: stylistArr}
                                    } else {
                                        //stylistArr = { totalPage: Math.ceil(stylistArr.length/limit) , result: stylistArr}
                                        stylistArr = { result: stylistArr}
                                    }
                                    stylistArr = stylistArr.result.map((stylist)=>{
                                        delete stylist.register_location
                                        return stylist;
                                    })
                                    if(requestId){
                                        res.setHeader("requestId", requestId);
                                        return apiResponse.successResponseWithData(res,"Active stylist found successfully.", stylistArr);
                                    } else {
                                        return apiResponse.successResponseWithData(res, "Active stylist found successfully.", stylistArr);
                                    } 
                                } else {
                                    return apiResponse.successResponseWithData(res, "No records found.", { totalPage: 1, currentPage: 1, result: [] });
                                }
                            });
                        } else {
                            return apiResponse.ErrorResponse(res, "No active location found.", {});
                        }
                    }else{
                        return apiResponse.ErrorResponse(res, "No records found.", {});
                    }
                });
            }).catch(auth_err => {
                return apiResponse.ErrorResponse(res, "Authorization failed.", {});
            });

        } catch (err) {
            return apiResponse.ErrorResponse(res, err.message, []);
        }
    }
];

exports.getAllActiveStylist = [
    (req, res) => {
        try {
            utility.verifyUser(req.headers.authorization.split(' ')[1]).then(auth => {
                UserModel.findOne({_id: ObjectId(auth._id), 'addresses.active': 1}, async function (user_err, user) {
                    if (user_err) {
                        return apiResponse.ErrorResponse(res, user_err.message, {});
                    }
                    if (user != null) {

                        let page = 1;
                        let stylistType = req.body.stylist_type ? req.body.stylist_type : '';
                        let genderFilter = req.body.gender_filter ? req.body.gender_filter : '';
                        let nameFilter = req.body.name_filter ? req.body.name_filter : '';
                        let ratingFilter = req.body.rating_filter ? parseInt(req.body.rating_filter) : 0;
                        let sort = req.body.sort?req.body.sort:"avg_rating";
                        //let stylist_level = (req.body.stylist_level) ? (req.body.stylist_level) : 'senior';
                        //let preference = user.preference.length > 0 ? user.preference : [];
                        let stylistTypeObj = {};
                        let genderMatchObj = {};
                        let nameMatchObj = {};
                        let sortingObj ={}
                        if (req.body.page) {
                            page = req.body.page;
                        }
                        let limit = req.body.limit ? parseInt(req.body.limit) : 10;

                        let skip = (limit * page) - limit;

                        _active_adress = user.addresses.find(function (elem) {
                            if (elem.active == 1) {
                                return elem;
                            }
                        });

                        _blocked_stylists = user.blocked_stylist.filter(elem => elem.block_status == "active").map(elem => elem.stylist_id);

                        // Stylist type Filter
                        if(stylistType){
                            stylistTypeObj = {$match: { experience: { $in: [stylistType] }}}
                        } else {
                            stylistTypeObj = { $match: { experience: { $in: ['advanced', 'senior'] } }}
                        }

                        // gender Filter
                        if(genderFilter && genderFilter.length){
                            genderMatchObj = { $match: { gender: { $in: [genderFilter] }}};
                        } else {
                            genderMatchObj = { $match: { gender: { $in: ["men", "women"] }}};
                        }

                        // Name Filter
                        if(nameFilter){
                            nameMatchObj = {$match:{full_name:{$regex:nameFilter,$options:"i"}}}
                        }else{
                            nameMatchObj = {$match: {online: 1 }}
                        }

                        // sort with field Filter
                        if(sort == "avg_rating"){
                            sortingObj= {$sort:{"avg_rating":-1}};
                        }else if(sort == "most_preferred"){
                            sortingObj= {$sort:{"stylist_fav_count":-1}};
                        }else if(sort == "completed_services"){
                            sortingObj= {$sort:{"completed_order_count":-1}};
                        }else{
                            sortingObj= {$sort:{"avg_rating":-1}};
                        }

                        if (_active_adress) {
                        const config = await ConfigModel.findOne();
                          
                            ServiceProviderModel.aggregate([
                                // Search by config.customer_stylist_radius around the active location, search only online, non-deleted stylists
                                {
                                  $geoNear: 
                                    {
                                      near: {
                                        type: "Point",
                                        coordinates: [parseFloat(_active_adress.lng), parseFloat(_active_adress.lat)]
                                      },
                                      key: "live_location",
                                      query: { 
                                        online: 1, 
                                        registration_status: "accepted", 
                                        deleted: false, 
                                        status:true
                                      },
                                      distanceField: "customer_distance",
                                      maxDistance: config.customer_stylist_radius * constants.METERS_PER_MILE,
                                      distanceMultiplier: constants.MILES_PER_METER,
                                      spherical: true
                                    }
                                },
                                // Check if stylist walking distance reach customer
                                {
                                  $match:
                                    {
                                      $expr:
                                        {
                                          $lte:["$customer_distance", "$radius"]
                                        }
                                    }
                                },
                                // Check if any of the possible stylists is blocked by the customer
                                {
                                  $match:
                                    {
                                      "_id" : { $nin : _blocked_stylists }
                                    }
                                },
                                // Check if this customer is blocked by any of the possible stylists
                                {
                                  $match:
                                    {
                                      $expr:
                                        {
                                          $not: {
                                            $in:[ObjectId(user._id), "$blocked_customer"]
                                          }
                                        }
                                    }
                                },
                                stylistTypeObj,
                                //genderMatchObj,
                                //nameMatchObj,
                                {
                                    $lookup:{
                                        from:'ratings',
                                        localField:"_id",
                                        foreignField:"stylist_id",
                                        pipeline:[
                                          {
                                            $match:{
                                              $expr:{
                                                $eq: ["$reviewed_by", "customer"]
                                              }
                                            }
                                          }
                                        ],
                                        as:"ratings"
                                    }
                                },
                                {
                                    $lookup:{
                                        from:'orders',
                                        localField:'_id',
                                        foreignField:"stylist_id",
                                        as:"orders"
                                    }
                                },
                                {
                                    $lookup:{
                                        from:'favourites',
                                        localField:'_id',
                                        foreignField:"stylist_id",
                                        as:"favs"
                                    }
                                },
                                {
                                    $addFields:{
                                        "completed_orders":{
                                            $filter:{
                                                input:"$orders",
                                                as:"order",
                                                cond:{$eq:["$$order.booking_status",4]}
                                            }
                                        }
                                    }
                                },
                                {
                                    $project: {
                                        _id: 1,
                                        firstname: 1,
                                        lastname: 1,
                                        middlename: 1,
                                        live_location:1,
                                        radius:1,
                                        completed_order_count:{
                                            $cond:["$completed_orders", {$size:"$completed_orders"},0]
                                        },
                                        "stylist_fav_count":{$cond:["$favs",{$size:"$favs"},0]},
                                        online: 1,
                                        "rating_count":{$size:"$ratings"},
                                        "avg_rating":{ $toString: {$cond:[{$size:"$ratings"},{$avg:"$ratings.value"},0]} },
                                        experience: 1,
                                        gender:1,
                                        profile: {
                                            $cond:{
                                                if:{$eq:["$profile", ""]},
                                                then:"",
                                                else:{$concat:[constants.IMAGEKIT_URL,"$profile"]}
                                            }
                                        },
                                    }
                                }
                                //{$skip: skip},
                                //{$limit: limit}
                            ], async function (active_stylist_err, active_stylists) {
                                if (active_stylist_err) {
                                    return apiResponse.ErrorResponse(res, active_stylist_err.message, []);
                                }
                                if (active_stylists.length > 0) {
                                    // Call nextbillion api to calc travel distance and duration
                                    active_stylists = await Promise.all(active_stylists.map(async (stylist)=>{
                                      
                                      return new Promise((resolve, reject) => {
                                         
                                        let nextb_url="https://api.nextbillion.io/directions/json?origin=" + stylist.live_location.coordinates[1] + ","+ stylist.live_location.coordinates[0]+"&destination="+ _active_adress.lat+","+ _active_adress.lng+"&mode=car&departure_time=" +Math.floor(Date.now()/1000) + "&key=" + process.env.NEXT_BILLION_KEY;
                                        console.log(nextb_url);
                                        axios.get(nextb_url).then((response)=>{

                                          stylist.distance = response.data.routes[0].distance * constants.MILES_PER_METER;
                                          stylist.duration = Math.floor(response.data.routes[0].duration / 60);   // Convert to minutes
                                        
                                          resolve(stylist);
                                        },(error)=>{
                                          console.log(error);
                                          stylist.distance = null;
                                          stylist.duration = null;
                                          resolve(stylist);
                                        })
                                      })  
                                    }))
                                    
                                    active_stylists = active_stylists.filter(stylist => stylist.duration != null && stylist.distance != null && stylist.duration <= config.stylist_walking_duration && stylist.distance <= stylist.radius);

                                    // ToDo, refactor with if above
                                    if(active_stylists.length == 0){
                                        return apiResponse.successResponseWithData(res, "No records found.", { totalPage: 1, currentPage: 1, result: [] });
                                    }

                                    console.log("active stylist callled!!!")
                                    let stylistArr = []
                                    for (let i=0;i<active_stylists.length;i++) {
                                        if(active_stylists[i].experience === 'senior') {
                                            stylistArr.push(active_stylists[i])
                                        }
                                        if(active_stylists[i].experience === 'advanced') {
                                            stylistArr.push(active_stylists[i])
                                        }
                                    }
                                    //stylistArr = stylistArr.filter((item) => item.avg_rating >= ratingFilter );

                                    if(page){
                                        //stylistArr = { totalPage: Math.ceil(stylistArr.length/limit), currentPage: stylistArr.length > 0 ? parseInt(page) : 0, result: stylistArr}
                                        stylistArr = { result: stylistArr}
                                    } else {
                                        //stylistArr = { totalPage: Math.ceil(stylistArr.length/limit) , result: stylistArr}
                                        stylistArr = { result: stylistArr}
                                    }
                                    return apiResponse.successResponseWithData(res, "Active stylist found successfully.", stylistArr);

                                } else {
                                    return apiResponse.successResponseWithData(res, "No records found.", { totalPage: 1, currentPage: 1, result: [] });
                                }
                            });
                        } else {
                            return apiResponse.ErrorResponse(res, "No active location found.", {});
                        }
                    }else{
                        return apiResponse.ErrorResponse(res, "No records found.", {});
                    }
                });
            }).catch(auth_err => {
                return apiResponse.ErrorResponse(res, "Authorization failed.", {});
            });

        } catch (err) {
            return apiResponse.ErrorResponse(res, err.message, []);
        }
    }
]

exports.stylistDetail = [
    body("stylist_id").exists().notEmpty().trim().withMessage("Stylist id is required"),
    body("profile_id").exists().notEmpty().trim().withMessage("Profile id is required"),

    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
            }
            let user  = await utility.verifyUser(req.headers.authorization.split(' ')[1])

            // Verify stylist_blocked by customer  
            const styl_unblocked = await UserModel.findOne(
                {
                    _id:ObjectId(user._id),
                    blocked_stylist:
                        {
                            $not:
                                {
                                  $elemMatch:
                                    {
                                      stylist_id: ObjectId(req.body.stylist_id),
                                      block_status: 'active'
                                    }
                                }
                        }
                });

            let limit = req.body.limit ? parseInt(req.body.limit) : 10;
            let page = req.body.page || req.body.page==0 || req.body.page===0 ?req.body.page-1:0;
            let skip = limit*page;
            let fav = await FavouriteModel.findOne({stylist_id:req.body.stylist_id,user_id:user._id},{created_at:1});
            let stylist  = await ServiceProviderModel.aggregate([
                {$match:{_id:ObjectId(req.body.stylist_id),
                        registration_status:'accepted',
                        deleted: false,
                }},
                //  Check if customer blocked by stylist 
                {
                    $match:
                        {
                            $expr:
                                {
                                    $not: {
                                        $in:[ObjectId(user._id), "$blocked_customer"]
                                    }
                                }
                        }
                },
                {
                    $lookup: {
                        from: 'orders',
                        pipeline: [
                            {
                                $match: {stylist_id: ObjectId(req.body.stylist_id), booking_status: 3}
                            },
                            {$project:{_id:1}}
                        ],
                        as:"orders"
                    }
                },
                // {$unwind:{path:'orders',preserveNullAndEmptyArrays: true}},
                {$addFields:{
                        "is_fav":0
                    }
                },
                // fetch based on reviewed_by customer & stylist id
                // also fetch and send the count of reviews as "rating_count:{$size:"$ratings"},"
                {
                    $lookup: {
                        from: "ratings",
                        let: { stylist_id: ObjectId(req.body.stylist_id) },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $and: [{ $eq: ["$$stylist_id", "$stylist_id"] }, { $eq: ["$reviewed_by", "customer"] }] },
                                },
                            },
                        ],
                        as: "ratings",
                    },
                },
                {$project:{
                        "profile": {
                            $cond:{
                                if:{$eq:["$profile", ""]},
                                then:"",
                                else:{$concat:[constants.IMAGEKIT_URL,"$profile"]}
                            }
                        },
                        "portfolio_images": {
                            $map:
                            {
                                input: "$portfolio_images",
                                as: "image",
                                in: { $concat: [ constants.IMAGEKIT_URL, "$$image.image" ] } }
                            },
                        "portfolio_videos":{
                            $map:
                                {
                                    input: "$portfolio_videos",
                                    as: "video",
                                    in: { $concat: [ constants.IMAGEKIT_URL, "$$video.video" ] }
                                }
                        },
                        rating_count:{$size:"$ratings"},
                        "avg_rating":{ $toString: {$cond:[{$size:"$ratings"},{$avg:"$ratings.value"},0]} },
                        "firstname":1,
                        "lastname":1,
                        "full_name":1,
                        "online":1,
                        "email":1,
                        "gender":1,
                        "is_order_active":{$cond:[{ $size: "$orders" }, 1, 0 ]},
                        "country_code":1,
                        "phone_number":1,
                        "experience":1,
                        "about":1,
                        "skills":1,
                        "languages":1,
                        "blocked_customer":1
                    }
                }
            ])
            if(!stylist[0]) {
              return apiResponse.successResponseWithNoData(res, 'Stylist not found');
              //  apiResponse.ErrorResponseWithoutData(res,'No data found!');
              //  return;
            }
            // stylist[0].rating_count = stylist[0].rating_array?stylist[0].rating_array.length:0;
            // delete stylist[0].rating_array;
            let matchQuery = {};
            if(req.body.filter) {
                matchQuery={$match:{stylist_id:ObjectId(req.body.stylist_id),available_for:{$in:req.body.filter.split(',')},approved:1,deleted:0,disable:0}}
            }else {
                matchQuery={$match:{stylist_id:ObjectId(req.body.stylist_id),approved:1,deleted:0,disable:0}}
            }
            console.log(matchQuery)
            let customServices = await CustomServiceModel.aggregate([
                matchQuery,
                {$lookup:{from:'ratings',localField: '_id',foreignField: 'custom_service_id',as:"ratings"}},
                {$limit:limit},
                {$skip:skip},
                {$addFields:{
                    cart_quantity:0
                    }
                },
                {
                    $lookup:
                        {from:'favourites',
                            let:{user_id:ObjectId(user._id),service_id:"$_id"},
                            pipeline:[
                                { $match:
                                        { $expr:
                                                { $and:
                                                        [
                                                            { $eq: [ "$$user_id",  "$user_id" ] },
                                                            { $eq: [ "$$service_id",  "$service_id" ] },
                                                        ]
                                                }
                                        }
                                },
                            ],
                            as:"is_fav"
                        }
                },
                {$project:{
                        _id: 1,
                        duration: {$cond:["$section_image","$section_image",0]},
                        stylist_type: {$cond:["$stylist_type","$stylist_type",[]]},
                        description: 1,
                        featured_image: {$cond:["$featured_image",{$concat:[constants.IMAGEKIT_URL,"$featured_image"]},""]},
                        section_image: {$cond:["$section_image",{$concat:[constants.IMAGEKIT_URL,"$section_image"]},""]},
                        created_at: 1,
                        status: {$cond:["$section_image","$section_image",false]},
                        updated_at: 1,
                        regular_price:1,
                        sale_price:1,
                        available_for:1,
                        "is_fav":{$size:"$is_fav"},
                        "avg_rating":{ $toString: {$cond:[{$size:"$ratings"},{$avg:"$ratings.value"},0]} },
                        "rating_count":{$size:"$ratings"},
                        "quantity":{$cond:{if:"$quantity",then:"$quantity",else:1}},
                        "cart_quantity":1,
                        images: {
                            $map: {
                                input: "$images",
                                as: "image",
                                in: {image:{$concat:[constants.IMAGEKIT_URL,"$$image.image"]} }
                            }
                        },
                        videos:{
                            $map: {
                                input: "$videos",
                                as: "video",
                                in: {_id:"$$video._id",video:{$concat:[constants.IMAGEKIT_URL,"$$video.video"]} }
                            }
                        },
                        title:1
                 }},
            ])
            let cartItems = await CartModel.aggregate([
                {$match:{user_id:ObjectId(user._id)}},
                {$project:{
                        "cart_profiles":{$filter:{input:"$cart_profiles",as:"cart",cond:{$eq:["$$cart.profile_id",ObjectId(req.body.profile_id)]}}}
                    }}
            ])

            if(cartItems.length>0 && cartItems[0].cart_profiles.length>0 && cartItems[0].cart_profiles[0].cart_items.length>0){
                for(let i=0; i<cartItems[0].cart_profiles[0].cart_items.length; i++) {
                    // console.log(cartItems[0].cart_profiles[0].cart_items[i].service_id);
                    let index = customServices.map((element)=>{return element._id.toString()}).indexOf(cartItems[0].cart_profiles[0].cart_items[i].service_id.toString())
                    if(index>-1){
                        // console.log(customServices[index].cart_quantity)
                        customServices[index].cart_quantity = cartItems[0].cart_profiles[0].cart_items[i].quantity
                        // console.log(customServices[index].cart_quantity, cartItems[0].cart_profiles[0].cart_items[i].quantity)
                    }
                }
            }
            stylist[0].is_fav = fav?1:0;
            stylist[0].services = customServices.length>0?customServices:[];
            stylist[0].isBlocked = false;

            if(!styl_unblocked){
              stylist[0].isBlocked = true;
            }

            delete stylist[0].blocked_customer;
            apiResponse.successResponseWithData(res,'Record found!', stylist);
        }catch (e) {
            return apiResponse.ErrorResponse(res, e.message, []);
        }
    }
]

function LogicFindNearbyStylist(lng, lat, id){
  return new Promise(async(resolve, reject)=>{
      try{
                    UserModel.findOne({_id:ObjectId(id)}, async function (user_err, user){
                        if(user_err){
                          //return apiResponse.ErrorResponse(res, user_err.message, {});
                          reject(user_err.message);
                        }
                        if(user != null){

                          _blocked_stylists = user.blocked_stylist.filter(elem => elem.block_status == "active").map(elem => elem.stylist_id);

                          let config = await ConfigModel.findOne({},{customer_stylist_radius:1, customer:1})
                          let OnlineQuery = [];
                          let OfflineQuery = [];

                          OnlineQuery.push({
                            $geoNear: {
                                near: {
                                    type: "Point",
                                    coordinates: [parseFloat(lng), parseFloat(lat)]
                                },
                                key: "live_location",
                                query: {
                                    online:1,
                                    registration_status: "accepted",
                                    status: true,
                                    deleted: false,
                                },
                                distanceField: "distance",
                                maxDistance: config.customer_stylist_radius * constants.METERS_PER_MILE,
                                distanceMultiplier: constants.MILES_PER_METER,
                                spherical: true
                            }
                          },{
                            // Check if stylist walking distance reach customer
                            $match:
                            {
                              $expr:
                                {
                                  $lte:["$distance", "$radius"]
                                }
                            }
                          },{
                            // Check if any of the possible stylists is blocked by the customer
                            $match:
                            {
                              "_id" : {$nin: _blocked_stylists } 
                            }
                          },{
                            // Check if this customer is blocked by any of the possible stylists
                            $match:
                            {
                              $expr:
                              {
                                $not:
                                {
                                  $in: [ObjectId(user._id), "$blocked_customer"]
                                }
                              }
                            }
                          },{
                            $project: {
                              _id:1,
                              radius: 1,
                              live_location: 1
                            }
                          });

                          OfflineQuery.push({
                            $geoNear: {
                              near: {
                                  type: "Point",
                                  coordinates: [parseFloat(lng), parseFloat(lat)]
                              },
                              key: "register_location",
                              query: {
                                  online: 0,
                                  registration_status: "accepted",
                                  status: true,
                                  deleted: false,
                              },
                              distanceField: "distance",
                              maxDistance: config.customer_stylist_radius * constants.METERS_PER_MILE,
                              distanceMultiplier: constants.MILES_PER_METER,
                              spherical: true
                            }
                          },{
                            // Check if stylist walking distance reach customer
                            $match:
                            {
                              $expr:
                                {
                                  $lte:["$distance", "$radius"]
                                }
                            }
                          },{
                            // Check if any of the possible stylists is blocked by the customer
                            $match:
                            {
                              "_id" : {$nin: _blocked_stylists } 
                            }
                          },{
                            // Check if this customer is blocked by any of the possible stylists
                            $match:
                            {
                              $expr:
                              {
                                $not:
                                {
                                  $in: [ObjectId(user._id), "$blocked_customer"]
                                }
                              }
                            }
                          },{
                            $project: {
                              _id:1,
                              radius: 1,
                              register_location: 1
                            }
                          });


                          let onlineStylists = await ServiceProviderModel.aggregate(OnlineQuery);
                          let offlineStylists = await ServiceProviderModel.aggregate(OfflineQuery);
                          // Call nextbillion api to calc travel distance for online and offline stylists
                          onlineStylists =  await Promise.all(onlineStylists.map(async (stylist) => {
                            return new Promise((resolve, reject) => {
                              let nextb_url = "https://api.nextbillion.io/directions/json?origin=" + stylist.live_location.coordinates[1] + "," + stylist.live_location.coordinates[0] + "&destination=" + lat + "," + lng + "&mode=car&departure_time=" +Math.floor(Date.now()/1000) +"&key=" + process.env.NEXT_BILLION_KEY;
                              console.log(nextb_url);
                              axios.get(nextb_url).then((response)=>{
                                stylist.distance = response.data.routes[0].distance * constants.MILES_PER_METER;
                                //stylist.duration = Math.floor(response.data.routes[0].duration / 60);   // Convert to minutes
                                resolve(stylist);
                              }, (error)=> {
                                console.log(error);
                                stylist.distance = null;
                                //stylist.duration = null;
                                resolve(stylist);
                              })
                            })
                          }))

                          onlineStylists = onlineStylists.filter(stylist => stylist.distance != null && stylist.distance <= stylist.radius);

                          //////

                          offlineStylists =  await Promise.all(offlineStylists.map(async (stylist) => {
                            return new Promise((resolve, reject) => {
                              let nextb_url = "https://api.nextbillion.io/directions/json?origin=" + stylist.register_location.coordinates[1] + "," + stylist.register_location.coordinates[0] + "&destination=" + lat + "," + lng + "&mode=car&departure_time=" + Math.floor(Date.now()/1000) + "&key=" + process.env.NEXT_BILLION_KEY;
                              console.log(nextb_url);
                              axios.get(nextb_url).then((response)=>{
                                stylist.distance = response.data.routes[0].distance * constants.MILES_PER_METER;
                                //stylist.duration = Math.floor(response.data.routes[0].duration / 60);   // Convert to minutes
                                resolve(stylist);
                              }, (error)=> {
                                console.log(error);
                                stylist.distance = null;
                                //stylist.duration = null;
                                resolve(stylist);
                              })
                            })
                          }))

                          offlineStylists = offlineStylists.filter(stylist => stylist.distance != null && stylist.distance <= stylist.radius);


                          resolve(
                            { 
                              stylist_count: onlineStylists.length + offlineStylists.length, 
                              online_stylist_count: onlineStylists.length, 
                              offline_stylist_count: offlineStylists.length, 
                              contact : {customer: config.customer}
                            });
                          /*
                          apiResponse.successResponseWithData(res, "Stylist found successfully", 
                            { 
                              stylist_count: onlineStylists.length + offlineStylists.length, 
                              online_stylist_count: onlineStylists.length, 
                              offline_stylist_count: offlineStylists.length, 
                              contact : {customer: config.customer}
                            }
                          );
                          */
                        }
                    });
      }catch(err){
        reject(err);
      }
  })  
}

exports.FindNearByStylist = [
    //body('lat').exists().notEmpty().withMessage('latitude is required.'),
    //body('lng').exists().notEmpty().withMessage('longitude is required.'),
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
            }else{
                utility.verifyUser(req.headers.authorization.split(' ')[1]).then(async auth => {

                  const addresses = await UserModel.findOne({_id:ObjectId(auth._id)},{addresses:{$elemMatch:{active:true}}});

                  if(!addresses || !addresses.addresses[0]){
                    return apiResponse.ErrorResponse(res, "No active address could be found in database");
                  }
                
                  LogicFindNearbyStylist(
                      addresses.addresses[0].location.coordinates[0],
                      addresses.addresses[0].location.coordinates[1],
                      auth._id
                  )
                    .then(result => {
                      return apiResponse.successResponseWithData(res, "Stylist found successfully", result);
                    })
                    .catch(err => {
                      return apiResponse.ErrorResponse(res, err, {});
                    })
                })
                /*.catch(auth_err => {
                  return apiResponse.ErrorResponse(res, "Authorization failed.", {})
                });
                */
            }
        }catch(err){
            return apiResponse.ErrorResponse(res, err.message, []);
        }
    }
]

exports.StylistAvailabilty = [
    body('stylist_id').exists().notEmpty().withMessage('Stylist id is required.'),
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
            }else{
                utility.verifyUser(req.headers.authorization.split(' ')[1]).then(async auth => {
                    const stylistInfo = await ServiceProviderModel.findOne({ _id: req.body.stylist_id });
                    const orderInfo = await OrderModel.find({ stylist_id: req.body.stylist_id, booking_status: { $in: [1, 2, 3] }});
                    const isStylistBlocked = await UserModel.findOne({ _id: auth._id, blocked_stylist: { $elemMatch: { stylist_id: req.body.stylist_id, block_status: 'active' }}})
                    if(stylistInfo.blocked_customer.length > 0 && stylistInfo.blocked_customer.indexOf(auth._id) >= 0){
                        return apiResponse.successResponseWithData(res, 'Stylist has blocked the customer!', {})
                    }else if(orderInfo.length > 0){
                        return apiResponse.successResponseWithData(res, 'Stylist already in active order', {})
                    }else if(isStylistBlocked){
                        return apiResponse.successResponseWithData(res, 'Customer has blocked by stylist!', {})
                    }else{
                        return apiResponse.successResponseWithData(res, "Stylist found successfully", stylistInfo)
                    }
                }).catch(auth_err => {
                    return apiResponse.ErrorResponse(res, "Authorization failed.", {});
                });
            }
        }catch(err){
            return apiResponse.ErrorResponse(res, err.message, []);
        }
    }
]

exports.faqList = [
    async (req,res,next) => {
        try{
            let faqs = await Faq.find()
            apiResponse.successResponseWithData(res,'Record found!',faqs);
            return;
        }catch (e) {
            return apiResponse.ErrorResponse(res, e.message, []);
        }
    }
]
exports.orderDetail = [
    body("order_id").exists().notEmpty().trim().withMessage("Order id is required"),
    async (req,res,next) => {
        try{
            let stripe_id = await BookingModel.findOne({_id:req.body.order_id},{stripe_customer_id:1})
            console.log(stripe_id);
            if(stripe_id){
                stripe_id = stripe_id.toJSON();
            }

            let config = await ConfigModel.findOne({},{SD_service_request_expiration_duration:1, OD_service_request_expiration_duration:1, max_retry_limit:1})
            let order  = await BookingModel.aggregate([
                {$match:{_id:ObjectId(req.body.order_id)}},
                {$lookup:{from:"service_providers",localField:"stylist_id",foreignField:"_id",as:"stylist"}},
                {$unwind:{path:"$stylist",preserveNullAndEmptyArrays:true}},
                {$lookup:{from:"users",localField:"user_id",foreignField:"_id",as:"user"}},
                {$unwind:{path:"$user",preserveNullAndEmptyArrays:true}},
                {$lookup:{from:"ratings",localField:"user_id",foreignField:"user_id",as:"reviews"}},
                {$addFields:{
                    created:{$convert:{input:"$created_at",to:"long",onError:"0"}},
                    updated:{$convert:{input:"$updated_at",to:"long",onError:"0"}},
                    block_check:{
                        $filter:{
                            input:"$user.blocked_stylist",
                            as:"stylist",
                            cond:{$eq:["$stylist_id","$$stylist.stylist_id"]}
                        }
                    },
                    reviews:{
                        $filter:{
                            input:"$reviews",
                            as:"reviews",
                            cond:{$eq:["$stylist_id","$$reviews.stylist_id"]}
                        }
                    }
                    }},
                {$project:{
                        order_number:1,
                        cancellation_fee: {$toString:"$cancellation_fee"},
                        booking_status:1,
                        wallet_used:1,
                        wallet_amount_used:1,
                        payment_status:1,
                        direct_order:1,
                        date:1,
                        cart:1,
                        bill_details:1,
                        stylist_reviewed:1,
                        customer_reviewed:1,
                        tip_amount:1,
                        is_tipped:1,
                        retry_count: 1,
                        start_service_otp: 1,
                        is_blocked:{$cond:["$block_check",{$size:"$block_check"},0]},
                        is_reviewed:{$size:"$reviews"},
                        booking_type:1,
                        order_accepted_at:1,
                        created_at:"$created",
                        updated_at:"$updated",
                        // expired_at:{$add:["$created_at",5 * 60 * 1000]},
                        expired_at:'',
                        started_service_at:1,
                        completed_at:1,
                        reschedule_count:{$cond:["$reschedule_count","$reschedule_count",0]},
                        // cancelled_reason:{$cond:[{$eq:["$cancelled_reason",'']},'',"$cancelled_reason"]},
                        cancel_reason:{$cond:["$cancel_reason","$cancel_reason",""]},
                        active_location:"$active_location.address",
                        "user_sendbird_id":{$cond:["$user","$user.sendbird_id",""]},
                        "user_sendbird_token":{$cond:["$user","$user.sendbird_token",""]},
                        "user_phone_number":{$cond:["$user",{$concat:["$user.country_code","$user.phone_number"]},""]},
                        "assigned_stylist._id":{$cond:["$stylist","$stylist._id",""]},
                        "assigned_stylist.profile":{
                            $cond:{
                                if:"$stylist",
                                then:{$concat:[constants.IMAGEKIT_URL,"$stylist.profile"]},
                                else:"",
                            }
                        },
                        "assigned_stylist.firstname":{$cond:["$stylist","$stylist.firstname",""]},
                        "assigned_stylist.lastname":{$cond:["$stylist","$stylist.lastname",""]},
                        "assigned_stylist.full_name":{$cond:["$stylist","$stylist.full_name",""]},
                        "assigned_stylist.experience":{$cond:["$stylist","$stylist.experience",""]},
                        "assigned_stylist.phone_number":{$cond:["$stylist",{$concat:["$stylist.country_code","$stylist.phone_number"]},""]},
                        "assigned_stylist.sendbird_id":{$cond:["$stylist","$stylist.sendbird_id",""]},
                        "assigned_stylist.sendbird_token":{$cond:["$stylist","$stylist.sendbird_token",""]},
                        stylist_type:1,
                        charge_id: 1,
                    }},
            ]);

            if(order.length===0){
                apiResponse.ErrorResponseWithoutData(res,'Order not found!');
                return;
            }

            for(let i=0; i < order[0].cart.length; ++i){
              for(let j=0; j < order[0].cart[i].cart_items.length; ++j){
                const service_data = await ServiceModel.find({_id:order[0].cart[i].cart_items[j].service_id},{category_id:1});
                if(service_data && service_data[0]){
                  order[0].cart[i].cart_items[j].category_id = service_data[0].category_id;
                }
              }
            }

            order[0].max_retry_limit = config.max_retry_limit;
            order[0].SD_expiry_duration = config.SD_service_request_expiration_duration;
            order[0].OD_expiry_duration = config.OD_service_request_expiration_duration;

            order[0].bill_details.total_service = parseFloat(order[0].bill_details.total_service)
            order[0].bill_details.service_charges = parseFloat(order[0].bill_details.service_charges)
            order[0].bill_details.convenience_fee = parseFloat(order[0].bill_details.convenience_fee)
            order[0].bill_details.discount = parseFloat(order[0].bill_details.discount)
            order[0].bill_details.voucher_amount = parseFloat(order[0].bill_details.voucher_amount)
            order[0].bill_details.tax = parseFloat(order[0].bill_details.tax)
            order[0].bill_details.total_bill = parseFloat(order[0].bill_details.total_bill)
            order[0].bill_details.wallet_amount_used = parseFloat(order[0].bill_details.wallet_amount_used)
            order[0].bill_details.card_amount_used = parseFloat(order[0].bill_details.card_amount_used)
          
            if(order[0].charge_id){
              let chrg = await stripe.charges.retrieve(order[0].charge_id);
              if(chrg.id){
                order[0].card_used = chrg.payment_method_details.card.last4;
              }else{
                console.log("Couldn't get last 4 digits for charge", order[0].charge_id);
              }
            }
            
            order[0].bill_details["serv_charg_wo_voucher"] = 
              order[0]?.bill_details?.service_charges;

            if(typeof order[0].bill_details.voucher_amount != 'undefined'){
              order[0].bill_details["serv_charg_wo_voucher"] += order[0].bill_details.voucher_amount;
            }

            return apiResponse.successResponseWithData(res,'',order[0]);
        }catch (e) {
            console.log(e)
            return apiResponse.ErrorResponse(res, e.message, []);
        }
    }
]
exports.transactionListing = [
    query("from_date").exists().notEmpty().trim().toInt().withMessage("From date must be present"),
    query("to_date").exists().notEmpty().trim().toInt().withMessage("To date must be present"),
    query("page_number").exists().notEmpty().trim().toInt().withMessage("Page number must be present"),
    async (req,res,next) => {
        try{
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
            }
            const user = await utility.verifyUser(req.headers.authorization.split(' ')[1]);
            const wallet = await UserModel.findOne({_id:user._id},{wallet_balance:1, default_refund_method: 1});
            const limit = req.query.limit ? parseInt(req.query.limit) : 10;
            const page = req.query.page_number;
            const skip = limit * (page - 1);
            const query={user_id:ObjectId(user._id),created_at:{$gte: String(Math.floor(new Date(req.query.from_date).setHours(0,0,0))), $lte: String(Math.floor(new Date(req.query.to_date).setHours(23,59,59)))}}
            // transactionTypeObj = { $match: { type: { $in : ["other","card-refund","refund","reward"]}}}
            const transactionTypeObj = { $match: { type: { $in : ["refund","reward","order"]}}}
            const transactions =await CustomerTransaction.aggregate([
                {$match:query},
                transactionTypeObj,
                {$sort:{created_at:-1}}
            ])
            if(transactions.length === 0) {
                const data = {
                    currentPage:req.query.page_number,
                    totalPages:Math.ceil(transactions.length / limit),
                    data: { balance: wallet.wallet_balance, transaction: [] }
                }
                return apiResponse.successResponseWithData(res, "No records found.", data);
            }
            const result ={
                currentPage:page,
                totalPages:Math.ceil(transactions.length / limit),
                data:{
                    balance:wallet.wallet_balance?wallet.wallet_balance:0,
                    transactions: transactions.slice(skip, skip+limit)
                }
            }
            return apiResponse.successResponseWithData(res,'Record found!',result)
        }catch (e) {
            return apiResponse.ErrorResponse(res, e.message, []);
        }
    }
]
exports.getStylistTimeSlots = [
    body("stylist_id").exists().notEmpty().trim().withMessage("Stylist id is required"),
    async (req,res,next) => {
        try{
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
            }
            Date.prototype.addDays = function (days) {
                var date = new Date(this.valueOf());
                date.setDate(date.getDate() + days);
                return date;
            }
            const response = {
                start_date: 0,
                end_date: 0,
                scheduled_days: []
            }
            const stylistActiveSchedule = await ServiceProviderModel.findById(req.body.stylist_id)
            if (!stylistActiveSchedule) {
                return apiResponse.successResponseWithData(res, 'Stylist not found', {})
            }
            response.schedule_type = stylistActiveSchedule.active_schedule_type
            let scheduleList = await ScheduleModel.aggregate([
                {
                    $match: {
                        stylist_id: ObjectId(req.body.stylist_id),
                        schedule_type: stylistActiveSchedule ? stylistActiveSchedule.active_schedule_type: 'basic'
                    }
                }
            ])
            if (!scheduleList.length) {
                const errorResponse = {
                    start_date: null,
                    end_date: null,
                    scheduled_days:[],
                    schedule_type: response.schedule_type ? response.schedule_type : "basic"
                }
                return apiResponse.successResponseWithData(res, 'Record not found', errorResponse)
            }
            if (scheduleList.length && scheduleList[0] && scheduleList[0].schedule_type == 'basic') {
                let currentDate = moment()
                for (let i = 1; i < 31; i++) {
                    let nextDay = currentDate.format('dddd')
                    nextDay = constants.WEEKDAY_LIST[nextDay]
                    let existDayDetails = null
                    let isActive = false
                    scheduleList.find(data => {
                        const isInScheduledDays = data.scheduled_days.find(o => o.day == nextDay)
                        if (isInScheduledDays) {
                            //isActive = data.active
                            isActive = isInScheduledDays.active;
                            existDayDetails = isInScheduledDays.scheduled_times
                        }
                    })
                    if (existDayDetails) {
                        response.scheduled_days.push({
                            date: new Date(currentDate.toDate()).getTime(),
                            active: isActive,
                            scheduled_times: existDayDetails
                        })
                    }
                    currentDate = currentDate.add(1, 'day')
                }
                response.start_date = response.scheduled_days[0].date
                response.end_date = response.scheduled_days[response.scheduled_days.length-1].date
            } else {
                let currentDate = moment()
                for (let i = 1; i < 31; i++) {
                    let nextDay = currentDate.format('dddd')
                    nextDay = constants.WEEKDAY_LIST[nextDay]
                    //const weekOfMonth = (0 | currentDate.date() / 7)+1;
                    let weekOfMonth;

                    let current_date = new Date(currentDate.toDate());
                    var month = current_date.getMonth(),
                      year = current_date.getFullYear(),
                      firstWeekday = new Date(year, month, 1).getDay() == 0 ? 7 : new Date(year, month, 1).getDay(),
                      lastDateOfMonth = new Date(year, month+1, 0).getDate(),
                      offsetDate = current_date.getDate() + firstWeekday -2,
                      index = 1,
                      weeksInMonth = index + Math.ceil((lastDateOfMonth + firstWeekday -7) / 7),

                      week = index + Math.floor(offsetDate/7);

                    weekOfMonth = week;

                    let existDayDetails = null
                    let isActive = false
                    scheduleList.find(data => {
                        const isInScheduledDays = data.scheduled_days.find(o => o.day == nextDay && data.week == weekOfMonth)
                        if (isInScheduledDays) {
                            //isActive = data.active
                            isActive = isInScheduledDays.active;
                            existDayDetails = isInScheduledDays.scheduled_times
                        }
                    })
                    if (existDayDetails) {
                        response.scheduled_days.push({
                            date: new Date(currentDate.toDate()).getTime(),
                            active: isActive,
                            scheduled_times: existDayDetails
                        })
                    }
                    currentDate = currentDate.add(1, 'day')
                }
                response.start_date = (response.scheduled_days.length && response.scheduled_days[0].date) || null;
                response.end_date = (response.scheduled_days.length && response.scheduled_days[response.scheduled_days.length-1].date) || null;
            }
            apiResponse.successResponseWithData(res, 'Record found', response)
        }catch (e) {
            return apiResponse.ErrorResponse(res, e.message, []);
        }
    }
]

exports.getAdminTimeSlots = [
    async (req,res,next) => {
        try{
            let service = await ConfigModel.findOne({})
            if(!service.schedule && service.schedule.length === 0){
                throw new Error("No Schedule found!")
            }
            service = JSON.parse(JSON.stringify(service))
            const obj = {
                start_date: "",
                end_date: "",
                holidays: service.holidays,
                scheduled_days: service.schedule
            }
            apiResponse.successResponseWithData(res,'Record found',obj)
        }catch (e) {
            return apiResponse.ErrorResponse(res, e.message, []);
        }
    }
]

exports.changeRefundMethod = [
    body("type").exists().notEmpty().trim().withMessage("Method Type is required"),
    async (req,res,next) => {
        try{
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
            }else{
                let user = await utility.verifyUser(req.headers.authorization.split(' ')[1]);
                await UserModel.findOneAndUpdate({ _id: user._id }, { default_refund_method: req.body.type });
                return apiResponse.successResponse(res, "Default method updated successfully")
            }
        }catch(err){
           return apiResponse.ErrorResponse(res, err.message, []);
        }
    }
]
// exports.transferToCard = [
//     async (req,res,next) => {
//         try{
//             let user = await utility.verifyUser(req.headers.authorization.split(" ")[1])
//             let balance = await UserModel.findOne({_id:user._id},{wallet_balance:1,cards:1});
//             if(balance.cards.length<=0){
//                 throw new Error("Please add card before proceeding")
//             }
//             if(balance.wallet_balance<=0){
//                 throw new Error("Insufficient funds!")
//             }
//             let default_card = balance.cards.filter(user=>{
//                 if(user.isDefault){
//                     return user;
//                 }
//             });
//             // console.log(default_card[0].customerId,balance.cards);
//             utility.createCharge(balance.wallet_balance,default_card[0].customerId).then(async result=>{
//                 console.log(result);
//                 return;
//                 let wallet = {
//                     user_id:user._id,
//                     amount:balance.wallet_balance,
//                     message:"Refund to card",
//                     type:"card-refund",
//                     transaction_type:"deduction",
//                 }
//                 //deduction Transaction for wallet.
//                 await TransactionModel.create(wallet)
//                 let card={
//                     user_id:user._id,
//                     amount:balance.wallet_balance,
//                     message:`Received from wallet ${balance.wallet_balance}`,
//                     type:"payment",
//                     transaction_type:"addition",
//                 }
//                 // addition Transaction for credit card
//                 await TransactionModel.create(card)
//                 await UserModel.updateOne({_id:user._id},{$set:{wallet_balance:0}});
//                 apiResponse.successResponseWithNoData(res,"Refund successfull!")
//             }).catch(err=>{
//                 return apiResponse.ErrorResponse(res, err.message, []);
//             })
//         }catch (e) {
//             return apiResponse.ErrorResponse(res, e.message, []);
//         }
//     }
// ]
// exports.cardToWallet = [
//     body("stripe_customer_id").exists().notEmpty().trim().withMessage("Stripe Customer id is required"),
//     body('amount').exists().notEmpty().trim().withMessage("amount is required"),
//     async (req,res,next) => {
//         try{
//             const errors = validationResult(req);
//             if (!errors.isEmpty()) {
//                 return apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
//             }
//             let user = await utility.verifyUser(req.headers.authorization.split(" ")[1]);
//             utility.createCharge(req.body.amount,req.body.stripe_customer_id).then(async result => {
//                 await CustomerTransaction.create({
//                     user_id:user._id,
//                     amount:req.body.amount,
//                     message:`${req.body.amount} deducted from card`,
//                     type:'payment',
//                     transaction_type:"deduction"
//                 })
//                 await CustomerTransaction.create({
//                     user_id:user._id,
//                     amount:req.body.amount,
//                     message:`${req.body.amount} added into wallet`,
//                     type:'other',
//                     transaction_type:"addition"
//                 })
//                 await UserModel.updateOne({_id:user._id},{$inc:{wallet_balance:req.body.amount}});
//                 apiResponse.successResponseWithNoData(res,'Successfully added into wallet')
//             }).catch(err=>{
//                 return apiResponse.ErrorResponseWithoutData(res,err.message)
//             })
//         }catch (e) {
//             return apiResponse.ErrorResponse(res, e.message, []);
//         }
//     }
// ]
