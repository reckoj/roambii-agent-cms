"use client";

import React, { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { subscriptionService } from "../lib/subscription-service";
import { SubscriptionPlan } from "../types/subscription";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { ArrowRight, Check, AlertTriangle, LogOut } from "lucide-react";
import { logoutUserAsync } from "@/lib/redux/slices/authSlice";
import { useRouter } from "next/navigation";

// Create a default plan if none is found
// const createDefaultPlan = (): SubscriptionPlan => ({
//   id: "standard",
//   name: "Standard Plan",
//   description: "Complete access to our travel agent platform",
//   price: 19.99,
//   interval: "month",
//   features: [
//     "Create and manage itineraries",
//     "Connect with clients",
//     "Booking management tools",
//     "Customer support",
//     "Real-time notifications",
//     "Access to all features",
//   ],
//   stripePriceId: "price_id_placeholder",
//   isActive: true,
// });

// Initialize Stripe only on the client side - with better error handling
// Use the PUBLISHABLE key (not the secret key) - it's safe to expose in client code
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// For testing only - remove in production
const testKey = "pk_test_YourStripeTestKeyHere";
const effectiveKey = STRIPE_PUBLISHABLE_KEY;

let stripePromise: Promise<any> | null = null;

// Only try to load Stripe if we have a key and we're on the client
if (typeof window !== "undefined" && effectiveKey) {
  try {
    stripePromise = loadStripe(effectiveKey);
    console.log("Stripe initialized with publishable key");
  } catch (error) {
    console.error("Failed to initialize Stripe:", error);
    stripePromise = null;
  }
} else {
  console.warn("Stripe publishable key is missing:", {
    hasKey: !!effectiveKey,
    isClient: typeof window !== "undefined",
  });
}

export const SubscriptionPage: React.FC = () => {
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<boolean>(
    stripePromise === null
  );
  const agent = useAppSelector((state) => state.auth.agent);
  const dispatch = useAppDispatch();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await dispatch(logoutUserAsync());
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        setError(null);

        let premiumPlan;

        try {
          const subscriptionPlans =
            await subscriptionService.getSubscriptionPlans();
          console.log("Fetched plans:", subscriptionPlans); // Debug log

          // Get the premium plan
          premiumPlan =
            subscriptionPlans.find((p) => p.id === "premium") ||
            subscriptionPlans[0];
        } catch (error) {
          console.error(
            "Error fetching subscription plans, using default:",
            error
          );
          // If there's an error fetching plans, use the default
          // premiumPlan = createDefaultPlan();
        }

        if (premiumPlan) {
          // Make sure the price is always 19.99

          // Ensure the interval is properly typed
          const planWithCorrectTypes: SubscriptionPlan = {
            ...premiumPlan,
            interval: premiumPlan.interval as "month" | "year",
          };
          setPlan(planWithCorrectTypes);
        } else {
          // Use default plan as fallback
          // setPlan(createDefaultPlan());
        }
      } catch (error) {
        console.error("Error in subscription process:", error);
        setError("Failed to load subscription plan. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handleSubscribe = async () => {
    try {
      if (!stripePromise) {
        setStripeError(true);
        setError(
          "Stripe payment system is not available. Please contact support."
        );
        return;
      }

      if (!agent || !agent.id || !agent.email) {
        throw new Error("You must be logged in to subscribe");
      }

      if (!plan) {
        throw new Error("No subscription plan available");
      }

      // Store user ID in localStorage for post-redirect recovery
      localStorage.setItem("lastUserId", agent.id);

      // Check if the price ID is valid or is our placeholder
      if (
        !plan.stripePriceId ||
        plan.stripePriceId === "price_id_placeholder"
      ) {
        setError(
          "Subscription system is currently unavailable. Please try again later or contact support."
        );
        return;
      }

      // Try to load Stripe
      let stripe;
      try {
        stripe = await stripePromise;
        if (!stripe) throw new Error("Stripe failed to load");
      } catch (err) {
        console.error("Error loading Stripe:", err);
        setStripeError(true);
        setError(
          "Cannot connect to payment processor. Please try again later."
        );
        return;
      }

      // Create subscription checkout session
      const response = await subscriptionService.createSubscription(
        agent.id,
        plan.stripePriceId,
        agent.email
      );

      if (!response.sessionId) {
        throw new Error("Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      const { error: redirectError } = await stripe.redirectToCheckout({
        sessionId: response.sessionId,
      });

      if (redirectError) {
        console.error("Error redirecting to checkout:", redirectError);
        setError("Failed to redirect to checkout. Please try again.");
      }
    } catch (error) {
      console.error("Error creating subscription:", error);
      setError("Failed to create subscription. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscription plan...</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No subscription plan available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900">
            Join Roambii
          </h1>
          <button
            onClick={handleLogout}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </button>
        </div>

        {stripeError && (
          <div className="mb-8 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Payment System Notice
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Our payment system is temporarily undergoing maintenance.
                    You can view plan details, but subscriptions are currently
                    unavailable.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-8 bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mb-12">
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Access all features and take your travel agency to the next level
            with our comprehensive platform.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-8 bg-teal-700 sm:p-10 sm:pb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl leading-8 font-extrabold text-white">
                {plan.name}
              </h3>
              <div className="ml-4 bg-teal-100 text-teal-800 text-sm font-semibold px-3 py-1 rounded-full">
                Most Popular
              </div>
            </div>
            <div className="mt-4 flex items-baseline text-white">
              <span className="text-5xl font-extrabold tracking-tight">
                ${plan.price}
              </span>
              <span className="ml-1 text-xl font-semibold">
                /{plan.interval}
              </span>
            </div>
            <p className="mt-5 text-lg text-teal-100">{plan.description}</p>
          </div>
          <div className="px-6 pt-6 pb-8 bg-white sm:p-10">
            <ul className="space-y-4">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <div className="flex-shrink-0">
                    <Check className="h-6 w-6 text-teal-500" />
                  </div>
                  <p className="ml-3 text-base text-gray-700">{feature}</p>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <button
                onClick={handleSubscribe}
                disabled={stripeError}
                className={`w-full flex items-center justify-center px-6 py-4 text-lg font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                  stripeError
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 transform transition hover:scale-105"
                }`}
              >
                {stripeError ? "Temporarily Unavailable" : "Subscribe Now"}
                {!stripeError && <ArrowRight className="ml-2 h-5 w-5" />}
              </button>
            </div>
            <p className="text-center mt-4 text-sm text-gray-500">
              Cancel anytime. No long-term contracts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
