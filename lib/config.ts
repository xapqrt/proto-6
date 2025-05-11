/**
 * Centralized environment configuration
 * 
 * This module consolidates all environment variables used throughout the application
 * with proper typing, default values, and validation.
 */

// Database configuration
export const DATABASE_CONFIG = {
  MONGODB_URL: process.env.MONGODB_URL || "mongodb+srv://fowlstar1:DtcGkysHjBM7bsZY@study.mcq95hq.mongodb.net/?retryWrites=true&w=majority&appName=study",
  DATABASE_NAME: process.env.DATABASE_NAME || "lifeos_db",
}

// Authentication configuration
export const AUTH_CONFIG = {
  JWT_SECRET: process.env.JWT_SECRET || "lifeos_dev_fallback_secret_key_replace_in_production",
  JWT_COOKIE_NAME: "lifeos_session_token",
  JWT_EXPIRATION_DAYS: 30,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "fowlstar1@gmail.com",
}

// AI services configuration
export const AI_CONFIG = {
  GOOGLE_GENAI_API_KEY: process.env.GOOGLE_GENAI_API_KEY || "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
}

// Application configuration
export const APP_CONFIG = {
  NODE_ENV: process.env.NODE_ENV || "development",
  IS_PRODUCTION: process.env.NODE_ENV === "production",
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
}

// Log warnings for missing critical environment variables
if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET environment variable is not defined. Using fallback secret. This is insecure for production!');
}

if (!process.env.MONGODB_URL) {
  console.warn('WARNING: MONGODB_URL environment variable is not defined. Using hardcoded connection string. Update in production!');
}

// Validate critical configurations
function validateConfig() {
  const issues = [];
  
  if (AUTH_CONFIG.JWT_SECRET.includes("fallback") && APP_CONFIG.IS_PRODUCTION) {
    issues.push("Using fallback JWT_SECRET in production environment");
  }
  
  if (issues.length > 0) {
    console.error("Critical configuration issues detected:");
    issues.forEach(issue => console.error(`- ${issue}`));
    
    if (APP_CONFIG.IS_PRODUCTION) {
      throw new Error("Invalid configuration for production environment");
    }
  }
}

// Run validation in non-edge runtime environments
if (typeof window === 'undefined' && !process.env.NEXT_RUNTIME) {
  validateConfig();
}