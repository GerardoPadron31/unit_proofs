var isset = require('isset');
var empty = require('is-empty');
const jwt = require("jsonwebtoken");
const axios = require("axios");
const UserModel = require("../models/UserModel");
const dotenv = require('dotenv');
dotenv.config();

module.exports.redirectAfterAuthentication = function (req, res, next) { 
   
  if (req.originalUrl!='/api/customer-login' && req.originalUrl!='/api/customer-register' && req.originalUrl!='/api/customer-verify-token')
  {         
    // decode token
      if (isset(req.headers.authorization) && !empty(req.headers.authorization)) {
          // verifies secret and checks exp
          const authHeader = req.headers.authorization;
          if (authHeader) 
          {
            const access_token = authHeader.split(' ')[1];
            jwt.verify(access_token, process.env.JWT_SECRET, {audience: process.env.JWT_AUDIENCE, expiresIn: process.env.JWT_TIMEOUT_DURATION},function(err,token){
            
              if (err) {             
                    return res.status(401).json({
                      status: 401,
                      message: 'unauthorized 1.'
                  });
                } else {  

                    UserModel.findOne({_id:token._id, access_token: access_token},function(err,user){                 
                    if(isset(user) && !empty(user))
                    {
                          // if everything is good, save to request for use in other routes
                          next();
                    }else{
                      return res.status(401).json({
                          status: 401,
                          message: 'unauthorized 2.'
                      });
                    }
                  });
                }
            });
        }
      } else {
          // if there is no token
          // return an error
          return res.status(401).json({
            status: 401,
            message: 'unauthorized 3.'
        });
      }
  }else{
    next();
  }    
}
module.exports.authorize = async (req,res,next) => {
    try{
        let base_url = process.env.USERAUTH_BASE_URL + 'authorize';
        if (isset(req.headers.authorization) && !empty(req.headers.authorization)) { // after authentication
            // verifies secret and checks exp
            const authHeader = req.headers.authorization;
            if (authHeader) {
                const token = authHeader.split(' ')[1];
                jwt.verify(token, process.env.JWT_SECRET, {
                    audience: process.env.JWT_AUDIENCE,
                    expiresIn: process.env.JWT_TIMEOUT_DURATION
                }, function (err, token) {
                    //console.log('token',token);
                    if (err) {
                        return res.status(401).json({
                            status: 401,
                            message: 'unauthorized 4.'
                        });
                    } else {
                        let phone_number,country_code;
                        if(token){
                            phone_number = token.phone_number;
                            country_code = token.country_code;
                        }
                        console.log(`base_url`, base_url)
                        console.log(`country_code`, phone_number, country_code)
                        console.log("case 1");
                        axios.post(base_url,{
                            user_type:3,
                            phone_number:phone_number,
                            country_code:country_code
                        }).then((response)=>{
                            //console.log(response);
                            let res=response.data;
                            if(res.status!==200){
                              console.log("failed1");
                              console.log(response.data);
                                return res.status(400).json({
                                    status: 400,
                                    message: 'Your Profile has been disabled! 1'
                                });
                            }else{
                                next();
                            }
                        }).catch((err)=>{
                            console.log("failed2");
                            console.log('err', err)

                            // if(err.response.status===400){
                            //
                            // }
                            return res.status(400).json({
                                status: 400,
                                message: 'Your Profile has been disabled! 2'
                            });
                        })
                    }
                });
            }
        }else { // before authentication
            let phone_number = req.body.phone_number
            let country_code = req.body.country_code
            console.log("case 2");
            axios.post(base_url,{
                user_type:2,
                phone_number:phone_number,
                country_code:country_code
            }).then((response)=>{
                console.log(response);
                let res=response.data;

                if(res.status!==200){
                    return res.status(400).json({
                        status: 400,
                        message: 'Your Profile has been disabled!3'
                    });
                }else{
                    next();
                }
            }).catch((err)=>{
                if(err.response && err.response.status < 500 && err.response.status >=400){
                    return res.status(400).json({
                        status: 400,
                        //message: 'Your Profile has been disabled!4'
                        message: err.response.data.message
                    });
                }else{
                  console.log(err);
                  return res.status(400).json({
                    status: 400,
                    message: "Internal error, try again later"
                  });
                }
            })
        }
    }catch (e) {
        console.log(e)
        return res.status(500).json({
            status: 500,
            message: 'Something went wrong!'
        });
    }
}
