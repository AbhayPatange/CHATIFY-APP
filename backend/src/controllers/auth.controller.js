import User from "../models/User.js";
import bcrypt from "bcryptjs"
import { generateToken } from "../lib/utils.js";
import { sendWelcomeEmail } from "../emails/emailHandlers.js";
import "dotenv/config"
import { ENV } from "../lib/env.js";


export const signup = async (req,res)=>{
    const {fullName,email,password} = req.body;

    try {
        if(!fullName || !email || !password){
            return res.status(400).json({message:"All fields are required"});
        }

        if(password.length < 6){
            return res.status(400).json({message:"passwords mush be atleast 6 characters"});
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(email)){
            return res.status(400).json({message:"Invaild email format"});
        }

        const user = await User.findOne({email});
        if(user) return res.status(400).json({message:"Email already exists"});

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password,salt);

        const newUser = new User({
            fullName,
            email,
            password:hashedPassword,
        })

        if(newUser){
            // generateToken(newUser._id,res)
            // await newUser.save();


            //save the user first and then issue the auth cookie
            const savedUser = await newUser.save();
            generateToken(savedUser._id,res);

            res.status(201).json({
                _id:newUser._id,
                fullName:newUser.fullName,
                email:newUser.email,
                profilePic: newUser.profilePic,
            });
            try{
                await sendWelcomeEmail(savedUser.email,savedUser.fullName,ENV.CLIENT_URL);

            }catch(error){
                console.error("Failed to send welcome email:",error)
            }
        }
        else{
            res.status(400).json({message:"Invalid user data"})
        }
        
        
    } catch (error) {
        console.log("Error is signup controller",error);
        res.status(500).json({message:"Internal server error"});
    }
}