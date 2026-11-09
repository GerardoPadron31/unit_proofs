const axios = require('axios');
const Pusher = require("pusher");
const { body, validationResult } = require("express-validator");
const apiResponse = require('../helpers/apiResponse');
const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const utility = require("../helpers/utility");
const ContactsModel = require("../models/ContactsModel");
const SosAlarmModel = require("../models/SosAlarmModel");

var pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID, 
      key: process.env.PUSHER_KEY, 
      secret:  process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER, 
      useTLS: true,
});

exports.createSos = [
  body("lat").exists().notEmpty().withMessage("Lat is required"),
  body("lon").exists().notEmpty().withMessage("Lon is required"),
  body("acc").exists().notEmpty().withMessage("Acc is required"),
  async(req, res) =>{
    var res_data = {
      noonlight: {},
      database: {},
      contacts: {},
      sms: []
    }

    try{
      // Extract the validation errors from a request.
      const errors = validationResult(req);
      if(!errors.isEmpty()){
        return apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
      }

      var auth = await utility.verifyUser(req.headers.authorization.split(' ')[1]);
    }catch (err){
      return apiResponse.ErrorResponse(res, err.message, {})
    }

    // Create Noonlight alarm
    try{
      let noonlight_response = await axios.post(process.env.NOONLIGHT_URL, {
        location: {
          coordinates: {
            lat: Number(req.body.lat),
            lng: Number(req.body.lon),
            accuracy: Math.floor(Number(req.body.acc))
          }
        },
        services:{
          other: true
        },
        name: `${auth.firstname} ${auth.lastname}`,
        phone: `${auth.phone_number}`
        //phone: `${auth.country_code.replace('+', '')}${auth.phone_number}`
      },{
        headers: {
          'Authorization': `Bearer ${process.env.NOONLIGHT_SERVER_TOKEN}`
        }
      });

      if(noonlight_response.data?.id){
        res_data.noonlight = { status: "success", message: noonlight_response.data};

        pusher.trigger("update-client-sos", noonlight_response.data.id,{
          value : {
            lat: req.body.lat,
            lon: req.body.lon
          } 
        });

        try{
          let new_entry = {
            user_id: req.body.stylist ? req.body.stylist : auth._id,
            type: "customer",
            alarm_id: noonlight_response.data.id,
            status: noonlight_response.data.status,
            updates: [
              {
                responsible: auth._id,
                responsible_type: 'customer',
                action: 'create',
                data: {
                  lat: Number(req.body.lat),
                  lon: Number(req.body.lon),
                  accuracy: Math.floor(Number(req.body.acc))
                }
               }
            ]
          };

          var new_alarm = await SosAlarmModel.create(new_entry);

          res_data.database = {status: "success", message: "Saved alarm on database"};
        }catch (err){
          res_data.database = {status: "error", message: "Error while saving alarm on database", detail: err};
        }
      }else{
        throw {response:{data:"Noonlight didn't create an alarm_id"}};        
      }

    }catch(err){
      res_data.noonlight = {status: "error", message: "Error creating noonlight alarm", detail: err.response.data};
      res_data.database = {status: "error", message: "Skipped saving in database", detail: "Noonlight alarm must be created first"};
    }

    // Send Twilio message to contacts
    try{
      var contacts = await ContactsModel.find({"user_id": req.body.stylist ? req.body.stylist : auth._id, "type":"customer", status:true});
      
      if(contacts.length == 0){
        res_data.contacts = {status: "warnings", message: "No emergency contacts set", detail: ""};
      }

      await Promise.all(contacts.map(async(contact)=>{
        try{
          let message = `Hi ${contact.name}, our customer ${auth.firstname} ${auth.middlename} ${auth.lastname} has requested...`;

          await client.messages.create({body:message, from: process.env.TWILIO_SENDER_ID, to: `${contact.phone_number}`});

          res_data.sms.push({status: "success", message:"Send message to " + contact.name + " " + contact.phone_number});

        }catch(err){
          res_data.sms.push({status: "error", message: "Error sending contact message to " + contact.name + " " + contact.phone_number, detail: err});
        }       
      }));
    }catch(err){
      res_data.contacts = { status: "error", message: "Unable to find emergency contacts", detail: err.message};
    }


    return apiResponse.successResponseWithData(res, "SOS request completed", res_data);
  }
];

