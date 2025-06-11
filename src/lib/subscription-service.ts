import { db } from "./firebase/config";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { Subscription, SubscriptionPlan } from "../types/subscription";

// Default subscription plans without Stripe price IDs
const DEFAULT_PLANS: Omit<SubscriptionPlan, "stripePriceId">[] = [
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
    isActive: true,
  },
];

interface UserData {
  isAdmin?: boolean;
  isAgent?: boolean;
  email?: string;
  stripeCustomerId?: string;
  [key: string]: any;
}

export const subscriptionService = {
  async initializeSubscriptionPlans() {
    try {
      const plansRef = collection(db, "subscriptionPlans");

      // Check if plans already exist
      const existingPlans = await getDocs(plansRef);

      if (existingPlans.empty) {
        // Validate Stripe price IDs
        const basicPriceId = process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID;
        const premiumPriceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID;

        if (!basicPriceId || !premiumPriceId) {
          throw new Error(
            "Stripe price IDs are not configured. Please check your environment variables."
          );
        }

        // Add default plans with Stripe price IDs
        const plansWithPriceIds = DEFAULT_PLANS.map((plan, index) => ({
          ...plan,
          stripePriceId: index === 0 ? basicPriceId : premiumPriceId,
        }));

        for (const plan of plansWithPriceIds) {
          await setDoc(doc(plansRef, plan.id), plan);
        }
        console.log("Subscription plans initialized");
      }
    } catch (error) {
      console.error("Error initializing subscription plans:", error);
      throw error;
    }
  },

  async createSubscription(
    userId: string,
    priceId: string,
    email: string
  ): Promise<{ sessionId: string; customerId: string }> {
    try {
      // Call our API route to create the subscription
      const response = await fetch('/api/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createSubscription',
          data: { userId, priceId, email },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create subscription');
      }

      const data = await response.json();
      
      if (!data.sessionId) {
        throw new Error('Invalid response from server');
      }

      return {
        sessionId: data.sessionId,
        customerId: data.customerId,
      };
    } catch (error) {
      console.error("Error creating subscription:", error);
      throw error;
    }
  },

  async getSubscription(userId: string): Promise<Subscription | null> {
    try {
      console.log('Getting subscription for user:', userId);
      const subscriptionsRef = collection(db, "subscriptions");
      const q = query(subscriptionsRef, where("userId", "==", userId));
      const querySnapshot = await getDocs(q);

      console.log('Subscription query results:', {
        empty: querySnapshot.empty,
        size: querySnapshot.size,
        docs: querySnapshot.docs.map(doc => ({
          id: doc.id,
          data: doc.data()
        }))
      });

      if (querySnapshot.empty) {
        console.log('No subscription found for user');
        return null;
      }

      const subscriptionDoc = querySnapshot.docs[0];
      const subscriptionData = subscriptionDoc.data() as Subscription;
      
      console.log('Found subscription:', {
        id: subscriptionDoc.id,
        status: subscriptionData.status,
        userId: subscriptionData.userId,
        currentPeriodEnd: subscriptionData.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd
      });
      
      return subscriptionData;
    } catch (error) {
      console.error("Error getting subscription:", error);
      throw error;
    }
  },

  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      // Initialize plans if they don't exist
      await this.initializeSubscriptionPlans();

      const plansRef = collection(db, "subscriptionPlans");
      const querySnapshot = await getDocs(plansRef);
      return querySnapshot.docs.map((doc) => doc.data() as SubscriptionPlan);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      return [];
    }
  },

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      const response = await fetch('/api/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cancelSubscription',
          data: { subscriptionId },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      await updateDoc(doc(db, "subscriptions", subscriptionId), {
        cancelAtPeriodEnd: true,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      throw error;
    }
  },

  async checkSubscriptionStatus(userId: string): Promise<boolean> {
    try {
      console.log('=== Subscription Status Check ===');
      console.log('User ID:', userId);
      
      // First check if user exists
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        console.log('❌ User document does not exist');
        return false;
      }
      
      // Then check subscription
      const subscription = await this.getSubscription(userId);
      console.log('=== Subscription Details ===');
      console.log('User ID:', userId);
      console.log('Stripe Customer ID:', subscription?.stripeCustomerId);
      console.log('Stripe Subscription ID:', subscription?.stripeSubscriptionId);
      console.log('Raw subscription data:', JSON.stringify(subscription, null, 2));
      
      if (!subscription) {
        console.log('❌ No subscription found for user');
        return false;
      }

      console.log('=== Subscription Validation ===');
      console.log('Status:', subscription.status);
      console.log('Cancel at Period End:', subscription.cancelAtPeriodEnd);
      console.log('Current Period Start:', subscription.currentPeriodStart);
      console.log('Current Period End:', subscription.currentPeriodEnd);
      console.log('Plan ID:', subscription.planId);
      
      // Check if subscription is active and not expired
      if (subscription.status === "active") {
        // Check if subscription has expired
        if (subscription.currentPeriodEnd) {
          try {
            // Handle case where currentPeriodEnd is an object
            const endDateValue = typeof subscription.currentPeriodEnd === 'object' 
              ? (subscription.currentPeriodEnd instanceof Timestamp 
                  ? subscription.currentPeriodEnd.toDate() 
                  : new Date())
              : subscription.currentPeriodEnd;
            
            const endDate = new Date(endDateValue);
            
            // Validate the date
            if (isNaN(endDate.getTime())) {
              console.error('Invalid end date:', {
                original: subscription.currentPeriodEnd,
                parsed: endDateValue,
                type: typeof subscription.currentPeriodEnd
              });
              return false;
            }
            
            const now = new Date();
            const isExpired = endDate < now;
            
            console.log('Subscription period check:', {
              endDate: endDate.toISOString(),
              now: now.toISOString(),
              isExpired,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
            });
            
            // If subscription is not expired, it's valid (even if cancelAtPeriodEnd is true)
            const isValid = !isExpired;
            console.log('Final subscription validation:', {
              isExpired,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
              isValid
            });
            
            return isValid;
          } catch (error) {
            console.error('Error processing subscription date:', error);
            return false;
          }
        }
        return true;
      }
      
      console.log('❌ Subscription is not active:', subscription.status);
      return false;
    } catch (error) {
      console.error("Error checking subscription status:", error);
      return false;
    }
  },
};

// Export a function to manually initialize plans
export const initializePlans = async () => {
  try {
    await subscriptionService.initializeSubscriptionPlans();
    console.log("Subscription plans initialized successfully");
  } catch (error) {
    console.error("Error initializing subscription plans:", error);
    throw error;
  }
};
