import { db } from "../lib/firebase/config";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";

// Get Stripe price IDs from environment variables
const BASIC_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID;
const PREMIUM_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID;

// Check if we have valid price IDs
if (!BASIC_PRICE_ID || !PREMIUM_PRICE_ID) {
  console.error("Error: Missing Stripe price IDs in environment variables.");
  console.error(
    "Please make sure NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID and NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID are set in your .env file."
  );
  process.exit(1);
}

// Subscription plans with real Stripe price IDs
const PLANS = [
  {
    id: "basic",
    name: "Basic Plan",
    description: "Perfect for individual travel agents",
    price: 19.99,
    interval: "month",
    features: [
      "Up to 50 itineraries",
      "Basic customer support",
      "Standard booking management",
      "Email notifications",
    ],
    stripePriceId: BASIC_PRICE_ID,
    isActive: true,
  },
  {
    id: "premium",
    name: "Premium Plan",
    description: "Ideal for growing travel agencies",
    price: 99.99,
    interval: "month",
    features: [
      "Unlimited itineraries",
      "Priority customer support",
      "Advanced booking management",
      "Real-time notifications",
      "Custom branding",
      "Analytics dashboard",
    ],
    stripePriceId: PREMIUM_PRICE_ID,
    isActive: true,
  },
];

async function initializeSubscriptionPlans() {
  try {
    console.log(
      "Initializing subscription plans with real Stripe price IDs..."
    );
    console.log(`Using Basic Price ID: ${BASIC_PRICE_ID}`);
    console.log(`Using Premium Price ID: ${PREMIUM_PRICE_ID}`);

    const plansRef = collection(db, "subscriptionPlans");
    const existingPlans = await getDocs(plansRef);

    if (existingPlans.empty) {
      console.log("No plans found, creating plans with Stripe price IDs...");

      for (const plan of PLANS) {
        await setDoc(doc(plansRef, plan.id), plan);
        console.log(
          `Created plan: ${plan.name} with Stripe price ID: ${plan.stripePriceId}`
        );
      }

      console.log("Subscription plans initialized successfully!");
    } else {
      console.log(
        "Plans already exist, updating them with current Stripe price IDs..."
      );

      // Update existing plans with current price IDs
      for (const plan of PLANS) {
        await setDoc(doc(plansRef, plan.id), plan, { merge: true });
        console.log(
          `Updated plan: ${plan.name} with Stripe price ID: ${plan.stripePriceId}`
        );
      }

      console.log("Subscription plans updated successfully!");
    }
  } catch (error) {
    console.error("Error initializing subscription plans:", error);
  }
}

// Call the function
initializeSubscriptionPlans();
