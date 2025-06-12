import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin SDK
let app;

try {
  if (!admin.apps.length) {
    let config = {
      projectId: process.env.FIREBASE_PROJECT_ID || 'summery-23833',
    };

    // Use service account key if available (production/GitHub Actions)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const serviceAccountKey = JSON.parse(
          Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString()
        );
        config.credential = admin.credential.cert(serviceAccountKey);
        console.log('Firebase initialized with service account credentials');
      } catch (parseError) {
        console.error('Error parsing service account key:', parseError);
      }
    } else {
      console.log('Firebase initialized with default credentials (development mode)');
    }

    app = admin.initializeApp(config);
  } else {
    app = admin.app();
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
  throw error;
}

// Get Firestore instance
export const db = admin.firestore();

// Collections
export const COLLECTIONS = {
  BGM_CHANNELS: 'bgm_channels'
};

export default app;