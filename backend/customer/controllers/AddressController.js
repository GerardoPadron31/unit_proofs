const UserModel = require("../models/UserModel");
const {body, validationResult} = require("express-validator");
//helper file to prepare responses.
const apiResponse = require("../helpers/apiResponse");
const utility = require("../helpers/utility");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
const constants = require("../helpers/constant");
var empty = require('is-empty');


/**
 * Add location
 *
 * @method POST
 * @param {string} lat
 * @param {string} lng
 * @param {string} address
 * @param {string} address_type
 *
 * @returns {Object}
 */
exports.addLocation = [
    //validate fields
    body('lat').exists().notEmpty().withMessage('lat is required.'),
    body('lng').exists().notEmpty().withMessage('lng is required.'),
    body('address').exists().notEmpty().withMessage('Address is required.'),
    body('address_type').exists().notEmpty().withMessage('Address type is required.'),
    body('city').exists().notEmpty().withMessage("City is required"),
    body('state').exists().notEmpty().withMessage("State is required"),
    body('country').exists().notEmpty().withMessage("Country is required"),
    body('country_code').exists().notEmpty().withMessage("Country Code is required"),
    body('state_code').exists().notEmpty().withMessage("State Code is required"),

    //process request after validation and sanitization
    async (req, res) => {
        try {
            // Extract the validation errors from a request.
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
            } else {

                //get current user
                utility.verifyUser(req.headers.authorization.split(' ')[1]).then(async auth => {
                    if (req.body.address_id) { // if address is present
                        let address = await UserModel.findOne({_id: ObjectId(auth._id)}, {addresses: 1})
                        if(!address || !address.addresses){
                            return apiResponse.successResponseWithData(res, "Address not found.", []);
                        }
                        let check_address = address.addresses
                        let _address = {
                            _id: req.body.address_id,
                            active: true,
                            address: req.body.address,
                            title: (req.body.title) ? req.body.title : '',
                            address_type: req.body.address_type,
                            state: req.body.state,
                            country: req.body.country,
                            country_code: req.body.country_code,
                            city: req.body.city,
                            lat: req.body.lat,
                            lng: req.body.lng,
                            zip_code: req.body.zip_code ? req.body.zip_code : '',
                            state_code: req.body.state_code,
                            location: {
                                type: "Point",
                                coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)]
                            }
                        }
                        if (check_address.length > 0) {
                            for (const i of check_address) { // updating previous addresses to not default
                                if (i.active === true) {
                                    await UserModel.updateOne({
                                        _id: ObjectId(auth._id),
                                        "addresses._id": ObjectId(i._id)
                                    }, {"$set": {"addresses.$.active": false}})
                                }
                            }
                        }
                        //update address
                        UserModel.updateOne({_id: ObjectId(auth._id), "addresses._id": ObjectId(req.body.address_id)}, {
                            "$set":
                                {
                                    "addresses.$.active": 1,
                                    "addresses.$.address": req.body.address,
                                    "addresses.$.title": req.body.title,
                                    "addresses.$.address_type": req.body.address_type,
                                    "addresses.$.lat": req.body.lat,
                                    "addresses.$.lng": req.body.lng,
                                    "addresses.$.state": req.body.state,
                                    "addresses.$.country": req.body.country,
                                    "addresses.$.country_code": req.body.country_code,
                                    "addresses.$.city": req.body.city,
                                    "addresses.$.zip_code": req.body.zip_code ? req.body.zip_code : '',
                                    "addresses.$.location.type": "Point",
                                    "addresses.$.state_code": req.body.state_code,
                                    "addresses.$.location.coordinates": [parseFloat(req.body.lng), parseFloat(req.body.lat)]
                                }
                        }).then(user => {
                            return apiResponse.successResponseWithData(res, "Address updated succseefully.", _address);
                        }).catch(err => {
                            return apiResponse.ErrorResponse(res, err.message, {});
                        })
                    } else {
                        let address = await UserModel.findOne({_id: ObjectId(auth._id)}, {addresses: 1})
                        if(!address || !address.addresses){
                            return apiResponse.successResponseWithData(res, "Address not found.", []);
                        }
                        let check_address = address.addresses               
                        let _address = {
                            _id: ObjectId(),
                            active: true,
                            address: req.body.address,
                            title: (req.body.title) ? req.body.title : '',
                            address_type: req.body.address_type,
                            state: req.body.state,
                            state_code: req.body.state_code,
                            country: req.body.country,
                            country_code: req.body.country_code,
                            city: req.body.city,
                            zip_code: req.body.zip_code ? req.body.zip_code : '',
                            lat: req.body.lat,
                            lng: req.body.lng,
                            location: {
                                type: "Point",
                                coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)]
                            }
                        }
                        if (check_address.length > 0) {
                            for (const i of check_address) { // updating previous addresses to not default
                                if (i.active === true) {
                                    await UserModel.updateOne({
                                        _id: ObjectId(auth._id),
                                        "addresses._id": ObjectId(i._id)
                                    }, {"$set": {"addresses.$.active": false}})
                                }
                            }
                        }
                        if (address.addresses.length <= 0) {
                            _address.relation = 1
                        } else {
                            _address.relation = 0
                        }
                        //add new address
                        UserModel.updateOne({_id: ObjectId(auth._id)}, {
                            $push: {
                                addresses: _address
                            }
                        }, function (location_err, location) {
                            if (location_err) {
                                return apiResponse.ErrorResponse(res, location_err.message, {});
                            }

                            return apiResponse.successResponseWithData(res, "Address added succseefully.", _address);
                        });
                    }

                }).catch(auth_err => {
                    console.log(auth_err)
                    return apiResponse.ErrorResponse(res, 'Authorization failed.', {});
                });
            }
        } catch (err) {
            return apiResponse.ErrorResponse(res, err.message, {});
        }
    }];

