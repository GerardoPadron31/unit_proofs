const UserModel = require("../models/UserModel");
const TempOtp = require("../models/TempOtp");
const Booking = require("../models/OrderModel");
const ConfigModel = require("../models/ConfigModel");
const { body, validationResult } = require("express-validator");

//helper file to prepare responses.
const apiResponse = require("../helpers/apiResponse");
const utility = require("../helpers/utility");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
var mongoose = require("mongoose");
var ObjectId = mongoose.Types.ObjectId;
const constants = require("../helpers/constant");
var empty = require("is-empty");
const RewardVouchers = require("../models/RewardVouchers");
const stripe = require("stripe")(process.env.STRIPE_KEY);

/**
 * Get Profile.
 *
 * @method GET
 * @returns {Object}
 */
exports.getProfile = [
    async (req, res) => {
        try {
            // get current login user
            utility
                .verifyUser(req.headers.authorization.split(" ")[1])
                .then(async auth => {
                    const userData = await getuserData(auth._id);
                    return apiResponse.successResponseWithData(res, "User found successfully.", userData);
                })
                .catch(auth_err => {
                    return apiResponse.ErrorResponse(res, "Authorization failed.", {});
                });
        } catch (err) {
            return apiResponse.ErrorResponse(res, err.message, {});
        }
    },
];

/**
 * Update Profile.
 *
 * @method POST
 * @returns {Object}
 */
exports.updateProfile = [
    body("password")
    .exists()
    .notEmpty()
    .trim()
    .isLength({ min: 6 })
    .trim()
    .withMessage("Password must be 6 characters or greater."),
  async (req, res) => {
    try {
      // Extract the validation errors from a request.
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return apiResponse.validationErrorWithData(
          res,
          //errors.array()[0]["msg"],
          errors.array()
        );
      }


      //get current logged in user
      utility
        .verifyUser(req.headers.authorization.split(" ")[1])
        .then(async (auth) => {

          let user = await UserModel.findOne({ _id: auth._id }, { password: 1 });
          if (!user) {
            return apiResponse.ErrorResponseWithoutData(res, 'Customer not found!');
          }
      
          console.log("in");
          bcrypt.compare(req.body.password, user.password, async(bcrypt_err, result)=>{
            if(bcrypt_err){
              console.log(bcrypt_err);
              return apiResponse.ErrorResponseWithoutData(res, "Error checking password");
            }
            if(!result){
              return apiResponse.ErrorResponseWithoutData(res, "Password do not match");
            }

           
          //update only what is coming in request
          var data_to_update = {};

          if (req.body.email) {
            //validate email
            await UserModel.findOne({ email: req.body.email }).then(
              async (user) => {
                if (user) {
                  return apiResponse.ErrorResponse(
                    res,
                    "Email already is already in use.",
                    {}
                  );
                } else {
                  data_to_update.email = req.body.email;
                }
                /* Mobile number cannot be changed
                if (req.body.phone_number && req.body.country_code) {
                  //validate phone number
                  await UserModel.findOne({
                    phone_number: req.body.phone_number,
                    country_code: req.body.country_code,
                  }).then((user_phone) => {
                    if (user_phone) {
                      return apiResponse.ErrorResponse(
                        res,
                        "Phone Number is already in use.",
                        {}
                      );
                    } else {
                      data_to_update.phone_number = req.body.phone_number;
                      data_to_update.country_code = req.body.country_code;
                    }
                  });
                }
                */
              }
            );
          }

          if (req.body.firstname) {
            data_to_update.firstname = req.body.firstname;
          }

          if (req.body.lastname) {
            data_to_update.lastname = req.body.lastname;
          }

          if (req.body.dob) {
            data_to_update.dob = req.body.dob;
          }

          if (req.body.gender) {
            data_to_update.gender = req.body.gender;
          }


          await UserModel.updateOne(
            { _id: ObjectId(auth._id) },
            { $set: data_to_update }
          )
            .then(async (updated) => {
              const userData = await getuserData(auth._id);
              return apiResponse.successResponseWithData(
                res,
                "User details updated successfully.",
                userData
              );
            })
            .catch((update_err) => {
              return apiResponse.ErrorResponse(res, update_err.message, {});
            });
          });
        })
        .catch((auth_err) => {
          return apiResponse.ErrorResponse(res, "Authorization failed.", {});
        });
    } catch (err) {
      return apiResponse.ErrorResponse(res, err.message, {});
    }
  },
];

