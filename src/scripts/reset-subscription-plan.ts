import { db } from "@/lib/firebase/config";
import { collection, getDocs, deleteDoc, doc, setDoc } from "firebase/firestore";

const PREMIUM_PLAN = {
  id: "premium",
  name: "Premium Plan",
  description: "Access to the full Roambii travel agent dashboard",
  price: 19.99,
  interval: "month",
  features: [
    "Unlimited itineraries",
    "Unlimited bookings",
    "Customer management",
    "Real-time notifications",
    "Analytics dashboard",
    "Priority support",
  ],
  isActive: true,
};

async function resetSubscriptionPlan() {
  try {
    console.log("Starting subscription plan reset...");
    
    const plansRef = collection(db, "subscriptionPlans");
    
    // Get existing plans
    const existingPlans = await getDocs(plansRef);
    console.log(`Found ${existingPlans.size} existing plans`);
    
    // Delete existing plans
    for (const planDoc of existingPlans.docs) {
      await deleteDoc(planDoc.ref);
      console.log(`Deleted plan: ${planDoc.id}`);
    }
    
    // Validate environment variable
    const premiumPriceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID;
    
    if (!premiumPriceId) {
      throw new Error(
        "Missing Stripe price ID. Please set NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID in your environment variables."
      );
    }
    
    console.log("Using price ID:", premiumPriceId);
    
    // Create new plan with proper price ID
    const planWithPriceId = {
      ...PREMIUM_PLAN,
      stripePriceId: premiumPriceId,
    };
    
    // Save new plan
    await setDoc(doc(plansRef, planWithPriceId.id), planWithPriceId);
    console.log(`Created plan: ${planWithPriceId.id} with price ID: ${planWithPriceId.stripePriceId}`);
    
    console.log("✅ Subscription plan reset successfully!");
    
  } catch (error) {
    console.error("❌ Error resetting subscription plan:", error);
    throw error;
  }
}

// Run the script
resetSubscriptionPlan()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  }); 