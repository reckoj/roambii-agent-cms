import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: join(process.cwd(), '.env.local') });

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log("Loading environment variables...");
console.log("Stripe Price ID:", process.env.NEXT_PUBLIC_STRIPE_PRICE_ID);
console.log("Firebase Project ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get Stripe price ID from environment variables
const PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;

// Check if we have valid price ID
if (!PRICE_ID) {
  console.error("Error: Missing Stripe price ID in environment variables.");
  console.error("Please make sure NEXT_PUBLIC_STRIPE_PRICE_ID is set in your .env.local file.");
  process.exit(1);
}

// Validate that the price ID starts with 'price_'
if (!PRICE_ID.startsWith('price_')) {
  console.error("Error: Invalid Stripe price ID format.");
  console.error("The price ID should start with 'price_'. You might be using a product ID instead.");
  process.exit(1);
}

// Single subscription plan with real Stripe price ID
const PLAN = {
  id: "standard",
  name: "Standard Plan",
  description: "Complete access to our travel agent platform",
  price: 19.99,
  interval: "month",
  features: [
    "Create and manage itineraries",
    "Connect with clients",
    "Booking management tools",
    "Customer support",
    "Real-time notifications",
    "Access to all features"
  ],
  stripePriceId: PRICE_ID,
  isActive: true
};

async function initializeSubscriptionPlans() {
  try {
    console.log("Initializing subscription plan with real Stripe price ID...");
    console.log(`Using Price ID: ${PRICE_ID}`);
    
    const plansRef = collection(db, "subscriptionPlans");
    
    // Create or update the standard plan
    await setDoc(doc(plansRef, PLAN.id), PLAN, { merge: true });
    console.log(`Updated plan: ${PLAN.name} with Stripe price ID: ${PLAN.stripePriceId}`);
    
    console.log("Subscription plan updated successfully!");
    
  } catch (error) {
    console.error("Error initializing subscription plan:", error);
    throw error; // Re-throw to trigger the catch block in the main function
  }
}

// Call the function
initializeSubscriptionPlans()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
