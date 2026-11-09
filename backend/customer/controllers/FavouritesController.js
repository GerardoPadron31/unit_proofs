const FavModel = require("../models/FavouritesModel");
const UserModel = require("../models/UserModel");
const { body,validationResult } = require("express-validator");
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

const constants = require("../helpers/constant");
const apiResponse = require("../helpers/apiResponse");
const utility = require("../helpers/utility");
const ScheduleModel = require('../models/ScheduleModel');
const OrderModel = require("../models/OrderModel");
exports.addServiceAndStylistToFavourites = async (req,res,next) => {
    try{
        body('user_id').exists().notEmpty().withMessage('User id is required.')
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }
        if(!req.body.service_id && !req.body.stylist_id) {
            return apiResponse.validationError(res,'Please enter either stylist or service id');
        }
        let expression;
        if(req.body.stylist_id){
            expression =  {user_id:req.body.user_id,stylist_id:req.body.stylist_id}
            let user  = await UserModel.findOne({_id:req.body.user_id,blocked_stylist:{$elemMatch:{stylist_id:req.body.stylist_id,block_status:'active'}}})
            if(user) {
                return apiResponse.ErrorResponseWithoutData(res,'This user is present in blocked list!');
            }
        }
        if(req.body.service_id){
            expression =  {user_id:req.body.user_id,service_id:req.body.service_id}
        }
        let favCheck=await FavModel.findOne(expression,{_id:1})
        if(favCheck){
            return apiResponse.notFoundResponseWithNoData(res,'Record already present!')
        }
        let createData = {
            user_id:req.body.user_id,
            stylist_id: req.body.stylist_id,
            service_id: req.body.service_id,
            type:req.body.type
        }
        FavModel.create(createData).then(data=>{
            return apiResponse.successResponseWithData(res,'Record created!',data);
        }).catch(err=>{
            console.log(err)
            return apiResponse.ErrorResponse(res, err.message,{});
        })
    }catch (e) {
        console.log(e)
        return apiResponse.ErrorResponse(res, e.message,{});
    }
}
// This will only list regular services
exports.listFavServices = async (req,res,next) => {
    try {
        body("user_id").exists().notEmpty().withMessage("User id is required.");
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return apiResponse.validationErrorWithData(res, errors.array()[0]["msg"], errors.array());
        }
        let services = await FavModel.aggregate([
            { $match: { user_id: ObjectId(req.body.user_id), service_id: { $type: "objectId" } } },
            { $lookup: { from: "services", localField: "service_id", foreignField: "_id", as: "service" } },
            { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
            { $lookup: { from: "service_providers", localField: "custom_service.stylist_id", foreignField: "_id", as: "provider" } },
            { $unwind: { path: "$provider", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "ratings",
                    localField: "service_id",
                    foreignField: "service_id",
                    as: "ratings",
                },
            },
            {
                $project: {
                    _id: "$service._id",
                    category_id: "$service.category_id",
                    duration: "$service.duration",
                    available_for: { $cond: ["$service.age_group", "$service.age_group", ""] },
                    stylist_type: "$service.stylist_type",
                    description: "$service.description",
                    regular_price: "$service.regular_price",
                    cart_quantity: "$service.cart_quantity",
                    sale_price: "$service.sale_price",
                    quantity: "$service.quantity",
                    featured_image:{
                        $cond:{
                            if:{$eq:["$service.featured_image", ""]},
                            then:"",
                            else:{$concat:[constants.IMAGEKIT_URL,"$service.featured_image"]}
                        }
                    },
                    section_image:{
                        $cond:{
                            if:{$eq:["$service.section_image", ""]},
                            then:"",
                            else:{$concat:[constants.IMAGEKIT_URL,"$service.section_image"]}
                        }
                    },
                    images: {
                        $map: {
                            input: "$service.mobile_images",
                            as: "images",
                            in: {$concat:[constants.IMAGEKIT_URL,"$$images"]},
                        },
                    },
                    videos: {
                        $map: {
                            input: "$service.mobile_videos",
                            as: "video",
                            in: {
                                _id: "$$video._id",
                                video: {$concat:[constants.IMAGEKIT_URL,"$$video.url"]},
                                thumbnail: "",
                            },
                        },
                    },
                    web_images: {
                        $map: {
                            input: "$service.web_images",
                            as: "images",
                            in: {$concat:[constants.IMAGEKIT_URL,"$$images"]},
                        },
                    },
                    web_videos: {
                        $map: {
                            input: "$service.web_videos",
                            as: "video",
                            in: {
                                _id: "$$video._id",
                                video: { $concat: [constants.IMAGEKIT_URL, "$$video.url"] },
                            },
                        },
                    },
                    regular_price_currency: "$service.regular_price_currency",
                    sale_price_currency: "$service.sale_price_currency",
                    title: "$service.title",
                    created_at: "$service.created_at",
                    status: "$service.status",
                    updated_at: "$service.updated_at",
                },
            },
        ]);
        if (services.length <= 0) {
            return apiResponse.successResponseWithData(res, "Record not found", []);
        }
        return apiResponse.successResponseWithData(res, "Record found", services);
    } catch (e) {
        console.log(e);
        return apiResponse.ErrorResponse(res, e.message, {});
    }
}