exports.updatePassword = [
  body("password")
    .exists()
    .notEmpty()
    .trim()
    .isLength({min:6})
    .trim()
    .withMessage("Password must be 6 characters of greater."),
  body("newPassword")
    .exists()
    .notEmpty()
    .trim()
    .isLength({min:6})
    .trim()
    .withMessage("Password must be 6 characters of greater."),
  async(req, res)=>{
    try{
      const errors = validationResult(req);
      if(!errors.isEmpty()){
        return apiResponse.validationErrorWithData(res, "Missing paramters",errors.array())
      }

      utility
        .verifyUser(req.headers.authorization.split(" ")[1])
        .then(async (auth) =>{
          let user = await UserModel.findOne({ _id: auth._id });
          if(!user){
            return apiResponse.ErrorResponseWithoutData(res, 'Customer not found!');
          }

          bcrypt.compare(req.body.password, user.password, async(bcrypt_err, result)=>{
            if(bcrypt_err){
              console.log(bcrypt_err);
              return apiResponse.ErrorResponseWithoutData(res,"Error checking password");
            }
            if(!result){
              return apiResponse.ErrorResponseWithoutData(res, "Password do not match");
            }

            // Hash password
            bcrypt.hash(req.body.newPassword, 10, async(err, hash)=>{
              let result = await UserModel.updateOne({ _id: ObjectId(auth._id)},{$set:{"password":hash}})
              console.log(result);
              apiResponse.successResponseWithData(res, "Password updated",{});
            });
          });
      }).catch((auth_err)=>{
        return apiResponse.ErrorResponse(res, "Authorization failed.", {});
      });
    }catch(err){
      console.log(err);
      return apiResponse.ErrorResponse(err, err.message, {})
    }
  }
  
];

exports.deleteCustomerById = [
    async (req, res) => {
        try {
            const id = req.params.id;
            const user = await UserModel.findOne({_id:ObjectId(id)});
            if(!user){
              return apiResponse.ErrorResponse(res, "User doesn't found", {});
            }
            const customer = await utility.verifyUser(req.headers.authorization.split(" ")[1])
            if(customer._id != id){
              return apiResponse.ErrorResponse(res, "You cannot remove other users", {});
            }
            //Verify user doesn't have an active service.
            const config = await ConfigModel.findOne({},{SD_service_request_expiration_duration:1, OD_service_request_expiration_duration:1});
            const UserBookings = await Booking.find({
              user_id:ObjectId(user._id),
              booking_status:{ $nin: [4,5,6,8,10]}
            });
            for(const booking of UserBookings){
              if(booking.booking_status === 0){
                const expr_date = Number(booking.date) 
                  + (
                      (
                        direct_order
                        ? config.OD_service_request_expiration_duration
                        : config.SD_service_request_expiration_duration
                      )
                    * 60 * 1000) 
                if(Date.now() < expr_date){
                  return apiResponse.ErrorResponseWithoutData(res, "You cannot delete the user because there is an active service");
                }
              }else{
                return apiResponse.ErrorResponseWithoutData(res, "You cannot delete the user because there is an active service");
              }
            };

            //Verify if any family member have an active booking
            if(user.family_members.length > 0){
              for(const familyMember of user.family_members){
                const FamilyMemberBookings = await Booking.find({
                  user_id:ObjectId(familyMember._id),
                  booking_status:{ $nin: [4,5,6,8,10]}
                });
                for(const booking of FamilyMemberBookings){
                  if(booking.booking_status === 0){
                    const expr_date = Number(booking.date) 
                      + (
                          (
                            direct_order
                            ? config.OD_service_request_expiration_duration
                            : config.SD_service_request_expiration_duration
                          )
                        * 60 * 1000) 
                    if(Date.now() < expr_date){
                      return apiResponse.ErrorResponseWithoutData(res, "You cannot delete the user because there is an active service");
                    }
                  }else{
                    return apiResponse.ErrorResponseWithoutData(res, "You cannot delete the user because there is an active service");
                  }
                };
              }
            }

            /* //Verify if the user has family members and delete their profile images in the bucket
            if(user.family_members.length > 0){
              for(const familyMember of user.family_members){
                await utility.deleteFilesFromS3BucketWithPromise(familyMember.profile).catch((err)=>{
                  if(!err.message.includes("NoSuchKey")){
                    throw Error(`Something went wrong while deleting the images of this family memmber: ${familyMember.firstname} with this relation: ${familyMember.relation} and this was the error: ${err.message}`)
                  }
                });
              }
            } */

            /* //delete user's profile image
            if(user.profile != ""){
              await utility.deleteFilesFromS3BucketWithPromise(user.profile).catch((err)=>{
                if(!err.message.includes("NoSuchKey")){
                  throw Error(`Something went wrong while deleting the images of the user: ${user.firstname} and this was the error: ${err.message}`)
                }
              })
            } */

            //Low logic
            await UserModel.updateOne({_id: ObjectId(id)},{$set:{status:false, deleted:true}});
            return apiResponse.successResponse(res, "User deleted successfully.");
        } catch (err) {
            return apiResponse.ErrorResponse(res, err.message, {});
        }
    },
];

