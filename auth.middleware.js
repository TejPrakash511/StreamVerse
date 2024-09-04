import { ApiError } from "../utils/ApiError.js";
import { asyncHoldler } from "../utils/asyncHoldler.js";
import jwt from "jsonwebtoken"
import {User} from "../models/user.model.js"

//this middleware is used to find the user using access token for certain 
//purpose like logging out the user 
export const verifyJWT= asyncHoldler(async(req, _, next)=>{
    try {
        const token= req.cookies?.accessToken|| req.header("Authorization")

        if(!token){
            throw new ApiError(401, "Unauthorized request")
        }

        const decodedToken= jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const user= await User.findById(decodedToken?._id).select("-password -refreshToken")

        if(!user)
        {
            throw new ApiError(401, "Invalid Access Token")
        }

        req.user=user;
        next()
        
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
})