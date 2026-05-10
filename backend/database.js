// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDP18fvle5Ls1mPPd6OVHII7Ay2_thaHbQ",
  authDomain: "tcasx-48020.firebaseapp.com",
  projectId: "tcasx-48020",
  storageBucket: "tcasx-48020.firebasestorage.app",
  messagingSenderId: "782302455229",
  appId: "1:782302455229:web:5655f95a226e0015e59ed4",
  measurementId: "G-JXR0PHP08E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { db };
