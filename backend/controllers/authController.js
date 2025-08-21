import { User } from "../models/UserModel.js";
import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import { sendPasswordResetEmail, sendVerificationEmail, sendWelcomeEmail, sendResetSuccessEmail } from "../mailtrap/emails.js";

export const signup = async (req,res) => {
    const { email, password, name } = req.body;

    try {
        if (!email || !password || !name) {
            throw new error("all fields required")
        }

        const userAlreadyExists = await User.findOne({email});
        if (userAlreadyExists) {
            return res.status(400).json({success:false, message:"user already exists"})
        }


        const hashedPassword = await bcryptjs.hash(password,10);
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString()

        const user = new User({
            email,
            password: hashedPassword,
            name,
            verificationToken,
            verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000
        })

        await user.save(); 

        //jwt
        generateTokenAndSetCookie(res,user._id);
        
        await sendVerificationEmail(user.email, verificationToken);
        
        res.status(201).json({
            success:true,
            message:"user created successfully",
            user:{
                ...user._doc,
                password: undefined,
            },
        });

    } catch (error) {
        res.status(400).json({success:false, message:error.message})
    }

};

export const verifyEmail = async (req,res) => {

    const {code} = req.body;
    try {
        const user = await User.findOne( {
            verificationToken: code,
            verificationTokenExpiresAt: { $gt: Date.now() }
        })

        if(!user) {
            return res.status(400).json({success: false, message: "invalid or expired verification code"})
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiresAt = undefined;
        await user.save();

        await sendWelcomeEmail(user.email, user.name);

        res.status(200).json({
            success: true,
            message: "email verified successfully",
            user: {
                ...user._doc,
                password: undefined,
            },
        });

    } catch (error) {
        console.log("error in verifyEmail", error);
        res.status(500).json({success:false,message: "server error"});
    }
};

export const login = async (req,res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if(!user) {
            return res.status(400).json({ success: false, message: "invalid credentials"});
        }
        const isPasswordValid = await bcryptjs.compare(password, user.password);
        if(!isPasswordValid){
            return res.status(400).json({success: false, message: "invalid credentials"});
        }

        generateTokenAndSetCookie(res, user._id);

        user.lastLogin = new Date();
        await user.save();

        res.status(200).json({
            success: true,
            message: "logged in successfully",
            user: {
                ...user._doc,
                password: undefined,
            },
        });
    } catch (error) {
        console.log("error in login", error);
        res.status(400).json({success: false, message: error.message});
    }
};

export const logout = async (req,res) => {
    res.clearCookie("token");
    res.status(200).json({success: true, message: "logged out successfully"});
};

export const forgotPassword = async (req,res) => {
    const { email } = req.body; 
try {
    const user = await User.findOne({ email });

    if(!user){ 
        return res.status(400).json({success: false, message: "User not found"});
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000;

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiresAt = resetTokenExpiresAt;

    await user.save();

    await sendPasswordResetEmail (user.email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`);
    // console.log(`Password reset link:          ${process.env.CLIENT_URL}/reset-password/${resetToken}`);

    res.status(200).json({ success:true, message: "password reset link sent to your email"});
    console.log(`Password reset link:          ${process.env.CLIENT_URL}/reset-password/${resetToken}`);
}


 catch (error) {
    console.log("error in forgot Password", error);
    res.status(400).json({success: false, message: error.message});
}
}

export const resetPassword = async (req,res) => {
    try {
        const {token} = req.params;
        const {password} = req.body;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpiresAt: {$gt: Date.now() },
        });

        if(!user){
            return res.status(400).json({success: false, message: "invalid or expired reset token"});
        }

        const hashedPassword = await bcryptjs.hash(password, 10);

        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiresAt = undefined;
        await user.save();

        await sendResetSuccessEmail(user.email);

        res.status(200).json({ success:true, message: "password reset successfully"});
    } catch (error) {
        console.log("error in reset Password", error);
        res.status(400).json({success: false, message: error.message});
    }
}

export const checkAuth = async (req,res) => {
    try {
        const user = await User.findById(req.userId).select("-password");
        if(!user){
            return res.status(400).json({ success: false, message: "User not found"});
        }

        res.status(200).json({ success:true, user});
    } catch (error) {
        console.log("error in checkAuth", error);
        res.status(400).json({success: false, message: error.message});
    }
}