const CryptoJS = require("crypto-js");
const apiResponse = require("./apiResponse")
const empty = require("is-empty");

module.exports.decryptReq = async function (req, res, next) {
    try{
        const {query} = req;
        const {authorization} = req.headers;
        req.body = await decryptBody(req.body.body);
        if(!empty(authorization) && authorization){
            const access_token = authorization.split(' ')[1];
            console.log("decrypt pre", access_token);
            req.headers.authorization = "Bearer " + await decrypt(access_token);
            console.log("decrypt pos", req.headers.authorization);

        }
        if(!empty(query) && query){
            for(const props in query){
                req.query[props] = await decrypt(req.query[props]);
            }
        }
        next()
    }catch(err){
        return apiResponse.ErrorResponse(res,"Something went wrong while decrypting the data",err)
    }
    
}


module.exports.encrypt = function (value) {
    return CryptoJS.AES.encrypt(JSON.stringify(value), process.env.CRYPTO_KEY).toString();
}

const decrypt = (value) =>{
    //console.log("decrypt:", value);
    const bytes  = CryptoJS.AES.decrypt(value, process.env.CRYPTO_KEY);
    //console.log("decrypted: ", bytes.toString(CryptoJS.enc.Utf8));
    return bytes.toString(CryptoJS.enc.Utf8); 
}

const decryptBody = async (body) =>{
    return body ?  JSON.parse(await decrypt(body)) : {};
}

//Fuction to decide decrypt and encrypt the data
const isAllowedVersion = async (originalUrl) =>{
    const versionRegex = /\/v\d\.\d\.\d\//;
    const version = versionRegex.exec(originalUrl);
    if(!version || version.length < 1){
      return false;
    }
    const numberRegex = /[0-9]/g;
    const versionNumbers = version[0].match(numberRegex);
    if(!versionNumbers || versionNumbers.length != 3){
      return false;
    }
    const versionNumber = versionNumbers.reverse().map(x=>parseInt(x)).reduce(
      (accumulator, value, index) => accumulator + (Math.pow(10, index) * value)
    );
    console.log(versionNumber);
    if(versionNumber < 111){
      return false
    }

    return true;
  /*
    const versionExist = /v\d\.\d\.\d/;
    if(!versionExist.test(originalUrl)){
        return false
    }
    const validNumbers = /[0-9]/g;
    const found = originalUrl.match(validNumbers)
    if(!found || found.length != 3){
        return false
    };
    if(parseInt(found.toString().replaceAll(/,/g, '')) < 111){
        return false
    }
    return true;
  */
}

exports.decrypt = decrypt;
exports.decryptBody = decryptBody;
exports.isAllowedVersion = isAllowedVersion;
