import  {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js"

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken,refreshToken}

        } catch (error) {
        throw new ApiError(500, "something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async(req,res) => {
    // steps to register a user
    //1. get user detail from frontend
    ///2. validation -not empty
    //3. check if user already exist: username,email
    //4. check for images, check for avatar
    //5. uplad them to cloudinary,avatar
    //6. create user object - create entry in db
    //7.remove password and refresf token field from response 
    //8.check for user creation
    //9. return response


    const {username,email,fullname,password} = req.body
    // console.log("email",email);

    if(
        [fullname,email,password,username].some((field) => field?.trim()==="")
    ){
        throw new ApiError(400,"all fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if(existedUser){
        throw new ApiError(409,"User with email or username already exist")
    }
    // console.log(req.files);
    
    const avatarLocalPath= req.files?.avatar[0]?.path
    // const coverImageLocalPath= req.files?.coverImage[0]?.path

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length>0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"avatar file is required")
    }

    const user = await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"something went wrong when registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registered successfully")
    )
    
})

const loginUser = asyncHandler(async(req,res) => {
    //  req body -> data
    // username or email
    // find the user 
    // password check
    // access and refresh token
    // send cookies


    const {email,username, password} = req.body

    if(!username || !email){
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "userdoes not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"invalid user credentials")
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure:true
    }

    return res
    .status(200)
    .cookie("access   Token", accessToken,options)
    .cookie("refreshToken", refreshToken,options)
    .json(
        new ApiResponse(200,
            {
                user: loggedInUser,accessToken,refreshToken
            },
            "user logged in successfully"
        )
    )
})


const logoutUser = asyncHandler(async(req,res) => {
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )

    const options = {
        httpOnly: true,
        secure:true
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200, {}, "user logged out"))
})

export {registerUser,loginUser,logoutUser}