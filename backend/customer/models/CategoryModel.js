//reviewed categories model 10/04
var mongoose = require("mongoose");
var validate = require("mongoose-validator");

function addImageKitUrl(path){
    if(path != ""){
        path = path.includes(process.env.IMAGEKIT_URL) ? path : process.env.IMAGEKIT_URL + path
    }
    return path;
}
const CategorySchema = new mongoose.Schema({       
        name:{
            type:String,
            required:true
        },  
        description:{
            type:String,
            default:''
        },
        permalink:{
            type:String,
            default:''
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
        seo_title:{
            type:String,
            default:''
        }, 
        seo_description:{
            type:String,
            default:''
        },
        index:{
            type:Boolean,
            default:false
        },
        no_index:{
            type:Boolean,
            default:false
        },
        follow:{
            type:Boolean,
            default:false
        },
        no_follow:{
            type:Boolean,
            default:false
        },
        canonical_url:{
            type:String,
            default:''
        },
        status:{
            type:Boolean,
            default:true
        },
        deleted:{
            type:Boolean,
            default:false
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

module.exports = mongoose.model("categories", CategorySchema);
