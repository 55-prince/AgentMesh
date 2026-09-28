// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ,
  authDomain: "agentmesh-6c6ea.firebaseapp.com",
  projectId: "agentmesh-6c6ea",
  storageBucket: "agentmesh-6c6ea.firebasestorage.app",
  messagingSenderId: "269524065713",
  appId: "1:269524065713:web:b680698b86ee21414b3190",
  measurementId: "G-QSGGXJEJL5"
};

// Initialize Firebase
 const app = initializeApp(firebaseConfig);
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
const analytics = getAnalytics(app);