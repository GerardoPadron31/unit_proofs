// reviewed services model 10/04
var mongoose = require("mongoose");
var validate = require("mongoose-validator");
var Schema = mongoose.Schema;

function addImageKitUrl(path){
    if(path != ""){
        path = path.includes(process.env.IMAGEKIT_URL) ? path : process.env.IMAGEKIT_URL + path
    }
    return path;
}

function addImageKitUrlArray(path){
    return path?.map(item=>{
        if(item != ""){
            item = item.includes(process.env.IMAGEKIT_URL) ? item : process.env.IMAGEKIT_URL + item
        }
        return item;
    });
}

const videosSchema = new mongoose.Schema({
    url: {
        type: String,
        get:addImageKitUrl,
        default: ''
    },
    thumbnail_url: {type: String, default: null}
},{
    toJSON: {getters: true},
    toObject: {getters: true},

})
const ServiceSchema = new mongoose.Schema({       
        title:{
            type:String,
            required:true,
            unique:true
        },
        permalink:{
            type:String,
            default:'',
            unique:true,
        },
        duration:{
            type:Number,
            default:0
        },
        description:{
            type:String,
            default:''
        },
        age_group:{
            type:Array,
            default:[]
        },
        stylist_type:{
            type:Array,
            default:[]
        },
        category_id:{
            type: Schema.Types.ObjectId, 
            ref: 'categories',
            required:true 
            //default: null
        },
        subcategory_id:{
            type: Schema.Types.ObjectId,
            //ref: 'categories.sub_categories',
            ref: 'sub_categories',
            //required:true 
            default:null
        },
        regular_price:{
            type:Number,
            default:0
        },
        regular_price_currency: {
            type: String,
            default: 'usd'
        },
        sale_price:{
            type:Number,
            default:0
        },
        sale_price_currency: {
            type: String,
            default: 'usd'
        },
        quantity:{
            type:Number,
            default:0
        },
        featured_image:{
            type:String,
            get:addImageKitUrl,
            default:''
        }, 
        section_image:{
            type:String,
            get:addImageKitUrl,
            default:''
        },
        note:{
            type:String,
            default:''
        },
        /*
        images:{
            type:Array,
            default:[] 
        }, 
        videos:{
            type:Array,
            default:[]
        }, 
        parent_location:{
            type:Array,
            default:[]
        },
         */
        mobile_images:{
            type:Array,
            get:addImageKitUrlArray,
            default:[] 
        }, 
        mobile_videos:[videosSchema],
        web_images: {
            type: Array,
            get:addImageKitUrlArray,
            default: []
        },
        web_videos:[videosSchema],
        parent_location:[{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'locations',
            required: true
        }],
        deleted:{
            type:Boolean, /** 0 - not deleted, 1 - soft deleted or trashed */
            default:0
        }, 
        status:{
            type:Boolean,   /** 0= draft, 1= published */         
            default:0
        },
        disable:{
            type:Boolean,
            default:0  /** 0= disabled, 1= enabled */
        },
        seo_title:{
            type:String,
            default:''
        }, 
        seo_description:{
            type:String,
            default:''
        },
        seo_index:{
            type:Array,
            default:[]
        },
    created_at: {
        type: String,
        default: Date.now
    },
    updated_at: {
        type: String,
        default: Date.now
    }
},{
    toJSON: {getters: true},
    toObject: {getters: true},
});

module.exports = mongoose.model("services", ServiceSchema);
