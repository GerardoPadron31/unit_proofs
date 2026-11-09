const User = require("../models/UserModel");
const apiResponse = require("../helpers/apiResponse");
const utility = require("../helpers/utility");
const { body,validationResult } = require("express-validator");
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
exports.blockStylist = [
    body('stylist_id').exists().notEmpty().withMessage('Stylist id is required.'),
    body('name').exists().notEmpty().withMessage('Name is required.'),
    body('image').exists().notEmpty().withMessage('Image is required.'),
    body('experience').exists().notEmpty().withMessage('Experience is required.'),
    async (req,res,next) => {
        try{
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
            }
            let utl = await utility.verifyUser(req.headers.authorization.split(' ')[1])
            console.log(utl);
            let user = await User.aggregate([
                {$match:{_id:ObjectId(utl._id)}},
                {
                    $addFields:{
                        stylist_id:{$convert:{input:req.body.stylist_id,to:"objectId"}},
                    }
                },
                {$project:{
                        stylist: {
                            $filter: {
                                input: "$blocked_stylist",
                                as: "stylist",
                                cond: { $eq: [ "$$stylist.stylist_id", "$stylist_id" ] }
                            }
                        }
                    }}
            ])
            console.log(user[0])
            if(user.length>0 && user[0].stylist.length>0) {
                throw new Error("This record is already added!")
            }
            console.log(ObjectId())
            let obj = {
                _id:ObjectId(),
                stylist_id:req.body.stylist_id,
                name:req.body.name,
                image:req.body.image,
                block_status:req.body.block_status,
                experience:req.body.experience
            }
           User.updateOne({_id:utl._id},{$push:{blocked_stylist:obj}}).then(user => {
                console.log(user);
               return apiResponse.successResponseWithData(res,"Record updated!",obj);
           }).catch(err=> {
               return apiResponse.ErrorResponseWithoutData(res,err.message);
           })
        }catch (e) {
            return apiResponse.ErrorResponseWithoutData(res,e.message);
        }
    }
]
exports.blockUnBlockStylist = [
    body('item_id').exists().notEmpty().withMessage('Block item id is required.'),
    body("status").isIn(["inactive","active"]).exists().notEmpty().withMessage("Please enter valid status"),
    async (req,res,next) => {
        try{
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
            }
            let utl = await utility.verifyUser(req.headers.authorization.split(' ')[1])
            let user = await User.aggregate([
                {$match:{_id:ObjectId(utl._id)}},
                {
                    $addFields:{
                        item_id:{$convert:{input:req.body.item_id,to:"objectId"}},
                    }
                },
                {$project:{
                        stylist: {
                            $filter: {
                                input: "$blocked_stylist",
                                as: "stylist",
                                cond: { $eq: [ "$$stylist._id", "$item_id" ] }
                            }
                        }
                    }}
            ])
            if(user.length<0 && !user[0].stylist) {
                throw new Error("This item id is not valid")
            }
            User.updateOne(
                {_id:utl._id},
                {$set:{"blocked_stylist.$[inner].block_status":req.body.status}},
                {"arrayFilters":[
                        {"inner._id":req.body.item_id}
                    ]}
            ).then(user => {
                console.log(user);
                apiResponse.successResponseWithNoData(res,'Record updated!')
                return;
            }).catch(err => {
                throw new Error(err.message);
            })
        }catch (e) {
            return apiResponse.ErrorResponseWithoutData(res,e.message);
        }
    }
]
exports.removeFromBlockedList = [
    body('stylist_id').exists().notEmpty().withMessage('Stylist id is required.'),
    async (req,res,next) => {
        try{
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
            }
            let utl = await utility.verifyUser(req.headers.authorization.split(' ')[1])
            let user = await User.aggregate([
                {$match:{_id:ObjectId(utl._id)}},
                {
                    $addFields:{
                        stylist_id:{$convert:{input:req.body.stylist_id,to:"objectId"}},
                    }
                },
                {$project:{
                        stylist: {
                            $filter: {
                                input: "$blocked_stylist",
                                as: "stylist",
                                cond: { $eq: [ "$$stylist.stylist_id", "$stylist_id" ] }
                            }
                        }
                    }}
            ])
            if(user.length<0 && !user[0].stylist) {
                throw new Error("This item id is not valid")
            }
            User.updateOne({_id:utl._id},
                {$pull:
                        {"blocked_stylist":{"stylist_id":req.body.stylist_id}}}).then(user => {
                apiResponse.successResponseWithNoData(res,'Record updated!')
                return;
            }).catch(err => {
                throw new Error(err.message)
            })
        }catch (e) {
            return apiResponse.ErrorResponseWithoutData(res,e.message);
        }
    }
]
exports.listBlockedStylist = [
    async (req,res,next) => {
        try{
            let utl = await utility.verifyUser(req.headers.authorization.split(' ')[1])
            let limit = req.query.limit?parseInt(req.query.limit):10
            let page = req.query.page?parseInt(req.query.page):0
            let skip  = limit * page;
            let user  = await User.findOne({_id:utl._id},{blocked_stylist:1,_id:0}).limit(limit).skip(skip);
            if(!user){
                throw new Error("This user is not present")
            }
            if(!user.blocked_stylist){
                throw new Error("No record found!")
            }
            return apiResponse.successResponseWithData(res,"Record found!",user.blocked_stylist);
        }catch (e) {
            return apiResponse.ErrorResponseWithoutData(res,e.message);
        }
    }
]
