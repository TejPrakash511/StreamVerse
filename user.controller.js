import { ApiError } from "../utils/ApiError.js";
import {asyncHoldler} from "../utils/asyncHoldler.js"
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
      // if(!user)console.log("user not found");
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
       // console.log("token generated")

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
       // console.log(error.message)
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const registerUser = asyncHoldler( async (req,res)=>{
    // res.status(200).json({
    //     message:"ok"
    // })
    const {email,fullName,username,password}=req.body;
    //console.log("req.body : ",req.body);
    //console.log(email);

    if(fullName===""){
        throw new ApiError(400,"fullname is required")
    }
    if(email===""){
        throw new ApiError(400,"email is required")
    }
    if(username===""){
        throw new ApiError(400,"username is required")
    }
    if(password===""){
        throw new ApiError(400,"password is required")
    }

    //check for existed user
    const existedUser= await User.findOne({
        $or:[{ username }, { email }]
    })
    if (existedUser)
    {
        throw new ApiError(409,"User with email or username already exists")
    }

    //check for avatar and cover image
    //extract path of avatar and cover image from multer
    const avatarLocalPath=req.files?.avatar[0]?.path;
   // const coverImageLocalPath=req.files?.coverImage[0]?.path;

   let coverImageLocalPath;//we will often see a error "cant read properties from undefined".because req.files or any other
   //property are not existing . For this , use the below syntax
   if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
       coverImageLocalPath = req.files.coverImage[0].path
   }
 //  console.log("req.files : ",req.files);

    //avatar is required;
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar  is required")
    }

    //upload file on cloudinary
  //  console.log(avatarLocalPath);
    const avatar=await uploadOnCloudinary(avatarLocalPath);
    const coverImage=await uploadOnCloudinary(coverImageLocalPath);

    //again check for avatar if its not there the database will be phat jaega
    if(!avatar)
    {
        throw new ApiError(400,"Avatar is required");
    }

    //create object for user
    const user=await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })
//firstly checking the user has been created or not and then selecting which field we dont want to show to the front end user using select keyword
    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser)
    {
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

})

const loginUser= asyncHoldler(async(req,res)=>
{
    //taking requirement fields for login
    const{username, email, password}=req.body;

    //if username and email are not entered
   // console.log("password ", password);
    if(!username && !email)
    {
        throw new ApiError(400, "username or email is required")
    }

    //finding the user
    const user=await User.findOne({
        $or: [{username},{email}]
    })
    // console.log("user ",user);
   //if(user)console.log("user is present");
    //checking the password
    if(user._id=="")console.log("invalid user")
    const isPasswordValid= await user.isPasswordCorrect(password);
    // console.log(isPasswordValid)
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials")
    }
    // console.log("check")

//console.log("userId ",user._id)
    const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser= await User.findById(user._id).select("-password -refreshToken")
     
    //now only server can modify these cookies
    const options={
        httpOnly:true,
        secure: true
    }
    return res.status(200)
    .cookie("accessToken" , accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )
})

