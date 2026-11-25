import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Colle ici TON objet copié depuis la console Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC0KA7PVxwhGLzVVC2WzckEIzeqv_cejJ8",
    authDomain: "minifootisg.firebaseapp.com",
    projectId: "minifootisg",
    storageBucket: "minifootisg.firebasestorage.app",
    messagingSenderId: "299197976445",
    appId: "1:299197976445:web:bdaca1e029d17a9b51c614",
    measurementId: "G-QMSMVM7P41"
};
const app = initializeApp(firebaseConfig);

// Auth avec mémorisation de la session
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
});

// Base de données
export const db = getFirestore(app);