/**
 * Update Profile Image
 *
 * @method POST
 * @param {file}   profile
 *
 * @returns {Object}
 */
exports.updateProfileImage = [
  (req, res) => {
    try {
      if (req.files && !empty(req.files)) {
        //get current logged in user
        utility
          .verifyUser(req.headers.authorization.split(" ")[1])
          .then((auth) => {
            //get profile of current user
            UserModel.findOne({ _id: ObjectId(auth._id) }, { profile: 1, media_id: 1 })
              .then(async (customer) => {
                if (customer && !empty(customer)) {
                  await Promise.all(req.files.map(async(element)=>{
                    if (element.fieldname == "profile") {
                      //upload new profile image to s3 bucket
                      /* if (customer.profile != "") {
                        utility.deleteS3File(
                          customer.profile,
                          process.env.AWS_BUCKET_NAME
                        );
                      } */
                      let { media_id } = customer;
                      if(!media_id){
                        media_id = await utility.UpdateMediaId(customer._id)
                      }
                      utility
                        .uploadFile(
                          element.destination,
                          `${auth._id}_${element.filename}`,
                          element.mimetype,
                          constants.CUSTOMER_BUCKET(media_id) + "profile",
                          auth._id,
                          "profile"
                        )
                        .then(async (uploaded) => {
                          if (uploaded) {
                            let filename = uploaded.data.split("/");
                            const newPath = `/${media_id}${constants.CUSTOMER_PROFILE_ABS}${filename[filename.length - 1]}`

                            //update customer profile image
                            UserModel.updateOne(
                              { _id: ObjectId(auth._id) },
                              {
                                $set: {
                                  profile: newPath
                                },
                              }
                            )
                              .then((updated) => {
                                UserModel.findOne({ _id: ObjectId(auth._id) }) //getuserData
                                  .then(async (customer) => {
                                    let userData = {
                                      _id: customer._id,
                                      firstname: customer.firstname,
                                      lastname: customer.lastname,
                                      email: customer.email,
                                      gender: customer.gender,
                                      dob: customer.dob,
                                      country_code: customer.country_code,
                                      phone_number: customer.phone_number,
                                      profile: customer.profile || "",
                                      default_profile: customer.default_profile,
                                    };
                                    if (userData) {
                                      return apiResponse.successResponseWithData(
                                        res,
                                        "User details updated successfully.",
                                        userData
                                      );
                                    }
                                  })
                                  .catch((customer_err) => {
                                    return apiResponse.ErrorResponse(
                                      res,
                                      customer_err.message,
                                      {}
                                    );
                                  });
                              })
                              .catch((update_err) => {
                                return apiResponse.ErrorResponse(
                                  res,
                                  upload_err.message,
                                  {}
                                );
                              });
                          }
                        })
                        .catch((upload_err) => {
                          return apiResponse.ErrorResponse(
                            res,
                            upload_err.message,
                            {}
                          );
                        });
                    }
                  }));
                }
              })
              .catch((customer_err) => {
                return apiResponse.ErrorResponse(res, customer_err.message, {});
              });
          })
          .catch((auth_err) => {
            return apiResponse.ErrorResponse(res, "Authorization failed", {});
          });
      } else {
        return apiResponse.validationError(res, "Please select profile image.");
      }
    } catch (err) {
      return apiResponse.ErrorResponseWithoutData(res, err.message);
    }
  },
];

