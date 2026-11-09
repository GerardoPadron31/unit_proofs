var express = require("express");
const AuthController = require("../controllers/AuthController");
const AddressController = require("../controllers/AddressController");
const HomeController = require("../controllers/HomeController");
const FavouriteController = require("../controllers/FavouritesController");
const RatingController = require("../controllers/RatingController");
const BlockController = require("../controllers/BlockController");
const ContactsController = require("../controllers/ContactsController");
const SosController = require("../controllers/SosController");
var router = express.Router();
let customerMiddleware = require("../middlewares/Customer");
const {decrypt, decryptBody, isAllowedVersion} = require("../helpers/crypto");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    //Decript the req.body
    if(await isAllowedVersion(req.originalUrl)){
      req.body = await decryptBody(req.body.body)
    }
    cb(null, "./public/images/", function (err, succ) {
      if (err) throw err;
    });
  },
  filename: function (req, file, cb) {
    const extension = file.originalname.split('.');
    const name = `${Date.now().toString()}.${extension[extension.length - 1]}`;
    cb(null, name, function (err, succ1) {
      if (err) throw err;
    });
  },
});

const upload = multer({ storage: storage, limits: 1000000 });

router.param('id', async (req, res, next, value) => {
  if(await isAllowedVersion(req.originalUrl)){
    req.params.id = await decrypt(value)
  }
  next()
});

router.get("/micro-status", (req, res)=>{return res.status(200).json({status:"ok"})});
// Temp endpoint for UAT
router.delete(
  "/delete/:id",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  AuthController.deleteCustomerById
);
router.post(
  "/c-update-profile-image",
  upload.any(),
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  AuthController.updateProfileImage
);
router.post(
  "/c-update-profile",
  upload.any(),
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  AuthController.updateProfile
);
router.post(
  "/c-update-password",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  AuthController.updatePassword
);
router.post(
  "/add-family-member",
  upload.any(),
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  AuthController.addFamilyMember
);
router.post(
  "/update-family-member-profile",
  upload.any(),
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  AuthController.updateFamilyMemberProfile
);
router.get(
  "/list-all-profiles",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  AuthController.listFamilyMemberProfiles
);
router.post(
  "/delete-family-member-profile",
  upload.any(),
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  AuthController.deleteFamilyMemberprofile
);
router.post(
  "/make-profile-default",
  upload.any(),
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  AuthController.makeProfileDefault
);

router.get(
  "/get-profile",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  AuthController.getProfile
);
router.post(
  "/add-location",
  upload.any(),
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  AddressController.addLocation
);
router.get(
  "/list-addresses",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  AddressController.listAddresses
);
router.post(
  "/delete-address",
  upload.any(),
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  AddressController.deleteAddress
);
router.post(
  "/activate-address",
  upload.any(),
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  AddressController.changeAddressStatus
);

router.post("/category-list", HomeController.listCategories);
router.post(
  "/service-list",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  HomeController.listService
);
router.post(
  "/stylist-services",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  HomeController.getStylistServices
);
router.post("/explore-services", HomeController.exploreServices);
/** Favourite Module */
router.post(
  "/add-fav-service-stylist",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  FavouriteController.addServiceAndStylistToFavourites
);
router.post(
  "/list-fav-services",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  FavouriteController.listFavServices
);
router.post(
  "/list-fav-stylist",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  FavouriteController.listFavStylist
);
router.post(
  "/remove-fav-service-stylist",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  FavouriteController.removeServiceOrStylist
);

/** Preference Management*/
router.post(
  "/set-preference",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  HomeController.setPreference
);

/** Stylist Listing & Search */
router.post(
  "/search-stylist",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  HomeController.searchStylist
);
router.post(
  "/show-all-inactive-stylist",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  HomeController.showAllInactiveStylist
);
router.post(
  "/get-all-active-stylist",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  HomeController.getAllActiveStylist
);
router.post(
  "/stylist-detail",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  HomeController.stylistDetail
);
router.post(
  "/find-nearby-stylist",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  HomeController.FindNearByStylist
);
router.post(
  "/stylist-availability",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  HomeController.StylistAvailabilty
);
/** Rating */
router.post(
  "/list-stylist-rating",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  RatingController.listStylistRating
);

/** */
router.get(
  "/booking-listing",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  AuthController.bookingListing
);
router.post(
  "/booking-detail",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  HomeController.orderDetail
);

/** Block and Unblock Stylist */
router.post(
  "/block-stylist",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  BlockController.blockStylist
);
router.get(
  "/list-block-stylist",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  BlockController.listBlockedStylist
);
router.post(
  "/block-unblock-stylist",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  BlockController.blockUnBlockStylist
);
router.post(
  "/remove-from-blocked-list",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  BlockController.removeFromBlockedList
);

/** Transaction Listing */
router.get(
  "/wallet-transactions",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  HomeController.transactionListing
);
router.get(
  "/transaction/:customerId",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  HomeController.listCustomerTransaction
);

router.post(
  "/get-stylist-time-slots",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  HomeController.getStylistTimeSlots
);
router.get(
  "/get-admin-time-slots",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  HomeController.getAdminTimeSlots
);

router.post(
  "/change-refund-method",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  HomeController.changeRefundMethod
);
// router.get("/refund-to-card",customerMiddleware.redirectAfterAuthentication,customerMiddleware.authorize,HomeController.transferToCard)
// router.post("/add-to-wallet",customerMiddleware.redirectAfterAuthentication,customerMiddleware.authorize,HomeController.cardToWallet)
module.exports = router;

/** Contacts Management   */
router.post(
  "/create-contact",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  ContactsController.createContact
);
router.get(
  "/list-contacts",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  ContactsController.listContact
);
router.post(
  "/delete-contact",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  ContactsController.deleteContact
);

/** SOS request **/
router.post(
  "/create-sos",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  SosController.createSos
);
router.post(
  "/update-sos",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  SosController.updateSos
);
router.post(
  "/end-sos",
  customerMiddleware.redirectAfterAuthentication,
  customerMiddleware.authorize,
  SosController.endSos
);
