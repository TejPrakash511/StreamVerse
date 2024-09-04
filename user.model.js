import mongoose , {Schema} from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const userSchema=new Schema(//or new Schema({}) but for this firstly define import schema like {shema} from mongoose
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true, //removes leading and trailing whitespaces 
            index: true//it enhances the searching alogorithm for a specific component
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowecase: true,
            trim: true, 
        },
        fullName: {
            type: String,
            required: true,
            trim: true, 
            index: true
        },
        avatar: {
            type: String, // cloudinary url
            required: true,
        },
        coverImage: {
            type: String, // cloudinary url
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        password: {
            type: String,
            required: [true, 'Password is required']
        },
        refreshToken: {
            type: String
        }

    },
    {
        timestamps:true
    }
)

userSchema.pre("save",async function (next) {
        if(this.isModified("password")){
        this.password=await bcrypt.hash(this.password,10);//10->number of salt rounds
        }
        next();
    })

    userSchema.methods.isPasswordCorrect=async function(password)
        {
            return await bcrypt.compare(password,this.password);
        }
    

        userSchema.methods.generateAccessToken = function(){
            return jwt.sign(
                {
                    _id: this._id,
                    email: this.email,
                    username: this.username,
                    fullName: this.fullName
                },
                process.env.ACCESS_TOKEN_SECRET,
                {
                    expiresIn: process.env.ACCESS_TOKEN_EXPIRY
                }
            )
        }
        userSchema.methods.generateRefreshToken = function(){
            return jwt.sign(
                {
                    _id: this._id,
                    
                },
                process.env.REFRESH_TOKEN_SECRET,
                {
                    expiresIn: process.env.REFRESH_TOKEN_EXPIRY
                }
            )
        }

export const User=mongoose.model("User",userSchema);