exports.makeProfileDefault = [
  body("member_id").exists().notEmpty().withMessage("Member id is required."),
  (req, res) => {
    try {
      // Extract the validation errors from a request.
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return apiResponse.validationErrorWithData(
          res,
          errors.array()[0]["msg"],
          errors.array()
        );
      } else {
        //get current user
        utility
          .verifyUser(req.headers.authorization.split(" ")[1])
          .then((auth) => {
            if (req.body.member_id == "auth") {
              UserModel.findOne(
                { _id: ObjectId(auth._id) },
                function (user_err, user) {
                  if (user_err) {
                    return apiResponse.ErrorResponseWithoutData(
                      res,
                      user_err.message
                    );
                  }
                  if (user) {
                    if (!empty(user.family_members)) {
                      for (var i = 0; i < user.family_members.length; i++) {
                        user.family_members[i].default_profile = 0;
                      }
                    }

                    user.default_profile = 1;
                    user.save(function (updated_err, updated) {
                      if (updated_err) {
                        return apiResponse.ErrorResponseWithoutData(
                          res,
                          updated_err.message
                        );
                      }
                      let data = {
                        profile: user.profile || "",
                        default_profile: true,
                        _id: user._id,
                        firstname: user.firstname ? user.firstname : "",
                        lastname: user.lastname ? user.lastname : "",
                        dob: user.dob ? user.dob : "",
                        relation: "",
                        user_type: user.user_type ? user.user_type : "",
                        created_at: user.created_at ? user.created_at : "",
                        updated_at: user.updated_at ? user.updated_at : "",
                      };
                      return apiResponse.successResponseWithData(
                        res,
                        "Default profile saved!",
                        data
                      );
                    });
                  } else{
                    return apiResponse.successResponseWithData(res, "User not found.", []);
                  }
                }
              );
            } else {
              UserModel.findOne(
                {
                  _id: ObjectId(auth._id),
                  "family_members._id": ObjectId(req.body.member_id),
                },
                function (user_err, user) {
                  if (user_err) {
                    return apiResponse.ErrorResponseWithoutData(
                      res,
                      user_err.message
                    );
                  }
                  if (user) {
                    user.default_profile = 0;
                    if (!empty(user.family_members)) {
                      for (var i = 0; i < user.family_members.length; i++) {
                        user.family_members[i].default_profile = 0;
                        if (
                          user.family_members[i]._id.toString() ==
                          req.body.member_id
                        ) {
                          user.family_members[i].default_profile = 1;
                        }
                      }
                    }

                    user.save(function (updated_err, updated) {
                      if (updated_err) {
                        return apiResponse.ErrorResponseWithoutData(
                          res,
                          updated_err.message
                        );
                      }
                      UserModel.findOne({
                        _id: ObjectId(auth._id),
                        "family_members._id": ObjectId(req.body.member_id),
                      })
                        .then((user) => {
                          let _default_profile = {};

                          if (!empty(user.family_members)) {
                            _default_profile = user.family_members.find(
                              function (element) {
                                if (element._id == req.body.member_id) {
                                  return element;
                                }
                              }
                            );
                          }
                          let data = {
                            profile: _default_profile.profile || "",
                            default_profile: true,
                            _id: _default_profile._id,
                            firstname: _default_profile.firstname
                              ? _default_profile.firstname
                              : "",
                            lastname: _default_profile.lastname
                              ? _default_profile.lastname
                              : "",
                            dob: _default_profile.dob
                              ? _default_profile.dob
                              : "",
                            relation: _default_profile.relation
                              ? _default_profile.relation
                              : "",
                            user_type: _default_profile.user_type
                              ? _default_profile.user_type
                              : "",
                            created_at: _default_profile.created_at
                              ? _default_profile.created_at
                              : "",
                            updated_at: _default_profile.updated_at
                              ? _default_profile.updated_at
                              : "",
                          };
                          return apiResponse.successResponseWithData(
                            res,
                            "Default profile saved.",
                            data
                          );
                        })
                        .catch((err) => {
                          return apiResponse.ErrorResponseWithoutData(
                            res,
                            err.message
                          );
                        });
                    });
                  } else{
                    return apiResponse.successResponseWithData(res, "User not found.", []);
                  }
                }
              );
            }
          })
          .catch((auth_err) => {
            return apiResponse.ErrorResponseWithoutData(
              res,
              "Authorization failed."
            );
          });
      }
    } catch (err) {
      return apiResponse.ErrorResponseWithoutData(res, err.message);
    }
  },
];

/**
 * add family member profile
 *
 * @method POST
 * @param {string} firstname
 * @param {string} lastname
 * @param {string} dob
 * @param {string} relattion
 *
 * @returns {Object}
 */
