import mongoose from "mongoose";

export default async () => {
  try {
    await mongoose.connect(process.env.MONGO_CONNECT_STRING);
    console.log("Database connected successfully.");
  } catch (error) {
    console.error("Error connecting to the database:", error);
    process.exit(1);
  }
};
