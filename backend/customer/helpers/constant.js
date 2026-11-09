const kBucketName = process.env.AWS_BUCKET_NAME;
const imageKitURL = process.env.IMAGEKIT_URL;
const kFullBucketName = kBucketName + ".s3.amazonaws.com";

//GET START
exports.IMAGEKIT_URL = imageKitURL;
//GET END

//POST START
exports.CUSTOMER_BUCKET = (media_id) =>{
    return `${kBucketName}/${media_id}/customer/`
}
exports.CUSTOMER_PROFILE_ABS = "/customer/profile/";
exports.CUSTOMER_FAMILY_MEMBER_PROFILE_ABS = "/customer/profile/family_member/";
//POST END

//UNUSED START
exports.CUSTOM_SERVICE_IMAGE = "https://" + kFullBucketName + "/custom_services/images/";
exports.CUSTOM_SERVICE_IMAGE_ABSOLUTE_PATH = "/custom_services/images/";
exports.CUSTOM_SERVICE_DIR_NAME = "custom_services";
exports.CUSTOM_SERVICE_VIDEO = "https://" + kFullBucketName + "/custom_services/videos/";
exports.CUSTOM_SERVICE_VIDEO_ABSOLUTE_PATH = "/custom_services/videos/";
exports.CUSTOM_SERVICE_VIDEO_THUMBNAIL = "https://" + kFullBucketName + "/custom_services/videos/thumbnails/";
exports.CUSTOM_SERVICE_BUCKET = kBucketName + "/custom_services/";
exports.CUSTOM_SERVICE_TUMBNAIL_BUCKET = kBucketName + "/custom_services/thumbnails/";
exports.CUSTOM_SERVICE = "https://" + kFullBucketName + "/custom_services/";
exports.INSTACUT_BUCKET_NAME = kBucketName; // Used in deleteFilesFromS3BucketWithPromise function in utility file, but that fuction is not used.
exports.STYLIST_PROFILE = "https://" + kFullBucketName + "/service_provider/profile/";
//exports.STYLIST_PROFILE = "/service_provider/profile/"; // Repited constant name ^
exports.STYLIST_PORTFOLIO = "/service_provider/portfolio/";
exports.STYLIST_PORTFOLIO_THUMBNAIL = "/service_provider/portfolio/thumbnails/";
exports.STYLIST_PORTFOLIO_BUCKET = kBucketName + "/service_provider/portfolio"
exports.SERVICE_PROVIDER = kBucketName + "/service_provider/";
exports.CUSTOMER_PROFILE = "/customer/profile/";
exports.SERVICE_BUCKET = kBucketName + "/services/";
exports.SERVICE_IMAGE = "/services/images/";
exports.SERVICE_VIDEO = "https://" + kFullBucketName + "/services/videos/";
exports.SERVICE_FEATURED_IMAGE = "/services/featured_image/";
exports.SERVICE_SECTION_IMAGE = "/services/section_image/";
exports.SERVICE_CATEGORY = "/service_category/"
exports.CATEGORY_BUCKET='" + kBucketName + "/category/';
exports.COSMETOLOGY_LICENSE_IMAGE = "https://" + kFullBucketName + "/service_provider/cosmetology_licence/";
exports.LIABILITY_IMAGE = "https://" + kFullBucketName + "/service_provider/liability_waiver/";
exports.DRIVING_LICENSE_IMAGE = "https://" + kFullBucketName + "/service_provider/driving_licence/"
exports.CONTRACT = "https://" + kFullBucketName + "/service_provider/contract/"
exports.CONTRACT_ABS_URL = "/service_provider/contract/"
exports.INSTACUT_BUCKET_URL = "https://" + kFullBucketName;
exports.CATEGORY_SECTION_IMAGE='/category/section_image/';
exports.CATEGORY_FEATURED_IMAGE='/category/featured_image/';
//UNUSED END

exports.STYLIST_REWARD_PRICE=20
exports.CUSTOMER_REWARD_PRICE=10

exports.STYLIST_WITHDRAWL_LIMIT=50;

exports.KID_AGE=14;
exports.SENIOR_AGE=55;
exports.METERS_PER_MILE = 1609.34;
exports.MILES_PER_METER = 0.000621371;
exports.DEFAULT_RADIUS=50;