exports.addFamilyMember = [
  //validate fields
  body("firstname")
    .exists()
    .notEmpty()
    .trim()
    .withMessage("firstname is required"),
  body("lastname")
    .exists()
    .notEmpty()
    .trim()
    .withMessage("lastname is required"),
  body("dob").exists().notEmpty().trim().withMessage("DOB is required"),
  body("relation")
    .exists()
    .notEmpty()
    .trim()
    .withMessage("Relation is required"),
  //process request after validation and sanitization
  (req, res) => {
    try {
      // Extract the validation errors from a request.
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return apiResponse.validationErrorWithData(
          res,
          errors.array()[0]["msg"],
          errors.array()
        );
      } else {
        //get current user
        utility
          .verifyUser(req.headers.authorization.split(" ")[1])
          .then(async (auth) => {
            if (!empty(req.files)) {
              await Promise.all(req.files.map(async(element)=>{
                if (element.fieldname == "family_member_profile") {
                  //upload new profile image to s3 bucket
                  const customer = await UserModel.findById(auth._id)
                  let { media_id } = customer;
                  if(!media_id){
                    media_id = await utility.UpdateMediaId(customer._id)
                  }
                  utility
                    .uploadFile(
                      element.destination,
                      `${customer._id}_${element.filename}`,
                      element.mimetype,
                      constants.CUSTOMER_BUCKET(media_id) + "profile/family_member",
                      customer._id,
                      "family_member_profile"
                    )
                    .then(async (uploaded) => {
                      if (uploaded) {
                        let filename = uploaded.data.split("/");
                        let _family_member = {
                          _id: ObjectId(),
                          firstname: req.body.firstname,
                          lastname: req.body.lastname,
                          dob: req.body.dob,
                          relation: req.body.relation,
                          profile: `/${media_id}${constants.CUSTOMER_FAMILY_MEMBER_PROFILE_ABS}${filename[filename.length - 1]}`,
                          user_type: utility.getUserTypeByRelation(
                            utility.calculateAge(req.body.dob),
                            req.body.relation.toLowerCase()
                          ),
                        };

                        //save profile info
                        UserModel.updateOne(
                          { _id: customer._id },
                          {
                            $push: {
                              family_members: _family_member,
                            },
                          },
                          async function (family_member_err, family_member) {
                            if (family_member_err) {
                              return apiResponse.ErrorResponse(
                                res,
                                family_member_err.message,
                                {}
                              );
                            }
                            _family_member.profile = _family_member.profile ? constants.IMAGEKIT_URL + _family_member.profile : "";
                            return apiResponse.successResponseWithData(
                              res,
                              "Family member added successfully.",
                              _family_member
                            );
                          }
                        );
                      }
                    })
                    .catch((upload_err) => {
                      console.log("upload_err", upload_err);
                      return apiResponse.ErrorResponse(
                        res,
                        upload_err.message,
                        {}
                      );
                    });
                }
              }));
            } else {
              return apiResponse.validationErrorWithData(
                res,
                "Profile image is required",
                {}
              );
            }
          })
          .catch((auth_err) => {
            console.log("auth_err", auth_err);
            return apiResponse.ErrorResponse(res, "Authorization failed.", {});
          });
      }
    } catch (err) {
      console.log("err", err);
      return apiResponse.ErrorResponse(res, err.message, {});
    }
  },
];

/**
 * Update Family member profile
 *
 * @method POST
 * @param {string} member_id
 *
 * @returns {Object}
 */
