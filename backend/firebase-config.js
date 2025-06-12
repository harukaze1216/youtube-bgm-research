import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin SDK
let app;

try {
  // For development/testing, initialize with minimal config
  // In production, you would use proper service account credentials
  if (!admin.apps.length) {
    app = admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'summery-23833',
    });
  } else {
    app = admin.app();
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
  // Fallback initialization for development
  if (!admin.apps.length) {
    app = admin.initializeApp({
      projectId: 'summery-23833',
    });
  }
}

// Get Firestore instance
export const db = admin.firestore();

// Collections
export const COLLECTIONS = {
  BGM_CHANNELS: 'bgm_channels'
};

export default app;