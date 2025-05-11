// src/lib/mongodb.ts
import mongoose from 'mongoose';

const MONGODB_URL = process.env.MONGODB_URL || "mongodb+srv://fowlstar1:DtcGkysHjBM7bsZY@study.mcq95hq.mongodb.net/?retryWrites=true&w=majority&appName=study";
const DATABASE_NAME = process.env.DATABASE_NAME || 'lifeos_db'; // You can still specify a DB name, Mongoose will use it.

if (!MONGODB_URL) {
  throw new Error('Please define the MONGODB_URL environment variable inside .env or ensure it is hardcoded correctly.');
}

// Connection options for Mongoose, incorporating the serverApi settings
const clientOptions: mongoose.ConnectOptions = {
  serverApi: { version: '1', strict: true, deprecationErrors: true },
  dbName: DATABASE_NAME, // Specify the database name here
};

// Global variable to cache the Mongoose connection
// In development, Next.js clears Node.js cache on every edit, so we need to cache the connection on the global object.
// In production, this isn't necessary as the module is loaded once.
declare global {
  // eslint-disable-next-line no-var
  var mongooseConnection: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}

let cached = global.mongooseConnection;

if (!cached) {
  cached = global.mongooseConnection = { conn: null, promise: null };
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    console.log('Using cached Mongoose connection.');
    return cached.conn;
  }

  if (!cached.promise) {
    console.log('Creating new Mongoose connection...');
    cached.promise = mongoose.connect(MONGODB_URL, clientOptions).then(async (mongooseInstance) => {
      console.log("Pinged your deployment. You successfully connected to MongoDB via Mongoose!");
      try {
        // Optional: Ping after connection to confirm
        await mongooseInstance.connection.db.admin().command({ ping: 1 });
        console.log("MongoDB admin ping successful.");
      } catch(pingError) {
        console.error("MongoDB admin ping failed after connection:", pingError);
        // Depending on severity, you might want to throw or handle this
      }
      return mongooseInstance;
    }).catch(err => {
        console.error('Mongoose connection error:', err);
        cached.promise = null; // Reset promise on error so next attempt tries again
        throw err; // Re-throw error to be caught by caller
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null; // Ensure promise is cleared on error to allow retries
    throw e;
  }
  
  return cached.conn;
}

// Optional: A function to get the db instance directly if already connected (Mongoose connection object)
export function getMongooseConnection(): typeof mongoose {
  if (!cached.conn) {
    throw new Error('Database not connected. Call connectToDatabase first.');
  }
  return cached.conn;
}