exports.updateFamilyMemberProfile = [
  //validate fields.
  body("member_id").exists().notEmpty().withMessage("member id is required"),
  //proces request after validation and sanitization
  (req, res) => {
    try {
      // Extract the validation errors from a request.
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return apiResponse.validationErrorWithData(
          res,
          errors.array()[0]["msg"],
          errors.array()
        );
      } else {
        //get current logged in user
        utility
          .verifyUser(req.headers.authorization.split(" ")[1])
          .then((auth) => {
            //find family member record
            UserModel.findOne(
              {
                _id: ObjectId(auth._id),
                "family_members._id": ObjectId(req.body.member_id),
              },
              async function (user_err, user) {
                if (user_err) {
                  return apiResponse.ErrorResponse(res, user_err.message, {});
                }

                if (user && !empty(user) && user.family_members) {
                  for (var i = 0; i < user.family_members.length; i++) {
                    if (
                      user.family_members[i]._id.toString() ===
                      req.body.member_id
                    ) {
                      if (req.body.firstname) {
                        user.family_members[i].firstname = req.body.firstname;
                      }
                      if (req.body.lastname) {
                        user.family_members[i].lastname = req.body.lastname;
                      }
                      if (req.body.dob) {
                        user.family_members[i].dob = req.body.dob;
                      }

                      if (req.body.relation) {
                        user.family_members[i].relation = req.body.relation;
                        user.family_members[i].user_type =
                          utility.getUserTypeByRelation(
                            utility.calculateAge(req.body.dob),
                            req.body.relation
                          );
                      }
                      if (!empty(req.files)) {
                        await Promise.all(req.files.map(async(element)=>{
                          if (element.fieldname == "family_member_profile") {
                            //upload new profile image to s3 bucket
                            /* utility.deleteS3File(
                              user.family_members[i].profile,
                              process.env.AWS_BUCKET_NAME
                            ); */
                            let { media_id } = user;
                            if(!media_id){
                              media_id = await utility.UpdateMediaId(user._id)
                            }
                            await utility
                              .uploadFile(
                                element.destination,
                                `${auth._id}_${element.filename}`,
                                element.mimetype,
                                constants.CUSTOMER_BUCKET(media_id) + "profile/family_member",
                                auth._id,
                                "family_member_profile"
                              )
                              .then(async (uploaded) => {
                                let filename = uploaded.data.split("/");
                                // saving new file name
                                user.family_members[i].profile = `/${media_id}${constants.CUSTOMER_FAMILY_MEMBER_PROFILE_ABS}${filename[filename.length - 1]}`;
                              })
                              .catch((upload_err) => {
                                return apiResponse.ErrorResponse(
                                  res,
                                  upload_err.message,
                                  {}
                                );
                              });
                          }
                        }));
                      }
                      //update profile details
                      user.save(function (saved_err, user_res) {
                        if (saved_err) {
                          return apiResponse.ErrorResponse(
                            res,
                            saved_err.message,
                            {}
                          );
                        }

                        let family_member = user_res.family_members.find(
                          (elem) => {
                            //sending only updated family member
                            if (elem._id.toString() === req.body.member_id) {
                              return elem;
                            }
                          }
                        );
                        if (family_member)
                          return apiResponse.successResponseWithData(
                            res,
                            "Family member profile updated successfully.",
                            family_member
                          );
                      });
                    }
                  }
                }else{
                  return apiResponse.successResponseWithData(res, "User not found.", []);
                }
              }
            );
          })
          .catch((auth_err) => {
            return apiResponse.ErrorResponse(res, "Authorization failed.", {});
          });
      }
    } catch (err) {
      return apiResponse.ErrorResponse(res, err.message, {});
    }
  },
];

exports.listFamilyMemberProfiles = [
  (req, res) => {
    try {
      //get current logged in user
      utility
        .verifyUser(req.headers.authorization.split(" ")[1])
        .then((auth) => {
          UserModel.findOne(
            { _id: ObjectId(auth._id) },
            {
              _id: 1,
              firstname: 1,
              lastname: 1,
              user_type: 1,
              dob: 1,
              profile: 1,
              default_profile: 1,
              created_at: 1,
              updated_at: 1,
              family_members: 1,
            },
            function (user_err, user) {
              if (user_err) {
                return apiResponse.ErrorResponse(res, user_err.message, []);
              }
              /**Adding account holder in the family memebrs list */
              user.family_members.push({
                _id: user._id,
                firstname: user.firstname,
                lastname: user.lastname,
                profile: user.profile || "",
                user_type: user.user_type,
                default_profile: user.default_profile,
                dob: user.dob,
                relation: "" /** for sending same keys as family members */,
                created_at: user.created_at,
                updated_at: user.updated_at,
              });
              return apiResponse.successResponseWithData(
                res,
                "family member's profile found successfully.",
                user.family_members
              );
            }
          );
        })
        .catch((auth_err) => {
          return apiResponse.ErrorResponse(res, "Authorization failed", []);
        });
    } catch (err) {
      return apiResponse.ErrorResponse(res, err.message, []);
    }
  },
];

