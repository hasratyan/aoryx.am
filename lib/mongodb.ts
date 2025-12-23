import { MongoClient } from "mongodb";
import dns from "node:dns";

// Force IPv4 to avoid connectivity issues (like 403 Forbidden on Google or MongoDB connection timeouts)
if (typeof window === "undefined") {
  dns.setDefaultResultOrder("ipv4first");
}

type GlobalWithMongo = typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

const uri = typeof process.env.MONGODB_URI === "string" ? process.env.MONGODB_URI.trim() : "";

const globalWithMongo = global as GlobalWithMongo;

let clientPromise: Promise<MongoClient> | null = null;

if (uri.length > 0) {
  try {
    const client = new MongoClient(uri);
    clientPromise = globalWithMongo._mongoClientPromise ?? client.connect();
    globalWithMongo._mongoClientPromise = clientPromise;
    
    // Quick connection check
    clientPromise.catch(err => {
      console.error("[MongoDB] Connection error:", err.message);
    });
  } catch (error) {
    console.error("[MongoDB] Initialization error (Invalid URI?):", error);
    clientPromise = null;
  }
} else {
  if (process.env.NODE_ENV === "production") {
    console.error("[MongoDB][error] MONGODB_URI is not set in environment.");
  }
}

export default clientPromise;