const logoutUser= asyncHoldler(async(req,res)=>
{
    await User.findByIdAndUpdate(
        req.user._id,
    {
    $unset: {
        refreshToken: 1 // this removes the field from document
    }
    },
    {
        new:true
    }
    )
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))

    })

    const refreshAccessToken = asyncHoldler(async (req, res) => {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    
        if (!incomingRefreshToken) {
            throw new ApiError(401, "unauthorized request")
        }
    
        try {
            const decodedToken = jwt.verify(
                incomingRefreshToken,
                process.env.REFRESH_TOKEN_SECRET
            )
        
            const user = await User.findById(decodedToken?._id)
        
            if (!user) {
                throw new ApiError(401, "Invalid refresh token")
            }
        
            if (incomingRefreshToken !== user?.refreshToken) {
                throw new ApiError(401, "Refresh token is expired or used")
                
            }
        
            const options = {
                httpOnly: true,
                secure: true
            }
        
            const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
        
            return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200, 
                    {accessToken, refreshToken: newRefreshToken},
                    "Access token refreshed"
                )
            )
        } catch (error) {
            throw new ApiError(401, error?.message || "Invalid refresh token")
        }
    
    })

    const changeCurrentPassword = asyncHoldler(async(req, res) => {
        const {oldPassword, newPassword} = req.body
    
        
    
        const user = await User.findById(req.user?._id)
        const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    
        if (!isPasswordCorrect) {
            throw new ApiError(400, "Invalid old password")
        }
    
        user.password = newPassword
        await user.save({validateBeforeSave: false})
    
        return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))
    })

    const getCurrentUser = asyncHoldler(async(req, res) => {
        return res
        .status(200)
        .json(new ApiResponse(
            200,
            req.user,
            "User fetched successfully"
        ))
    })

    const updateAccountDetails = asyncHoldler(async(req, res) => {
        const {fullName, email} = req.body
    
        if (!fullName || !email) {
            throw new ApiError(400, "All fields are required")
        }
    
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    fullName,
                    email: email
                }
            },
            {new: true}
            
        ).select("-password")

        // const user=await User.findById(req.user?._id);
        // user.fullName=fullName;
        // user.email=email;
        //await user.save({validateBeforeSave:false})
    
        return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))
    })
    
    const updateUserAvatar = asyncHoldler(async(req, res) => {
        const avatarLocalPath = req.file?.path
    
        if (!avatarLocalPath) {
            throw new ApiError(400, "Avatar file is missing")
        }
    
        //TODO: delete old image - assignment
    
        const avatar = await uploadOnCloudinary(avatarLocalPath)
    
        if (!avatar.url) {
            throw new ApiError(400, "Error while uploading on avatar")
            
        }
    
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    avatar: avatar.url
                }
            },
            {new: true}
        ).select("-password")
    
        return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Avatar image updated successfully")
        )
    })
    
   const updateUserCoverImage = asyncHoldler(async(req, res) => {
        const coverImageLocalPath = req.file?.path
    
        if (!coverImageLocalPath) {
            throw new ApiError(400, "Cover image file is missing")
        }
    
        //TODO: delete old image - assignment
    
    
        const  coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
        if (!coverImage.url) {
            throw new ApiError(400, "Error while uploading on avatar")
            
        }
        const data=await User.findById(req.user?._id);
    console.log("user for updation ", data)
        
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    coverImage: coverImage.url
                }
            },
            {new: true}
        ).select("-password")
    
        return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Cover image updated successfully")
        )
    })
    
    const getUserChannelProfile = asyncHoldler(async(req, res) => {
        const {username} = req.params
        console.log(username)
    
        if (!username?.trim()) {
            throw new ApiError(400, "username is missing")
        }
    
        const channel = await User.aggregate([
            {
                $match: {
                    username: username?.toLowerCase()
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscribedTo"
                }
            },
            {
                $addFields: {
                    subscribersCount: {
                        $size: "$subscribers"
                    },
                    channelsSubscribedToCount: {
                        $size: "$subscribedTo"
                    },
                    isSubscribed: {
                        $cond: {
                            if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $project: {
                    fullName: 1,
                    username: 1,
                    subscribersCount: 1,
                    channelsSubscribedToCount: 1,
                    isSubscribed: 1,
                    avatar: 1,
                    coverImage: 1,
                    email: 1
    
                }
            }
        ])
        console.log("channel : ", channel.length)
    
        if (!channel?.length) {
            throw new ApiError(404, "channel does not exists")
        }
    
        return res
        .status(200)
        .json(
            new ApiResponse(200, channel[0], "User channel fetched successfully")
        )
    })

    const getWatchHistory = asyncHoldler(async(req, res) => {
        const user = await User.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(req.user._id)
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "watchHistory",
                    foreignField: "_id",
                    as: "watchHistory",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",
                                pipeline: [
                                    {
                                        $project: {
                                            fullName: 1,
                                            username: 1,
                                            avatar: 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields:{
                                owner:{
                                    $first: "$owner"
                                }
                            }
                        }
                    ]
                }
            }
        ])
    
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch history fetched successfully"
            )
        )
    })
     
    

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory

}