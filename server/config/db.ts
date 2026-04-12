import mongoose from "mongoose";

let connecting: Promise<typeof mongoose> | null = null;

export async function connectDb(): Promise<typeof mongoose> {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not set. Copy .env.example to .env and configure MongoDB.");
  }
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }
  if (!connecting) {
    connecting = mongoose.connect(uri);
  }
  return connecting;
}
