import mongoose from "mongoose";
import dotenv from "dotenv";
import { ensureMongoDns } from "../utils/mongoDns.js";

dotenv.config();

const connectDB = async () => {
    try {
        await ensureMongoDns();
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
        console.error("Error connecting MongoDB:", error.message);
        process.exit(1);
    }
};

export default connectDB;
