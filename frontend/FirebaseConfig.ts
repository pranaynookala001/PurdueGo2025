// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCBnI-Y7VdZFuQgG1tKHhL6U-6BfXcgpgs",
  authDomain: "fir-video-66ca1.firebaseapp.com",
  projectId: "fir-video-66ca1",
  storageBucket: "fir-video-66ca1.firebasestorage.app",
  messagingSenderId: "86397553435",
  appId: "1:86397553435:web:2d03368fd32a624add21be"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

export { app, auth, db };
