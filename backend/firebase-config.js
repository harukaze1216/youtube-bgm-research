import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

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
        console.log('Attempting to parse service account key from environment variable...');
        const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        
        // Check if the key is base64 encoded or plain JSON
        let serviceAccountKey;
        if (rawKey.startsWith('{')) {
          // Plain JSON
          serviceAccountKey = JSON.parse(rawKey);
        } else {
          // Base64 encoded
          const decodedKey = Buffer.from(rawKey, 'base64').toString('utf8');
          serviceAccountKey = JSON.parse(decodedKey);
        }
        
        config.credential = admin.credential.cert(serviceAccountKey);
        console.log('Firebase initialized with service account credentials');
      } catch (parseError) {
        console.error('Error parsing service account key:', parseError);
        console.error('Key length:', process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.length || 0);
        console.error('Key preview:', process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.substring(0, 50) + '...');
        // フォールバックしない - エラーを投げる
        throw new Error(`Service account key parsing failed: ${parseError.message}`);
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // GitHub Actions: Use service account file
      try {
        console.log('Attempting to load service account from file...');
        // 相対パスと絶対パスの両方に対応
        const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS.startsWith('/') 
          ? process.env.GOOGLE_APPLICATION_CREDENTIALS 
          : `./${process.env.GOOGLE_APPLICATION_CREDENTIALS}`;
        
        console.log('Credentials path:', credentialsPath);
        const serviceAccount = JSON.parse(readFileSync(credentialsPath, 'utf8'));
        config.credential = admin.credential.cert(serviceAccount);
        console.log('Firebase initialized with service account file:', credentialsPath);
      } catch (fileError) {
        console.error('Error reading service account file:', fileError);
        console.error('Attempted path:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
        throw new Error(`Service account file loading failed: ${fileError.message}`);
      }
    } else {
      console.log('No Firebase credentials found - using default credentials (development mode)');
      console.log('Available environment variables:');
      console.log('- FIREBASE_SERVICE_ACCOUNT_KEY:', !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      console.log('- GOOGLE_APPLICATION_CREDENTIALS:', !!process.env.GOOGLE_APPLICATION_CREDENTIALS);
      
      // 開発環境でも認証が必要な場合はエラーを投げる
      if (process.env.NODE_ENV === 'production') {
        throw new Error('No Firebase credentials found in production environment');
      }
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
  BGM_CHANNELS: 'bgm_channels',
  TRACKED_CHANNELS: 'tracked_channels',
  TRACKING_DATA: 'tracking_data'
};

export default app;