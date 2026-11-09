var express = require('express');
var router = express.Router();
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
let cors = require('cors')
var bodyparser = require('body-parser')
require("dotenv").config();
var app = express();
const crypto = require("./helpers/crypto");
const {requestHandler, responseHandler} = require("express-intercept");

//Mongodb Atlas Connection Starts 
var MONGODB_URL = process.env.MONGODB_URL;

var mongoose = require('mongoose');
mongoose.connect(MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
	//don't show the log when it is test
	if(process.env.NODE_ENV !== "test") {
		console.log("Connected to %s", MONGODB_URL);
		console.log("App is running ... \n");
		console.log("Press CTRL + C to stop the process. \n");
	}
}).catch(err => {
	console.log(err)
		console.error("App starting error:", err.message);
		process.exit(1);
});
// Mongodb Atlas Connection Ends

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(responseHandler().if(async res => await crypto.isAllowedVersion(res.req.originalUrl)).replaceString((body) =>{
	//Change body of the response to JSON
	const bodyObject = JSON.parse(body)
	//If the data exist, we must encrypt it.
	if(typeof bodyObject.data != 'undefined'){
    if(Array.isArray(bodyObject.data)){
      bodyObject.data = {results: bodyObject.data};
    }
		bodyObject.data = crypto.encrypt(bodyObject.data);
	}
	if(typeof bodyObject.extraData != 'undefined'){
		bodyObject.extraData = crypto.encrypt(bodyObject.extraData);
	}
	return JSON.stringify(bodyObject)
}))

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: false}));
// app.use(cors());

app.use(function (req, res, next) {
	// Website you wish to allow to connect
	res.setHeader('Access-Control-Allow-Origin', '*');

	// Request methods you wish to allow
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

	// Request headers you wish to allow
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type, Authorization, Store');

	// Set to true if you need the website to include cookies in the requests sent
	// to the API (e.g. in case you use sessions)
	res.setHeader('Access-Control-Allow-Credentials', true);

	// Pass to next layer of middleware
	next();
});

app.use((req, res, next) => {
	res.set('Cache-Control', 'no-store')
	next()
})

// Index Routes Start
app.get('/customer', function(req, res, next) {
    res.render('index', { title: 'Express' });
});
  
app.get('/customer/privacy-policy', function(req, res, next) {
    res.render('privacy_policy', { title: 'Instacuts Privacy Policy' });
});
// Index Routes Ends
let userAuthRoutes = require('./routes/api')

app.param('version', async (req, res, next, value)=>{
	if(!await crypto.isAllowedVersion(req.originalUrl)){
		return res.status(400).json({msg:"Version not allowed"})
	}
	next()
})

app.use('/customer', userAuthRoutes)
app.use('/customer/:version', crypto.decryptReq, userAuthRoutes)

// catch 404 and forward to error handler
app.use((req, res, next) => {
	const error = new Error("Request Not Found");
	error.status = 404;
	next(error);
});

// error handler
app.use((error, req, res, next) => {
	res.status(error.status || 500);
	let message = error.status ? error.message : "Internal Server Error";
	console.warn(error);
	res.json({
		error: true,
		message: message,
	});
	return false;
});

app.listen(process.env.PORT,() => {
    console.log(`Server started ${process.env.PORT}...`)
})
