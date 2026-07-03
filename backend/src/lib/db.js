import mongoose from "mongoose"
import { ENV } from "./env.js";

export const connectDB = async () =>{
    try {
        const {MONGO_URL} = ENV;
        if(!MONGO_URL) throw new Error("MONGO_URL is not set");

        const conn = await mongoose.connect(ENV.MONGO_URL);
        console.log("MONGODB CONNECTED:",conn.connection.host);
    } catch (error) {
        console.error("Eroor connection to MONGODB:",error)
        process.exit(1);//status 1 means code fail , 0 means success

    }
}