exports.updateSos = [
  body("alarm_id").exists().notEmpty().withMessage("Alarm_id is required"),
  body("lat").exists().notEmpty().withMessage("Lat is required"),
  body("lon").exists().notEmpty().withMessage("Lon is required"),
  body("acc").exists().notEmpty().withMessage("Accuracy is required"),
  async (req, res) => {
    var res_data = {
      noonlight: {},
      database: {},
    };

    try{
      // Extract the validation errors from a request
      const errors = validationResult(req);
      if(!errors.isEmpty()){
        return apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
      }

      var auth = await utility.verifyUser(req.headers.authorization.split(' ')[1]);
    }catch(err){
      return apiResponse.ErrorResponse(res, err.message, {});
    }

    try{
      let noonlight_response = await axios.post(process.env.NOONLIGHT_URL + "/" + req.body.alarm_id + "/locations",{
        coordinates: {
          lat: Number(req.body.lat),
          lng: Number(req.body.lon),
          accuracy: Math.floor(Number(req.body.acc))
        }
       },{
        headers: {
          'Authorization' : `Bearer ${process.env.NOONLIGHT_SERVER_TOKEN}`
        }
       });

      res_data.noonlight = {status: "success", message: noonlight_response.data};
    }catch(err){
      res_data.noonlight = {status: "error", message: "Unable to update location on noonlight", detail: err.response.data};
    }

    try{
      await SosAlarmModel.updateOne({alarm_id: req.body.alarm_id},{
        $push: {
          "updates": {
            "responsible": auth._id,
            "responsible_type": "customer",
            "action": "update_location",
            data:{
              "lat": Number(req.body.lat),
              "lon": Number(req.body.lon),
              "accuracy": Math.floor(Number(req.body.acc))
            }
          }
        }
      });

      res_data.database = {status: "success", message: "Saved alarm update on database"};
    }catch(err){
      res_data.database = {status: "error", message: "Unable to update location on database", detail: err};
    }

    // Pusher
    pusher.trigger("update-client-sos", req.body.alarm_id,{
      value : {
        lat: req.body.lat,
        lon: req.body.lon
      } 
    });

    return apiResponse.successResponseWithData(res, "SOS update completed", res_data);
  }
];

exports.endSos = [
  body("alarm_id").exists().notEmpty().withMessage("Alarm_id is required"),
  async (req, res) => {
    var res_data = {
      noonlight: {},
      database: {},
      contacts: {},
      sms: []
    };

    try{
      const errors = validationResult(req);
      if(!errors.isEmpty()){
        return apiResponse.validationErrorWithData(res, errors.array()[0]['msg'], errors.array());
      }

      var auth = await utility.verifyUser(req.headers.authorization.split(' ')[1]);
    }catch(err){
      return apiResponse.ErrorResponse(res, err.message, {});
    }

    try{
      let noonlight_response = await axios.post(process.env.NOONLIGHT_URL + "/" + req.body.alarm_id + "/status", {
        status: 'CANCELED'    
      },{
        headers: {
          'Authorization' : `Bearer ${process.env.NOONLIGHT_SERVER_TOKEN}`
        }
      });

      res_data.noonlight = { status: "success", message: noonlight_response.data};

      try{
        await SosAlarmModel.updateOne({alarm_id: req.body.alarm_id},{
          $set:{
            status: noonlight_response.status
          },
          $push: {
            "updates": {
              "responsible": auth._id,
              "responsible_type": "customer",
              "action": "cancel"
            }
          }
        });
        res_data.database = {status: "success", message: "Saved alarm end on database"};
      }catch(err){
        res_data.database = {status: "error", message: "Unable to save alarm end on database", detail:err};
      }
    }catch(err){
      res_data.noonlight = {status:"error", message: "Unable to cancel alarm", detail: err.response.data};
      res_data.database = {status: "error", message: "Skipped saving in database", detail: "Noonlight alarm must be ended first"};
    }

    // Send Twilio message to contacts
    try{
      var contacts = await ContactsModel.find({"user_id": req.body.customer ? req.body.customer : auth._id, "type": "customer", status:true});
    
      if(contacts.length == 0){
        res_data.contacts = {status: "warnings", message:"No emergency contacts set", detail: ""};
      }

      await Promise.all(contacts.map(async (contact)=>{
        try{
          let message = `Hi ${contact.name}, our customer ${auth.fistname} ${auth.middlename}, ${auth.lastname} has ended the SOS request...`;

          await client.messages.create({body:message, from: process.env.TWILIO_SENDER_ID, to: `${contact.phone_number}`});

          res_data.sms.push({status:"success", message: "Send message to " + contact.name + " " + contact.phone_number});

        }catch(err){
          res_data.sms.push({status: "error", message: "Error sending contact message to " + contact.name + " " + contact.phone_number, detail: err});
        }
      }));
    }catch(err){
      res_data.contacts = {status: "error", message: "Unable to find emergency contacts", detail: err.message};
    }

    pusher.trigger("update-client-sos", req.body.alarm_id,{
      value : {
        status: "ended"
      } 
    });

    return apiResponse.successResponseWithData(res, "SOS request ended", res_data);
  }
]
