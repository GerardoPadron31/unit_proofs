const RatingModel = require("../models/RatingModel");
const CustomerModel = require("../models/UserModel");
const ServiceProviderModel = require("../models/ServiceProviderModel");
const Service  = require("../models/ServiceModel");
const CustomService = require("../models/CustomServiceModel");
const { body,validationResult } = require("express-validator");
const apiResponse = require("../helpers/apiResponse");
const mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
let constants = require("../helpers/constant");

exports.listStylistRating = [
    body("stylist_id").exists().notEmpty().trim().withMessage("Stylist Id is required.").custom((value) => {
        return ServiceProviderModel.findOne({_id : value}).then((user) => {
            if (!user) {
                return Promise.reject("This stylist does not exists");
            }
        });
    }),
    async (req,res,next) => {
        try{
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
            }
            let limit = req.body.limit?parseInt(req.body.limit):10;
            let page = req.body.page?req.body.page-1:0;
            let skip = limit*page;
            let sort  = req.body.filter?req.body.filter:'highest';
            let queryObj ={};
            if(sort=="highest"){
                queryObj= {value:-1};
            }else if(sort=="lowest"){
                queryObj= {value:1};
            }else if(sort=="newest") {
                queryObj= {_id:-1};
            }else{
                apiResponse.ErrorResponseWithoutData(res,'Not a valid value for filter');
                return;
            }
            console.log(queryObj);
            let rating =await RatingModel.aggregate([
                {$match:{stylist_id:ObjectId(req.body.stylist_id), reviewed_by: "customer"}},
                {$lookup:{from:'users',localField:'user_id',foreignField:'_id',as:'user'}},
                {$unwind:{path:'$user',preserveNullAndEmptyArrays: true}},
                {$skip:skip},
                {$limit:limit},
                {$sort:queryObj},
                {$addFields:{
                    "timestamp":{"$toLong":"$updated_at"}
                    }},
                {$project:{
                        "value": 1,
                        "reviewed_by": 1,
                        "message": 1,
                        "user_id": 1,
                        "stylist_id": 1,
                        "created_at": 1,
                        "updated_at": 1,
                        "timestamp":1,
                        "first_name": {$cond:[{$gt:["$user.firstname", null]}, "$user.firstname", ""]},
                        "last_name": {$cond:[{$gt:["$user.lastname", null]}, "$user.lastname", ""]},
                        //"first_name":"$user.firstname",
                        //"last_name":"$user.lastname",
                        "full_name":"$user.full_name",
                        //"profile_pic": "$user.profile"
                        "profile_pic":{
                            $cond:{
                                if:{$gt:["$user.profile", null]},
                                then:{$concat:[constants.IMAGEKIT_URL,"$user.profile"]},
                                else:"",
                            }
                        },
                    }}
            ])
            if(!rating){
                apiResponse.ErrorResponseWithoutData(res,'No records found!')
                return;
            }

            apiResponse.successResponseWithData(res,'Record found',rating);
        }catch (e) {
            return apiResponse.ErrorResponse(res, e.message,{});
        }
    }
]
