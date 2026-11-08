import mongoose from "mongoose";
import { ENV } from "./env.js";

mongoose.set("strictQuery", true);

export const connectDB = async () => {
  if (!ENV.MONGO_URI) throw new Error("MONGO_URI is not set");

  mongoose.connection.on("disconnected", () => console.warn("MongoDB disconnected"));
  mongoose.connection.on("reconnected", () => console.log("MongoDB reconnected"));
  mongoose.connection.on("error", (err) => console.error("MongoDB error:", err.message));

  const conn = await mongoose.connect(ENV.MONGO_URI, {
    serverSelectionTimeoutMS: 10_000,
    maxPoolSize: 20,
  });
  console.log("MongoDB connected:", conn.connection.host);
  return conn;
};

export const disconnectDB = () => mongoose.disconnect();
