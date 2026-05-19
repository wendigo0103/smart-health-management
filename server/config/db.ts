import mongoose from "mongoose";
import { getMongoUri } from "./env";

let connecting: Promise<typeof mongoose> | null = null;

export async function connectDb(): Promise<typeof mongoose> {
  const uri = getMongoUri();
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }
  if (!connecting) {
    connecting = mongoose.connect(uri);
  }
  return connecting;
}