exports.listAddresses = [
    (req, res) => {
        try {
            //get current user
            utility.verifyUser(req.headers.authorization.split(' ')[1]).then(auth => {

                UserModel.aggregate([
                  { $match: {_id: ObjectId(auth._id)} },
                  { $unwind: "$addresses" },
                  { $sort:
                    {"addresses.active":-1, "addresses.created_at":1}
                  },
                  { $group:
                    {_id:"$_id", addresses:{$push:"$addresses"}}
                  },
                  {$project:{addresses:1}}
                ]).exec(
                //UserModel.findOne({_id: ObjectId(auth._id)}, {addresses: 1}, 
                  function (user_err, user) {
                    if (user_err) {
                        return apiResponse.ErrorResponse(res, user_err.message, []);
                    }
                    if(user && user[0] && user[0].addresses){
                      return apiResponse.successResponseWithData(res, "Address found successfully.", user[0].addresses);
                    }else{
                      return apiResponse.successResponseWithData(res, "Address not found.", []);
                    }
                });
            }).catch(auth_err => {
                return apiResponse.ErrorResponse(res, 'Authorization failed.', []);
            });
        } catch (err) {
            return apiResponse.ErrorResponse(res, err.message, []);
        }
    }
];

exports.deleteAddress = [
    body('address_id').exists().notEmpty().trim().withMessage('Address id is required.'),
    (req, res) => {
        try {
            // Extract the validation errors from a request.
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
            } else {
                //get current user
                utility.verifyUser(req.headers.authorization.split(' ')[1]).then(auth => {
                    UserModel.findOne({
                        _id: ObjectId(auth._id),
                        'addresses._id': ObjectId(req.body.address_id)
                    }, function (user_err, user) {
                        if (user_err) {
                            return apiResponse.ErrorResponseWithoutData(res, user_err.message);
                        }
                        if (!empty(user) && user.addresses) {
                            console.log(user.addresses.map(obj => {
                                return obj._id
                            }).indexOf(req.body.address_id));

                            const check = user.addresses.map(obj => {
                                return obj._id
                            }).indexOf(req.body.address_id);

                            for (var i = 0; i < user.addresses.length; i++) {
                                if (user.addresses[i]._id.toString() === req.body.address_id) {
                                    user.addresses.pull({
                                        _id: ObjectId(req.body.address_id)
                                    });
                                }
                            }

                            user.save(function (updated_user_err, updated_user) {
                                if (updated_user_err) {
                                    console.log(updated_user_err)
                                    return apiResponse.ErrorResponseWithoutData(res, updated_user_err.message);
                                }
                                return apiResponse.successResponse(res, "Address deleted successfully.");
                            });
                        } else {
                            return apiResponse.ErrorResponseWithoutData(res, "Not Found.");
                        }
                    });
                }).catch(auth_err => {
                    return apiResponse.ErrorResponseWithoutData(res, 'Authorization failed.');
                });
            }
        } catch (err) {
            console.log(err);
            return apiResponse.ErrorResponseWithoutData(res, err.message);
        }
    }
];

exports.changeAddressStatus = [
    body('address_id').exists().notEmpty().trim().withMessage('Address id is required.'),
    body('active').exists().notEmpty().trim().withMessage('active is required.'),
    (req, res) => {
        try {
            // Extract the validation errors from a request.
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
            } else {
                //get current user
                utility.verifyUser(req.headers.authorization.split(' ')[1]).then(auth => {
                    UserModel.findOne({
                        _id: ObjectId(auth._id),
                        'addresses._id': ObjectId(req.body.address_id)
                    }, function (user_err, user) {
                        if (user_err) {
                            return apiResponse.ErrorResponse(res, user_err.message, {});
                        }
                        if (!empty(user) && user.addresses) {
                            for (var i = 0; i < user.addresses.length; i++) {
                                user.addresses[i].active = 0;
                                if (user.addresses[i]._id.toString() === req.body.address_id) {
                                    user.addresses[i].active = req.body.active;
                                }
                            }

                            user.save(function (updated_user_err, updated_user) {
                                if (updated_user_err) {
                                    return apiResponse.ErrorResponse(res, updated_user_err.message, {});
                                }
                                let address = updated_user.addresses.find(elem => {
                                    //sending only updated family member
                                    if (elem._id.toString() === req.body.address_id) {
                                        return elem;
                                    }
                                })
                                if (address)
                                    return apiResponse.successResponseWithData(res, "Address updated successfully.", address);
                            });
                        }else{
                            return apiResponse.successResponseWithData(res, "Address not found.", []);
                        }
                    });
                }).catch(auth_err => {
                    return apiResponse.ErrorResponse(res, 'Authorization failed.', {});
                });
            }
        } catch (err) {
            return apiResponse.ErrorResponse(res, err.message, {});
        }
    }
];