exports.deleteFamilyMemberprofile = [
  body("member_id").exists().notEmpty().withMessage("Member id is required."),
  (req, res) => {
    try {
      // Extract the validation errors from a request.
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return apiResponse.validationErrorWithData(
          res,
          errors.array()[0]["msg"],
          errors.array()
        );
      } else {
        //get current user
        utility
          .verifyUser(req.headers.authorization.split(" ")[1])
          .then((auth) => {
            UserModel.findOne(
              {
                _id: ObjectId(auth._id),
                "family_members._id": ObjectId(req.body.member_id),
              },
              function (user_err, user) {
                if (user_err) {
                  return apiResponse.ErrorResponseWithoutData(
                    res,
                    user_err.message
                  );
                }
                if (user && !empty(user) && user.family_members[0]) {
                  for (var i = 0; i < user.family_members.length; i++) {
                    if (
                      user.family_members[i]._id.toString() ===
                      req.body.member_id
                    ) {

                      //utility.deleteFilesFromS3BucketWithPromise(user.family_members[i].profile);
                      
                      user.family_members.pull({
                        _id: ObjectId(req.body.member_id),
                      });
                    }
                  }

                  user.save(function (updated_user_err, updated_user) {
                    if (updated_user_err) {
                      return apiResponse.ErrorResponseWithoutData(
                        res,
                        updated_user_err.message
                      );
                    }
                    return apiResponse.successResponse(
                      res,
                      "Family member profile deleted successfully."
                    );
                  });
                }else{
                  return apiResponse.successResponseWithData(res, "Family member not found.", []);
                }
              }
            );
          })
          .catch((auth_err) => {
            return apiResponse.ErrorResponseWithoutData(
              res,
              "Authorization failed."
            );
          });
      }
    } catch (err) {
      return apiResponse.ErrorResponseWithoutData(res, err.message);
    }
  },
];

// Depreciated
exports.addCustomer = [
  body("card_number")
    .exists()
    .notEmpty()
    .withMessage("Card number is required."),
  body("exp_month").exists().notEmpty().withMessage("Exp month is required."),
  body("exp_year").exists().notEmpty().withMessage("Exp year is required."),
  async (req, res) => {
    try {
      let input = req.body;
      const customer = await stripe.tokens.create({
        card: {
          number: input.card_number,
          exp_month: input.exp_month,
          exp_year: input.exp_year,
        },
      });
      if (!customer) {
        // if error in creating customer
        return apiResponse.ErrorResponseWithoutData(
          res,
          "Something went wrong!"
        );
      }
      const card = await stripe.customers.createSource(
        process.env.STRIPE_CUSTOMER_ID,
        { source: customer.id }
      );
      if (!card) {
        // error in creating card
        return apiResponse.ErrorResponseWithoutData(
          res,
          "Something went wrong!"
        );
      }
      return apiResponse.successResponseWithNoData(
        res,
        "Card added successfully!"
      );
    } catch (e) {
      return apiResponse.ErrorResponseWithoutData(res, e.message);
    }
  },
];
exports.bookingListing = [
  async (req, res, next) => {
    try {
      let user = await utility.verifyUser(
        req.headers.authorization.split(" ")[1]
      );

      let user_info = await UserModel.findOne({_id:ObjectId(user._id)});
      let blocked_stylists = user_info.blocked_stylist.filter(elem => elem.block_status == "active").map(elem => elem.stylist_id);

      let limit = req.query.limit ? parseInt(req.query.limit) : 10;
      let page = req.query.page ? parseInt(req.query.page) - 1 : 0;
      let skip = limit * page;
      let filter = req.query.filter ? req.query.filter : "new";
      let query;
      if (filter == "new") {
        query = { booking_status: { $in: [0, 1, 2, 3, 9] } };
      } else if (filter == "old") {
        query = { booking_status: { $in: [4, 5, 6, 7, 8, 10] } };
      } else {
        query = { booking_status: { $in: [0] } };
      }
      console.log(skip, limit);
      Booking.aggregate([
        { $match: { user_id: ObjectId(user._id) } },
        { $match: query },
        {
          $lookup: {
            from: "service_providers",
            localField: "stylist_id",
            foreignField: "_id",
            as: "stylist",
          },
        },
        { $unwind: { path: "$stylist", preserveNullAndEmptyArrays: true } },
        { $sort: { _id: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            order_number: 1,
            booking_status: 1,
            direct_order: 1,
            date: 1,
	          can_rebook: {
		          $cond:[
                {
                  $or:[
                    {
                      $and:[
                        {$eq:["$direct_order", 1]},
                        {$in:["$booking_status", [4,5,6,9]]},
                        {$eq:["$stylist.registration_status", "accepted"]},
                        {$eq:["$stylist.deleted", false]},
                        {$eq:["$stylist.status", true]},
                        {$not:{$in:["$stylist._id", blocked_stylists]}},
                        {$not:{$in:[ObjectId(user_info._id), "$stylist.blocked_customer"]}}
                      ]
                    },
                    {
                      $and:[
                        {$eq:["$direct_order", 0]},
                        {$in:["$booking_status", [4,5,6,9]]}
                      ]
                    }
                  ]
                },
                true, 
                false
              ]
	          },
            booking_type: 1,
            stylist_profile: {
              $cond:{
                if:{$eq:["$stylist.profile", ""]},
                then:"",
                else:{$concat:[constants.IMAGEKIT_URL,"$stylist.profile"]}
              }
            },
          },
        },
      ])
        .then((result) => {
          if (!result) {
            return apiResponse.ErrorResponseWithoutData(
              res,
              "No Booking found!"
            );
          }
          apiResponse.successResponseWithData(res, "Record found", result);
        })
        .catch((err) => {
          return apiResponse.ErrorResponseWithoutData(res, err.message);
        });
    } catch (e) {
      return apiResponse.ErrorResponseWithoutData(res, e.message);
    }
  },
];

