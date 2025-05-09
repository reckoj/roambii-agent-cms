"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { db } from "@/lib/firebase/config";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { auth } from "@/lib/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { setAgent } from "@/lib/redux/slices/authSlice";
import {
  ensureUserDocument,
  getUserFromLocalStorage,
} from "@/lib/auth-helpers";

// Define interfaces for type safety
interface SubscriptionData {
  subscription?: any;
  rawSubscription?: any;
  customerId?: string;
}

interface UserData {
  id: string;
  email: string;
  name?: string;
}

export default function SubscriptionSuccess() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const [debug, setDebug] = useState<any>(null);
  const [sessionError, setSessionError] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const agent = useAppSelector((state) => state.auth.agent);

  // First try to get the user from Redux state
  useEffect(() => {
    const checkAuthentication = async () => {
      console.log("Checking authentication state...");

      // Check if we have the user in Redux state
      if (agent?.id) {
        console.log("User found in Redux state:", agent.id);
        setUserId(agent.id);
        return;
      }

      // If not, wait a moment for Firebase auth to initialize
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          console.log("User authenticated via Firebase:", user.uid);

          // Ensure user exists in Firestore
          await ensureUserDocument(
            user.uid,
            user.email || undefined,
            user.displayName || undefined
          );

          // Update Redux state
          dispatch(
            setAgent({
              id: user.uid,
              name: user.displayName || "",
              email: user.email || "",
              avatar: user.photoURL || undefined,
            })
          );

          setUserId(user.uid);
        } else {
          console.log("No authenticated user found in Firebase");

          // Try to get user from localStorage
          const localUser = getUserFromLocalStorage();
          if (localUser) {
            console.log("Using stored user ID:", localUser.id);

            // Ensure user exists in Firestore
            await ensureUserDocument(
              localUser.id,
              localUser.email,
              localUser.name
            );

            setUserId(localUser.id);

            dispatch(
              setAgent({
                id: localUser.id,
                name: localUser.name || "",
                email: localUser.email || "",
                avatar: undefined,
              })
            );
          } else {
            setSessionError(true);
            setMessage(
              "Your session has expired. Please log in again to verify your subscription."
            );
            setTimeout(() => {
              router.push("/login");
            }, 5000);
          }
        }
      });

      // Clean up the listener after we get the result
      setTimeout(() => {
        unsubscribe();
      }, 2000);
    };

    checkAuthentication();
  }, [agent, dispatch, router]);

  // Then proceed with verification once we have userId
  useEffect(() => {
    if (!userId || sessionError) return;

    // Store userId in localStorage for post-redirect recovery
    localStorage.setItem("lastUserId", userId);

    const verifySubscription = async () => {
      try {
        const sessionId = searchParams!.get("session_id");

        if (!sessionId) {
          throw new Error("No session ID found");
        }

        console.log("Starting verification with session ID:", sessionId);

        // Try direct API call to Stripe
        try {
          await verifyWithApi(sessionId);
        } catch (apiError) {
          console.error("API verification failed:", apiError);
          setStatus("error");
          setMessage(
            `There was an error verifying your subscription: ${
              apiError instanceof Error ? apiError.message : "Unknown error"
            }`
          );
        }
      } catch (error) {
        console.error("Error in verification process:", error);
        setStatus("error");
        setMessage(
          `There was an error verifying your subscription: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    };

    const verifyWithApi = async (sessionId: string) => {
      // Verify the subscription with our API
      const response = await fetch("/api/stripe/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          userId: userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API error:", errorData);
        throw new Error(
          `Failed to verify subscription: ${
            errorData.error || response.statusText || "Unknown error"
          }`
        );
      }

      const data: SubscriptionData = await response.json();

      // Save full response for debugging
      setDebug(data);

      // Debug logging
      console.log("API response received");

      // Try to get data from safe response or fall back to raw data
      const subscription = data.subscription || data.rawSubscription;

      if (!subscription) {
        throw new Error("No subscription data received from API");
      }

      // Check subscription object structure
      console.log("Subscription object keys:", Object.keys(subscription));

      // Get timestamp values safely, with fallbacks
      const startTimestamp = subscription.current_period_start;
      const endTimestamp = subscription.current_period_end;

      console.log("Period timestamps:", {
        startTimestamp,
        endTimestamp,
        type: typeof startTimestamp,
      });

      if (startTimestamp === undefined || endTimestamp === undefined) {
        // Try to extract timestamps another way
        console.log("Trying alternate methods to find timestamps");

        // If we have raw data, try to use that
        if (data.rawSubscription) {
          console.log("Trying raw subscription data instead");
          const rawStart = data.rawSubscription.current_period_start;
          const rawEnd = data.rawSubscription.current_period_end;

          if (rawStart && rawEnd) {
            console.log("Using timestamps from raw data:", {
              rawStart,
              rawEnd,
            });
            // Create dates from the unix timestamps
            const currentPeriodStart = new Date(rawStart * 1000);
            const currentPeriodEnd = new Date(rawEnd * 1000);

            await saveSubscription(data, currentPeriodStart, currentPeriodEnd);
            return;
          }
        }

        // If all else fails, use now + 30 days as a fallback
        console.log("Using fallback dates");
        const now = new Date();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(now.getDate() + 30);

        await saveSubscription(data, now, thirtyDaysLater);
        return;
      }

      // Create dates from the unix timestamps
      const currentPeriodStart = new Date(startTimestamp * 1000);
      const currentPeriodEnd = new Date(endTimestamp * 1000);

      console.log("Converted dates:", {
        start: currentPeriodStart.toString(),
        end: currentPeriodEnd.toString(),
      });

      await saveSubscription(data, currentPeriodStart, currentPeriodEnd);
    };

    // Helper function to save subscription data
    const saveSubscription = async (
      data: SubscriptionData,
      startDate: Date,
      endDate: Date
    ) => {
      try {
        if (!userId) {
          throw new Error("User ID is required");
        }

        // Ensure user exists in Firestore
        try {
          await ensureUserDocument(userId);
        } catch (error) {
          console.error("Error ensuring user document, but continuing:", error);
          // Continue even if this fails due to permissions
        }

        const subscription = data.subscription || data.rawSubscription;

        // Try to get the price ID safely
        let priceId = "unknown_price";
        try {
          if (subscription.items?.data?.[0]?.price?.id) {
            priceId = subscription.items.data[0].price.id;
          } else if (subscription.plan?.id) {
            priceId = subscription.plan.id;
          }
        } catch (err) {
          console.error("Error getting price ID:", err);
        }

        // Save subscription to Firestore with proper date handling
        const subscriptionData = {
          id: subscription.id,
          userId: userId,
          stripeCustomerId: data.customerId || "unknown",
          stripeSubscriptionId: subscription.id,
          status: subscription.status || "active",
          planId: priceId,
          // Store as ISO strings for Firestore
          currentPeriodStart: startDate.toISOString(),
          currentPeriodEnd: endDate.toISOString(),
          cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        console.log("Saving subscription data:", subscriptionData);

        // Try to save to Firestore, but don't fail if permissions error
        try {
          await setDoc(
            doc(db, "subscriptions", subscription.id),
            subscriptionData
          );
          console.log("Subscription saved to Firestore successfully");
        } catch (error) {
          console.error(
            "Error saving to Firestore, continuing with local storage:",
            error
          );
          // Store locally if Firestore fails
          localStorage.setItem(
            "subscriptionData",
            JSON.stringify(subscriptionData)
          );
        }

        // Set subscription cookie for middleware
        try {
          const Cookies = await import("js-cookie").then((mod) => mod.default);
          Cookies.set("hasSubscription", "true", { expires: 30 });
          console.log("Set hasSubscription cookie to true");
        } catch (error) {
          console.error("Error setting cookie:", error);
        }

        setStatus("success");
        setMessage(
          "Your subscription has been activated successfully! Redirecting to dashboard..."
        );

        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          console.log("Redirecting to dashboard");
          router.push("/dashboard");
        }, 3000);
      } catch (error) {
        console.error("Error saving subscription:", error);
        throw error;
      }
    };

    verifySubscription();
  }, [searchParams, userId, router, sessionError]);

  // Show loading state while waiting for agent data
  if (sessionError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Session Expired
            </h2>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
            <div className="mt-4">
              <button
                onClick={() => router.push("/login")}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Loading...
            </h2>
            <div className="mt-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {status === "loading" && "Verifying your subscription..."}
            {status === "success" && "Subscription Activated!"}
            {status === "error" && "Verification Error"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">{message}</p>
          {status === "loading" && (
            <div className="mt-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
            </div>
          )}

          {/* Debug info - remove in production */}
          {status === "error" && debug && (
            <div className="mt-8 p-4 bg-gray-100 rounded overflow-auto max-h-64 text-left">
              <p className="font-bold">Debug Info:</p>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(debug, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
