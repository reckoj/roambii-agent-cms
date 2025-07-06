"use client";

import React, { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { subscriptionService } from "../lib/subscription-service";
import { SubscriptionPlan } from "../types/subscription";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { ArrowRight, Check, AlertTriangle, LogOut, Star, Shield, CreditCard } from "lucide-react";
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
  const [processingPayment, setProcessingPayment] = useState(false);
  const [stripeError, setStripeError] = useState<boolean>(stripePromise === null);
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
      setProcessingPayment(true);
      setError(null);

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
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 to-teal-700">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Loading subscription plan...</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 to-teal-700">
        <div className="text-center">
          <p className="text-white">No subscription plan available.</p>
          <button
            onClick={handleLogout}
            className="mt-4 inline-flex items-center px-4 py-2 border border-white rounded-md shadow-sm text-sm font-medium text-white hover:bg-white hover:text-teal-700"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Teal Background with Plan Details */}
      <div className="w-1/2 bg-gradient-to-br from-teal-500 to-teal-700 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center p-8">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-teal-400/20 via-teal-600/20 to-teal-800/20"></div>
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-300/10 rounded-full blur-3xl"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-lg text-center">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-4">
                Subscribe to Roambii Pro
              </h1>
              <p className="text-teal-100 text-lg leading-relaxed">
                Unlock the full potential of your travel agency with our comprehensive platform
              </p>
            </div>

            {/* Plan Card */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-white/20">
              <div className="flex items-center justify-center mb-4">
                <Star className="w-8 h-8 text-yellow-400 mr-2" />
                <h2 className="text-2xl font-bold text-white">{plan.name}</h2>
              </div>

              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center">
                  <span className="text-5xl font-bold text-white">${plan.price}</span>
                  <span className="text-white/80 ml-2">per {plan.interval}</span>
                </div>
                <p className="text-teal-100 mt-2">{plan.description}</p>
              </div>

              {/* Features */}
              <div className="space-y-3">
                {plan.features.slice(0, 4).map((feature, index) => (
                  <div key={index} className="flex items-center text-white/90">
                    <Check className="w-5 h-5 text-teal-200 mr-3 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
                {plan.features.length > 4 && (
                  <div className="text-teal-200 text-sm pt-2">
                    + {plan.features.length - 4} more features
                  </div>
                )}
              </div>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center justify-center space-x-8 text-white/60">
              <div className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                <span className="text-sm">Secure</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm">Instant Access</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - White Background with Checkout */}
      <div className="w-1/2 bg-white overflow-y-auto">
        <div className="p-8">
          <div className="max-w-md mx-auto w-full">
            <div className="min-h-[600px] flex flex-col justify-center">
              {/* Header */}
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">
                  Complete Your Subscription
                </h2>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </button>
              </div>

              {/* Contact Information */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Contact Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Email:</p>
                  <p className="font-medium text-gray-900">{agent?.email}</p>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Payment Method
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center p-4 border-2 border-teal-500 bg-teal-50 rounded-lg">
                    <CreditCard className="w-6 h-6 text-teal-600 mr-3" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Credit/Debit Card</div>
                      <div className="text-sm text-gray-500">Visa, Mastercard, American Express</div>
                    </div>
                    <Check className="w-5 h-5 text-teal-500" />
                  </div>
                </div>
              </div>

              {/* Secure Checkout Notice */}
              <div className="mb-6">
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Shield className="w-5 h-5 text-teal-600 mr-2" />
                    <span className="text-sm font-medium text-teal-800">Secure Checkout with Stripe</span>
                  </div>
                  <p className="text-xs text-teal-700">
                    You'll be redirected to Stripe's secure checkout page where you can:
                  </p>
                  <ul className="text-xs text-teal-700 mt-2 space-y-1">
                    <li>• Enter your billing address</li>
                    <li>• See automatic tax calculation</li>
                    <li>• Complete secure payment</li>
                  </ul>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Payment Summary
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">{plan.name}</span>
                    <span className="font-medium">${plan.price}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                    <span>Billed monthly • Cancel anytime</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-gray-900">Total due today</span>
                      <span className="text-2xl font-bold text-gray-900">${plan.price}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Continue to Payment Button */}
              <button
                onClick={handleSubscribe}
                disabled={stripeError || processingPayment}
                className={`w-full flex items-center justify-center px-6 py-4 text-lg font-semibold rounded-lg transition-all duration-200 ${
                  stripeError || processingPayment
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-teal-600 text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                }`}
              >
                {processingPayment ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : stripeError ? (
                  "Temporarily Unavailable"
                ) : (
                  <>
                    Continue to Payment
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </button>

              {/* Error messages */}
              {error && (
                <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Footer text */}
              <p className="text-center mt-6 text-sm text-gray-500">
                Complete your payment securely with Stripe
              </p>

              <div className="flex items-center justify-center mt-4 text-xs text-gray-400">
                <span>Powered by</span>
                <span className="ml-1 font-medium">Stripe</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
