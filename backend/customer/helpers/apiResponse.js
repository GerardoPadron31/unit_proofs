exports.successResponse = async function (res, msg) {
	var data = {
		status: 200,
		message: msg
	};
	return res.status(200).json(data);
};

exports.successResponseWithData = async function (res, msg, data) {
	var resData = {
		status: 200,
		message: msg,
		data: data
	};
	return res.status(200).json(resData);
};

exports.successResponseWithExtraData = async function(res, msg, extraData,data)
{
	var resData = {
		status: 200,
		message: msg,
		extraData: extraData,
		data: data
	};
	return res.status(200).json(resData);
}

exports.successResponseWithNoData = async function (res, msg) {
	var resData = {
		status: 200,
		message: msg		
	};
	return res.status(200).json(resData);
};

exports.ErrorResponse = async function (res, msg,data) {	
	var data = {
		status: 400,
		message: msg,
		data:data
	};
	return res.status(400).json(data);
};

exports.ErrorResponseWithExtraData = async function (res, msg,extradata,data) {	
	var data = {
		status: 400,
		message: msg,
		extraData:extradata,
		data:data
	};
	return res.status(400).json(data);
};

exports.ErrorResponseWithoutData = async function (res, msg) {	
	var data = {
		status: 400,
		message: msg		
	};
	return res.status(400).json(data);
};

exports.notFoundResponse = async function (res, msg,data) {
	var data = {
		status: 404,
		message: msg,
		data:data
	};
	return res.status(404).json(data);
};

exports.notFoundResponseWithExtraData = async function (res, msg,extradata,data) {
	var data = {
		status: 404,
		message: msg,
		extraData:extradata,
		data:data
	};
	return res.status(404).json(data);
};

exports.notFoundResponseWithNoData = async function(res, msg)
{
	var data = {
		status: 404,
		message: msg		
	};
	return res.status(404).json(data);
}

exports.validationErrorWithData = async function (res, msg, data) {
	var resData = {
		status: 422,
		message: msg,
		data: data
	};
	return res.status(422).json(resData);
};

exports.validationError = async function (res, msg) {
	var resData = {
		status: 422,
		message: msg	
	};
	return res.status(422).json(resData);
};

exports.unauthorizedResponse = async function (res, msg,data) {
	var data = {
		status: 401,
		message: msg,
		data:data
	};
	return res.status(401).json(data);
};

exports.unauthorizedResponseWithoutData = async function (res, msg) {
	var data = {
		status: 401,
		message: msg		
	};
	return res.status(401).json(data);
};