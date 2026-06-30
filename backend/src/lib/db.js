import mongoose from "mongoose"

export const connectDB = async () =>{
    try {
        const conn = await mongoose.connect(process.env.MONGO_URL);
        console.log("MONGODB CONNECTED:",conn.connection.host);
    } catch (error) {
        console.error("Eroor connection to MONGODB:",error)
        process.exit(1);//status 1 means code fail , 0 means success

    }
}