exports.WEEKDAY_LIST = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Sunday: 7
}
/* COMMENTING BECAUSE CAUSE ERRORS KEEPING BECAUSE BOSS MADE CHANGES LEADING TO THIS
   54d969e4ba70ba84702e7b2dfb7652521b4f5464
   IF EVERYTHING WORKS IN PROD DELETE THIS

const kBucketName = process.env.AWS_BUCKET_NAME;
const kFullBucketName = kBucketName + ".s3.amazonaws.com";

exports.CUSTOM_SERVICE_IMAGE = "https://" + kFullBucketName + "/custom_services/images/";
exports.CUSTOM_SERVICE_IMAGE_ABSOLUTE_PATH = "/custom_services/images/";
exports.CUSTOM_SERVICE_DIR_NAME = "custom_services";
exports.CUSTOM_SERVICE_VIDEO = "https://" + kFullBucketName + "/custom_services/videos/";
exports.CUSTOM_SERVICE_VIDEO_ABSOLUTE_PATH = "/custom_services/videos/";
exports.CUSTOM_SERVICE_VIDEO_THUMBNAIL = "https://" + kFullBucketName + "/custom_services/videos/thumbnails/";
exports.CUSTOM_SERVICE_BUCKET = kBucketName + "/custom_services/";
exports.CUSTOM_SERVICE_TUMBNAIL_BUCKET = "instacuts/custom_services/thumbnails/";
exports.CUSTOM_SERVICE = "https://" + kFullBucketName + "/custom_services/";
exports.INSTACUT_BUCKET_URL = "https://" + kFullBucketName;
exports.INSTACUT_BUCKET_NAME = kBucketName;

exports.STYLIST_PROFILE = "/service_provider/profile/";
exports.STYLIST_PORTFOLIO = "/service_provider/portfolio/";
exports.STYLIST_PORTFOLIO_THUMBNAIL = "/service_provider/portfolio/thumbnails/";
exports.STYLIST_PORTFOLIO_BUCKET = kBucketName + "/service_provider/portfolio"
exports.SERVICE_PROVIDER = kBucketName + "/service_provider/";

exports.CUSTOMER_BUCKET = kBucketName + "/customer/";
exports.CUSTOMER_PROFILE = "/customer/profile/";
exports.CUSTOMER_PROFILE_ABS = "/customer/profile/";
exports.CUSTOMER_FAMILY_MEMBER_PROFILE_ABS = "/customer/profile/family_member/";

exports.SERVICE_BUCKET = kBucketName + "/services/";
exports.SERVICE_IMAGE = "/services/images/";
exports.SERVICE_VIDEO = "https://" + kFullBucketName + "/services/videos/";
exports.SERVICE_FEATURED_IMAGE = "/services/featured_image/";
exports.SERVICE_SECTION_IMAGE = "/services/section_image/";


exports.SERVICE_CATEGORY = "https://" + kFullBucketName + "/service_category/"

exports.CATEGORY_FEATURED_IMAGE='https://' + kFullBucketName + '/category/featured_image/';
exports.CATEGORY_SECTION_IMAGE='https://'+ kFullBucketName +'/category/section_image/';
exports.CATEGORY_BUCKET= kBucketName +'/category/';


exports.COSMETOLOGY_LICENSE_IMAGE = "https://" + kFullBucketName + "/service_provider/cosmetology_licence/";
exports.LIABILITY_IMAGE = "https://" + kFullBucketName + "/service_provider/liability_waiver/";
exports.DRIVING_LICENSE_IMAGE = "https://" + kFullBucketName + "/service_provider/driving_licence/"
exports.CONTRACT = "https://"+ kFullBucketName +"/service_provider/contract/"
exports.CONTRACT_ABS_URL = "/service_provider/contract/"

exports.STYLIST_REWARD_PRICE=20
exports.CUSTOMER_REWARD_PRICE=10


exports.KID_AGE=14;
exports.SENIOR_AGE=55;
exports.METERS_PER_MILE = 1609.34;
exports.MILES_PER_METER = 0.000621371;
exports.DEFAULT_RADIUS=5;
exports.STYLIST_WITHDRAWL_LIMIT=50;
*/