exports.listFavStylist = async (req,res,next) => {
    try{
        body('user_id').exists().notEmpty().withMessage('User id is required.')
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
        }
        let utl = await utility.verifyUser(req.headers.authorization.split(' ')[1])
        let user = await UserModel.findOne({_id:req.body.user_id},{blocked_stylist:1})
        let blocked_stylists = user && user.blocked_stylist.length > 0  ? user.blocked_stylist : [];
        let blockStylistIds=[];
        if (blocked_stylists.length > 0) {
            blockStylistIds = blocked_stylists.map(obj=>{
                if (obj.block_status === 'active'){
                    return obj.stylist_id
                }
            })
        }
        console.log(blockStylistIds)
        let stylist = await FavModel.aggregate([
            {$match:{user_id:ObjectId(req.body.user_id),stylist_id:{$nin:blockStylistIds}}},
            {$lookup:{from:'service_providers',localField:'stylist_id',foreignField:'_id',as:'stylist'}},
            {$unwind:{path:'$stylist',preserveNullAndEmptyArrays:false}},
            // Check if this customer is blocked by any of the possible stylists
            {$match:{$expr:{$not:{$in:[ObjectId(req.body.user_id),"$stylist.blocked_customer"]}}}},
            {
                $lookup:{
                    from:'ratings',
                    localField:"stylist_id",
                    foreignField:"stylist_id",
                    as:"ratings"
                }
            },
            {$project:{
                _id:1,
                "stylist._id":1,
                "stylist.experience":1,
                "stylist.online":1,
                "stylist.active_schedule_type":1,
                "stylist.profile":{
                    $cond:{
                        if:{$eq:["$stylist.profile", ""]},
                        then:"",
                        else:{$concat:[constants.IMAGEKIT_URL,"$stylist.profile"]}
                    }
                },
                "stylist.avg_rating":{ $toString: {$cond:[{$size:"$ratings"},{$avg:"$ratings.value"},0]} },
                "stylist.firstname":1,
                "stylist.lastname":1,
                "stylist.middlename":1
            }}
        ])
        if(stylist<=0){
            return apiResponse.successResponseWithData(res,'Record not found', []);
        }
        /*
        let updatedStylistDetail = [];

        let isOrderActive = 0
        let isSlotAvailable = 0
        for(let i = 0; i < stylist.length; i++){
            const element = stylist[i]
            const activeOrderInfo = await OrderModel.findOne({ stylist_id: element.stylist && element.stylist._id, booking_status: { $in: [1,2,3,9] }});
            if(activeOrderInfo){
                isOrderActive = 1
            }else{
                isOrderActive = 0
            }
            const scheduleInfo = await ScheduleModel.findOne({ stylist_id: element.stylist && element.stylist._id, schedule_type: element.stylist && element.stylist.active_schedule_type });
            if(scheduleInfo){     
                scheduleInfo.scheduled_days && scheduleInfo.scheduled_days.map((scheduleDays)=>{
                    const isAllDisable = scheduleDays.scheduled_times.filter(timeInfo => timeInfo.active == 1).length == scheduleDays.scheduled_times.length
                    if(isAllDisable){
                        isSlotAvailable = 1
                    }
                })
            }else{
                isSlotAvailable = 0
            }
            updatedStylistDetail.push({
                ...element,
                is_order_active: isOrderActive,
                is_slots_available: isSlotAvailable
            })
        }
        */
        return apiResponse.successResponseWithData(res,'Record found',stylist);
    }catch (e) {
        return apiResponse.ErrorResponse(res, e.message,{});
    }
}

exports.removeServiceOrStylist = async (req,res,next) => {
    try{
        let {body} = req;
        let query;
        let user = await utility.verifyUser(req.headers.authorization.split(' ')[1])
        if (body.service_id){
            query = {user_id:user._id,service_id:body.service_id}
        }else if(body.stylist_id){
            query = {user_id:user._id,stylist_id:body.stylist_id}
        }else{
            return apiResponse.ErrorResponseWithoutData(res,"Unexpected!");
        }
        console.log(query);
        FavModel.findOne(query).then(async user=> {
            if(!user){
                apiResponse.ErrorResponseWithoutData(res, 'Record not found!');
                return
            }
            await FavModel.deleteOne(query);
            apiResponse.successResponseWithNoData(res, 'Record deleted!');
        }).catch(e => {
            return apiResponse.ErrorResponse(res, e.message,{});
        })
    }catch (e) {
        return apiResponse.ErrorResponse(res, e.message,{});
    }
}
