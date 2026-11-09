var isset = require('isset');
var empty = require('is-empty');
const jwt = require("jsonwebtoken");
const AdminModel = require("../models/AdminModel");
const dotenv = require('dotenv');
dotenv.config();

module.exports.redirectAfterAuthentication = function (req, res, next) {
   
  if (req.originalUrl!='/admin/login' && req.originalUrl!='/admin/register' && req.originalUrl!='/admin/forgot-password'&& req.originalUrl!='/admin/reset-password')
  {         
    // decode token
      if (isset(req.headers.authorization) && !empty(req.headers.authorization)) {
          // verifies secret and checks exp
          const authHeader = req.headers.authorization;
          if (authHeader) 
          {
            const authtoken = authHeader.split(' ')[1];
           
            jwt.verify(authtoken, process.env.JWT_SECRET, {audience: process.env.JWT_AUDIENCE, expiresIn: process.env.JWT_TIMEOUT_DURATION},function(err,token){
              // console.log('token',token);
              if (err) {   
               // console.log('err',err);          
                    return res.status(401).json({
                      status: 401,
                      message: 'unauthorized.'
                  });
                } else {  

                  AdminModel.findOne({_id:token._id},function(err,admin){                 
                    if(isset(admin) && !empty(admin))
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