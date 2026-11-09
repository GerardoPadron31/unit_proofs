const Contacts = require("../models/ContactsModel");
const { body, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const utility = require("../helpers/utility");
const apiResponse = require("../helpers/apiResponse");

exports.createContact = [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("phone_number").trim().notEmpty().withMessage("Phone number is required"),
    async (req,res, next) => {
        try{
            const errors = validationResult(req);
            if(!errors.isEmpty()) {
                return apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
            }
            let customer = await utility.verifyUser(req.headers.authorization.split(' ')[1]);

            Contacts.find({}).then(user => {
                let names = user.map(obj=>{
                    return obj['name']
                });
                let phone_number = user.map(obj=>{
                    return obj['phone_number']
                });
            
                if(phone_number.indexOf(parseInt(req.body.phone_number)) >= 0 && names.indexOf(req.body.name) >= 0){
                    apiResponse.ErrorWithoutData(res, 'This name and mobile number is already entered!');
                    return;
                }

                let creationObject = {
                    user_id: customer._id,
                    name: req.body.name,
                    phone_number: req.body.phone_number
                }

                Contacts.create(creationObject).then(result => {
                    apiResponse.successResponseWithData(res, 'Record created!', result);
                }).catch(e=>{
                    return apiResponse.ErrorResponse(res, e.message, {});  
                });
            }).catch(e => {
                return apiResponse.ErrorResponse(res, e.message, {});
            })
        }catch (e) {
            return apiResponse.ErrorResponse(res, e.message, {});
        }
    }
]

exports.listContact = [
    async (req, res, next) => {
        try{
            let user = await utility.verifyUser(req.headers.authorization.split(' ')[1]);
            Contacts.find({user_id : user._id}).then(result => {
                return apiResponse.successResponseWithData(res, 'Record found!', result);
            }).catch(e => {
                return apiResponse.ErrorResponse(res, e.message, {});
            })
        }catch(e) {
            return apiResponse.ErrorResponse(res, e.message, {});
        }
    }
]

exports.deleteContact = [
    body("contact_id").trim().notEmpty().withMessage("contact_id is required").custom((value) => {
        return Contacts.findOne({_id: value}).then((user) => {
            if(!user) {
                return Promise.reject("Contact not found");
            }
        }); 
    }),
    async (req, res, next) => {
        try{
            const errors = validationResult(req);
            if(!errors.isEmpty()){
                return apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
            }
            Contacts.deleteOne({_id:req.body.contact_id}).then(user => {
                apiResponse.successResponseWithNoData(res, 'Contact deleted!');
                return;
            }).catch(er => {
                return apiResponse.ErrorResponse(res, er.message, {});
            })
        }catch(e) {
            return apiResponse.ErrorResponse(res, e.message, {})
        }
    }
]
