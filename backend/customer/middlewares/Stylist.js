var isset = require('isset');
var empty = require('is-empty');
const jwt = require("jsonwebtoken");
const ServiceProviderModel = require("../models/ServiceProviderModel");
const dotenv = require('dotenv');
dotenv.config();

module.exports.redirectAfterAuthentication = function (req, res, next) { 
   
  if (req.originalUrl!='/api/login' && req.originalUrl!='/api/register' && req.originalUrl!='/api/verify-token')
  {         
    // decode token
      if (isset(req.headers.authorization) && !empty(req.headers.authorization)) {
          // verifies secret and checks exp
          const authHeader = req.headers.authorization;
          if (authHeader) 
          {
            const access_token = authHeader.split(' ')[1];
            jwt.verify(access_token, process.env.JWT_SECRET, {audience: process.env.JWT_AUDIENCE, expiresIn: process.env.JWT_TIMEOUT_DURATION},function(err,token){
             //console.log('token',token);
              if (err) {             
                    return res.status(401).json({
                      status: 401,
                      message: 'unauthorized.'
                  });
                } else {  

                  ServiceProviderModel.findOne({_id:token._id, access_token: access_token },function(err,service_provider){                 
                    if(isset(service_provider) && !empty(service_provider))
                    {
                          // if everything is good, save to request for use in other routes
                          next();
                    }else{
                      return res.status(401).json({
                          status: 401,
                          message: 'unauthorized.'
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
            message: 'unauthorized.'
        });
      }
  }else{
    next();
  }    
}