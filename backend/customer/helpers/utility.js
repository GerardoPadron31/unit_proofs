var fs = require("fs");
const AWS = require("aws-sdk");
const jwt = require("jsonwebtoken");
var ffmpeg = require("fluent-ffmpeg");
const FileType = require("file-type");
const constants = require("./constant");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_KEY);
const axios = require("axios");
const AuthController = require("../controllers/AuthController")
const UserModel = require('../models/UserModel');
const ServiceProviderModel = require('../models/ServiceProviderModel');
const { v4: uuidv4 } = require("uuid");
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
});

const getEstOffset = () => {
    const stdTimezoneOffset = () => {
        var jan = new Date(0, 1);
        var jul = new Date(6, 1);
        return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
    };

    var today = new Date();

    const isDstObserved = today => {
        return today.getTimezoneOffset() < stdTimezoneOffset();
    };

    if (isDstObserved(today)) {
        return -4;
    } else {
        return -5;
    }
};


exports.randomNumber = function (length) {
  var text = "";
  var possible = "123456789";
  for (var i = 0; i < length; i++) {
    var sup = Math.floor(Math.random() * possible.length);
    text += i > 0 && sup == i ? "0" : possible.charAt(sup);
  }
  return Number(text);
};

exports.calculateAge = function (birthday) {
  // birthday is a date
  var ageDifMs = Date.now() - new Date(birthday).getTime();
  var ageDate = new Date(ageDifMs); // miliseconds from epoch
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

exports.getUserType = function (age, gender) {
  if (age <= constants.KID_AGE) return "kids";
  else if (age > constants.SENIOR_AGE) return "senior";
  else if (
    age > constants.KID_AGE &&
    age <= constants.SENIOR_AGE &&
    gender === "men"
  )
    return "men";
  else if (
    age > constants.KID_AGE &&
    age <= constants.SENIOR_AGE &&
    gender === "women"
  )
    return "women";
};

exports.getUserTypeByRelation = function (age, relation) {
  console.log("relation", relation);
  if (age <= constants.KID_AGE) return "kids";
  else if (age > constants.SENIOR_AGE) return "senior";
  else if (
    age > constants.KID_AGE &&
    age <= constants.SENIOR_AGE &&
    (relation === "daughter" || relation === "wife" || relation === "mother")
  )
    return "women";
  else if (
    age > constants.KID_AGE &&
    age <= constants.SENIOR_AGE &&
    (relation === "husband" || relation === "son" || relation === "father")
  )
    return "men";
};

exports.uploadFile = (path, fileName, content_type, bucket, id, reference) => {
  return new Promise(async function (resolve, reject) {
    // Read content from the file
    //const fileContent = fs.readFileSync(path+fileName);
    const initialName = fileName.split('_');
    const readStream = await fs.createReadStream(`${path}${initialName[initialName.length - 1]}`);
    readStream.on('error',(err)=>{
      reject(err)
    })
    // Setting up S3 upload parameters
    var response = {};
    const params = {
      Bucket: bucket,
      Key: fileName,
      Body: readStream,
      ContentType: content_type,
    };

    // Uploading files to the bucket
    s3.upload(params, async function (err, data) {
      await readStream.destroy();
      if (err) {
        response = {
          message: "error",
          data: err,
        };
        reject(response)
      }

      if (data) {
        fs.unlink(path + initialName[initialName.length - 1], async function (err) {
          if (err) {
            response = {
              message: "error",
              data: err,
            };
            reject(response);
          } else {
            console.log(`File uploaded successfully. ${data.Location}`);
            response = {
              message: "success",
              data: data.Location,
            };

            await AuthController.UpdateMediaRecord(id,reference,data.Location).catch(err=>{
              reject(err.message)
            })
            resolve(response);
          }
        });
      }
    });
  });
};

exports.deleteS3File = (fileName, bucket_name) => {
  return new Promise(function (resolve, reject) {
    var response = {};

    if (fileName[0] === '/') {
      fileName = fileName.substring(1); //if '/' exist at the first place of the path
    }

    const params = {
      Bucket: bucket_name,
      Key: fileName,
    };

    s3.deleteObject(params, function (err, data) {
      console.log("err", err);
      if (err) {
        response = {
          message: "error",
          data: err,
        };
      }
      if (data) {
        console.log("data", data);
      }
    });
  });
};

exports.createThumbnail = function (file, bucket_path, bucket) {
  var fileName = file.split(".");
  ffmpeg(bucket_path + file)
    .on("filenames", function (filenames) {
      console.log("Will generate " + filenames.join(", "));
    })
    .on("end", async function (success, error) {
      const readStream = fs.createReadStream(
        "thumbnails/" + fileName[0] + ".png"
      );
      var fileType = await FileType.fromFile(
        "thumbnails/" + fileName[0] + ".png"
      );

      const params = {
        Bucket: bucket,
        Key: fileName[0] + ".png",
        Body: readStream,
        ContentType: fileType.mime,
      };

      s3.upload(params, async function (err, data) {
        readStream.destroy();
        if (err) {
          //console.log('err',err);
        }
        if (data) {
          //console.log('data', data);
          fs.unlink("thumbnails/" + fileName[0] + ".png", (err, deleted) => {
            if (err) {
              console.error(err);
            }
            // console.log('deleted-------------',deleted);
          });
          uploadedfile = data.key;
        }
      });
    })
    .screenshots({
      count: 1,
      filename: fileName[0] + ".png",
      folder: "thumbnails",
      // size: '320x240',
      //size:dimensions.width*dimensions.height
    });
};

exports.containsObject = (obj, list) => {
  var i;
  for (i = 0; i < list.length; i++) {
    if (
      list[i].start_time === obj.start_time ||
      list[i].end_time === obj.end_time
    ) {
      return true;
    }
  }

  return false;
};

exports.verifyUser = (token) => {
  return new Promise(function (resolve, reject) {
    jwt.verify(
      token,
      process.env.JWT_SECRET,
      {
        audience: process.env.JWT_AUDIENCE,
        expiresIn: process.env.JWT_TIMEOUT_DURATION,
      },
      function (err, token_data) {
        if (err) {
          reject(err);
        }
        if (token_data) {
          resolve(token_data);
        }
      }
    );
  });
};

/*
    deleteFilesFromS3BucketWithPromise acceptes 2 argumet out of which one
    is an Array of urls or can be single url string
*/
exports.deleteFilesFromS3BucketWithPromise = async (files) => {
  let deleteArray = [];
  let params = {
      Bucket: constants.INSTACUT_BUCKET_NAME,
      Delete: {
          Objects: []
      }
  };
  if (files && Array.isArray(files) && files.length > 0) {
      files.forEach(function (path) {
          if (path.includes("http")) {
              path = path.split("com/")[1]
          }
          if (path[0] === '/') {
              path = path.substring(1); //if '/' exist at the first place of the path
          }
          deleteArray.push({ Key: path });
      });
      params.Delete.Objects = deleteArray;
  } else if (typeof files === "string") {
      if (files.includes("http")) {
          files = files.split("com/")[1]
      }
      if (files[0] === '/') {
          files = files.substring(1); //if '/' exist at the first place of the path
      }
      deleteArray.push({ Key: files });
      params.Delete.Objects = deleteArray;
  }
  else {
      return "No URL found in the FILE!";
  }
  try {
      const deletedRes = await s3.deleteObjects(params).promise();
      return deletedRes;
  } catch (error) {
      throw new Error(error);
  }
}

exports.getMonthName = (month) => {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return monthNames[month];
};

exports.getWeeksInMonth = (week) => {
  var d = new Date();
  var month = d.getMonth();
  var year = d.getFullYear();
  const weeks = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  let dayOfWeek = firstDay.getDay();
  let start;
  let end;

  for (let i = 1; i < daysInMonth + 1; i++) {
    if (dayOfWeek === 0 || i === 1) {
      start = i;
    }

    if (dayOfWeek === 6 || i === daysInMonth) {
      end = i;

      if (start !== end) {
        weeks.push({
          start: new Date(year, month, parseInt(start) + 1),
          end: new Date(year, month, parseInt(end) + 1),
        });
      }
    }

    dayOfWeek = new Date(year, month, i).getDay();
  }

  if (weeks) {
    return weeks[week];
  }
};

exports.getTodaysCustomerCharge = async (customerID, limit = 10) => {

  try {
      const d = new Date();

      // convert to msec since Jan 1 1970
      const localTime = d.getTime();

      // obtain local UTC offset and convert to msec
      const localOffset = d.getTimezoneOffset() * 60 * 1000;

      // obtain UTC time in msec
      const utcTime = localTime + localOffset;

      // obtain and add destination's UTC time offset
      const estOffset = getEstOffset();
      const usa = utcTime + 60 * 60 * 1000 * estOffset;
      // convert msec value to date string
      const usaTime = new Date(usa);

      const usaTimeInMiliSec = usaTime.getTime();

      const hours = usaTime.getHours();
      const minutes = usaTime.getMinutes();
      const seconds = usaTime.getSeconds();

      // setting the time to 00:00:00
      const newUtcOffSetTime = usaTimeInMiliSec - (hours * 60 * 60 * 1000 + minutes * 60 * 1000 + seconds * 1000);

      const updatedTime = new Date(newUtcOffSetTime);

      const timeInUnix = Math.floor(updatedTime.getTime() / 1000);

      const customerCharges = await stripe.charges.list({
          limit,
          customer: customerID,
          created: {
              gte: timeInUnix,
          },
      });

      return customerCharges?.data || [];
  } catch (error) {
      console.log("--error--", error);
      throw error;
  }

}

exports.createCharge = async (charge, customer_id) => {
  // console.log(charge,customer_id);
  //
  // let paymentIntent = await stripe.paymentIntents.create({
  //     amount: charge,
  //     currency: 'usd',
  //     customer: customer_id,
  // });

  let response = await stripe.charges.create({
    amount: charge,
    currency: "usd",
    customer: customer_id,
  });
  return response;
};

const generateMedia_id = async () =>{
  let unique = false;
  let media_id;
  while(!unique){
    media_id = uuidv4().substring(0, 7);
    const customerRefExists = await UserModel.findOne({media_id});
    const stylistRefExists = await ServiceProviderModel.findOne({media_id});
    if(!customerRefExists && !stylistRefExists){
      unique = true;
    }
  }
  return media_id;
}

exports.UpdateMediaId = async (id) =>{
  media_id = await generateMedia_id()
  await UserModel.findByIdAndUpdate(id,{
    $set:{
      media_id
    }
  })
  return media_id
}