const getuserData = async (id) => {
  const userData = await UserModel.aggregate([
    { $match: { _id: ObjectId(id) } },
    {
      $lookup: {
        from: "reward_vouchers",
        let: { user_id: ObjectId(id) },
        pipeline: [
          {
            $match: {
              $expr: { $and: [{ $eq: ["$userId", "$$user_id"]}, { $eq: ["$user_type", "customer"]}]}
            }
          }
        ],
        as: "reward_vouchers"
      }
    },
    {
      $lookup: {
        from: "ratings",
        let: { user_id: ObjectId(id) },
        pipeline: [
          {
            $match: {
              $expr: { $and: [{ $eq: ["$$user_id", "$user_id"] }, { $eq: ["$reviewed_by", "stylist"] }] },
            },
          },
        ],
        as: "ratings",
      },
    },
    {
      $project: {
        _id: 1,
        profile: {
          $cond:{
            if:{$eq:["$profile", ""]},
            then:"",
            else:{$concat:[constants.IMAGEKIT_URL,"$profile"]}
          }
        },
        otp: 1,
        dob: 1,
        preference: 1,
        default_profile: 1,
        number_of_bookings: 1,
        wallet_balance: 1,
        user_redeem:{
          $cond:{
            if:{ $lte: ["$referral", null] },
            then:"$user_redeem",
            else:"$referral.user_redeem"
          }
        },
        reward_vouchers:1,
        status: 1,
        firstname: 1,
        lastname: 1,
        email: 1,
        gender: 1,
        country_code: 1,
        phone_number: 1,
        user_type: 1,
        stripe_customer_id: 1,
        rating_count: { $size: "$ratings" },
        avg_rating: { $toString: {$cond:[{$size:"$ratings"},{$avg:"$ratings.value"},0]} },
      },
    },
  ]);
  //userData && userData[0] && userData[0].reward_vouchers
  if(userData?.[0]?.reward_vouchers){
    userData[0].reward_vouchers = userData[0].reward_vouchers.length > 0 ? userData[0].reward_vouchers[0].referral_code : [];
  return userData[0];
  }else{
    console.log("else");
    const search_error= new Error("User Data not found");
    throw search_error;
  }
}

exports.UpdateMediaRecord = async (id,reference,url) =>{
  try{
    let filename = url.split("/");
    let FinalName = "";
    const customer = await UserModel.findById(id);
    let { media_id } = customer;
    if(!media_id){
      media_id = await utility.UpdateMediaId(customer._id)
    }
		switch(reference){
			case "profile":
				FinalName = `/${media_id}${constants.CUSTOMER_PROFILE_ABS}${filename[filename.length - 1]}`;
				break;
			case "family_member_profile":
				FinalName = `/${media_id}${constants.CUSTOMER_FAMILY_MEMBER_PROFILE_ABS}${filename[filename.length - 1]}`;
				break;
		}

    await UserModel.findOneAndUpdate({_id:ObjectId(id)},{
      $push:{
        media_record:{
          reference: reference,
          url: FinalName
        }
      }
    }).catch(err=>{
      throw new Error(`Error while update media records. This -> ${err.message}`);
    })
    return true;
  }catch(e){
    throw e;
  }
}
