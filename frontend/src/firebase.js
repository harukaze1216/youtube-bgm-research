import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDiPG7ecBiVdu2G0SyLaHnzF31K8NRNtyA",
  authDomain: "summery-23833.firebaseapp.com",
  projectId: "summery-23833",
  storageBucket: "summery-23833.firebasestorage.app",
  messagingSenderId: "816198973728",
  appId: "1:816198973728:web:176ca98e3e5de114667f45",
  measurementId: "G-TJ39GVQV67"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Authentication
export const auth = getAuth(app);

export default app;