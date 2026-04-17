import mongoose from "mongoose";

let dbStatus = "not_configured";

export async function connectDb() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    dbStatus = "not_configured";
    console.log("MONGODB_URI is empty. Using in-memory history for this session.");
    return false;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });

    dbStatus = "connected";
    console.log("Connected to MongoDB");
    return true;
  } catch (error) {
    dbStatus = "unavailable";
    console.warn("MongoDB connection failed. Falling back to in-memory history.");
    console.warn(error.message);
    return false;
  }
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

export function getDbStatus() {
  if (isDbConnected()) {
    return "connected";
  }

  return dbStatus;
}
