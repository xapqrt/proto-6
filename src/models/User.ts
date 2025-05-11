// src/models/User.ts
import mongoose, { Schema, Document, models, Model } from 'mongoose';

// Define an interface representing a document in MongoDB.
export interface IUser extends Document {
  email: string;
  hashedPassword?: string; // Optional because it might not be present on client-side user objects
  createdAt: Date;
  updatedAt: Date;
  // Add any other user fields you might need
  // For example:
  // name?: string;
  // profilePictureUrl?: string;
}

// Define the schema corresponding to the document interface.
const UserSchema: Schema<IUser> = new Schema(
  {
    email: {
      type: String,
      required: [true, 'Please provide an email for this user.'],
      unique: true, // Ensure emails are unique
      lowercase: true, // Store emails in lowercase
      trim: true, // Remove whitespace from both ends of an email
      match: [/.+\@.+\..+/, 'Please fill a valid email address'], // Basic email validation
    },
    hashedPassword: {
      type: String,
      required: [true, 'Please provide a password for this user.'],
      select: false, // By default, do not return hashedPassword in queries
    },
    // You can add other fields here like name, profilePictureUrl, etc.
    // name: {
    //   type: String,
    //   required: false,
    //   trim: true,
    // },
  },
  {
    // Mongoose automatically adds createdAt and updatedAt fields
    timestamps: true,
  }
);

// Prevent model overwrite in Next.js HMR
const User: Model<IUser> = models.User || mongoose.model<IUser>('User', UserSchema);

export default User;

