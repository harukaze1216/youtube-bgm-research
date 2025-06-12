import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDN1sTee52txGVYpQwSWgAD7FUr4NNJinQ",
  authDomain: "summery-23833.firebaseapp.com",
  projectId: "summery-23833",
  storageBucket: "summery-23833.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefghijklmnop"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

export default app;