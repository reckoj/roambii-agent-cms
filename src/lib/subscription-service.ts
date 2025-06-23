import { db } from "@/lib/firebase/config";
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

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: string;
  features: string[];
  isActive: boolean;
  stripePriceId: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: "active" | "canceled" | "past_due" | "unpaid";
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

// Single premium subscription plan
const DEFAULT_PLANS: Omit<SubscriptionPlan, "stripePriceId">[] = [
  {
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
        // Validate Stripe price ID
        const premiumPriceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID;

        if (!premiumPriceId) {
          throw new Error(
            "Stripe price ID is not configured. Please set NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID in your environment variables."
          );
        }

        // Add premium plan with Stripe price ID
        const planWithPriceId = {
          ...DEFAULT_PLANS[0],
          stripePriceId: premiumPriceId,
        };

        await setDoc(doc(plansRef, planWithPriceId.id), planWithPriceId);
        console.log("Subscription plan initialized");
      }
    } catch (error) {
      console.error("Error initializing subscription plan:", error);
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
      // Initialize plan if it doesn't exist
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
              ? (subscription.currentPeriodEnd && 'toDate' in subscription.currentPeriodEnd
                  ? (subscription.currentPeriodEnd as any).toDate() 
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
            if (!isExpired) {
              console.log('✅ Subscription is active and not expired');
              return true;
            } else {
              console.log('❌ Subscription has expired');
              return false;
            }
          } catch (error) {
            console.error('Error parsing subscription end date:', error);
            return false;
          }
        } else {
          console.log('✅ Subscription is active (no end date)');
          return true;
        }
      } else {
        console.log(`❌ Subscription status is not active: ${subscription.status}`);
        return false;
      }
    } catch (error) {
      console.error("Error checking subscription status:", error);
      return false;
    }
  },

  async updateUserSubscriptionStatus(userId: string, hasSubscription: boolean): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        hasActiveSubscription: hasSubscription,
        updatedAt: new Date(),
      });
      console.log(`Updated user ${userId} subscription status to: ${hasSubscription}`);
    } catch (error) {
      console.error("Error updating user subscription status:", error);
      throw error;
    }
  },
};

// Helper function to initialize plans (for scripts)
export const initializePlans = async () => {
  try {
    await subscriptionService.initializeSubscriptionPlans();
    console.log("Subscription plans initialized successfully");
  } catch (error) {
    console.error("Failed to initialize subscription plans:", error);
    throw error;
  }
};
