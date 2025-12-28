import clientPromise from "@/lib/mongodb";

export async function getDb() {
  if (!clientPromise) {
    throw new Error("MongoDB connection is not configured. Set MONGODB_URI.");
  }
  const client = await clientPromise;
  const dbName = process.env.MONGODB_DB;
  return dbName ? client.db(dbName) : client.db();
}

export async function getB2bDb() {
  if (!clientPromise) {
    throw new Error("MongoDB connection is not configured. Set MONGODB_URI.");
  }
  const client = await clientPromise;
  const dbName = process.env.MONGODB_DB_B2B ?? process.env.MONGODB_DB;
  return dbName ? client.db(dbName) : client.db();
}
