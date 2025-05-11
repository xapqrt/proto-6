// src/lib/mongodb.ts
import mongoose from 'mongoose';
import { DATABASE_CONFIG } from './config';

const { MONGODB_URL, DATABASE_NAME } = DATABASE_CONFIG;

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
      console.log("Successfully connected to MongoDB via Mongoose!");
      try {
        // Optional: Ping after connection to confirm
        // Add null check for connection.db before accessing
        if (mongooseInstance.connection && mongooseInstance.connection.db) {
          await mongooseInstance.connection.db.admin().command({ ping: 1 });
          console.log("MongoDB admin ping successful.");
        } else {
          console.warn("MongoDB connection established but db instance not available for ping.");
        }
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

