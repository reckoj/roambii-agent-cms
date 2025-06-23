"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { subscriptionService } from "@/lib/subscription-service";
import { logoutUserAsync } from "@/lib/redux/slices/authSlice";
import { 
  ArrowLeft, 
  CreditCard, 
  Calendar, 
  User, 
  MapPin, 
  AlertTriangle,
  CheckCircle,
  Loader2
} from "lucide-react";
import Link from "next/link";

interface SubscriptionDetails {
  id: string;
  status: string;
  planId: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
}

export const CancelSubscriptionPage: React.FC = () => {
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const agent = useAppSelector((state) => state.auth.agent);
  const dispatch = useAppDispatch();
  const router = useRouter();

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!agent?.id) return;
      
      try {
        setLoading(true);
        const sub = await subscriptionService.getSubscription(agent.id);
        if (sub) {
          setSubscription(sub);
        } else {
          setError("No active subscription found");
        }
      } catch (err) {
        console.error("Error fetching subscription:", err);
        setError("Failed to load subscription details");
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [agent?.id]);

  const handleCancel = async () => {
    if (!subscription) return;
    
    try {
      setCanceling(true);
      setError(null);
      
      await subscriptionService.cancelSubscription(subscription.stripeSubscriptionId);
      
      // Update local state
      setSubscription({
        ...subscription,
        cancelAtPeriodEnd: true
      });
      
      setSuccess(true);
    } catch (err) {
      console.error("Error canceling subscription:", err);
      setError("Failed to cancel subscription. Please try again.");
    } finally {
      setCanceling(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const handleLogout = async () => {
    try {
      await dispatch(logoutUserAsync());
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  if (error && !subscription) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Subscription Canceled</h2>
          <p className="text-gray-600 mb-4">
            Your subscription has been canceled and will end on {subscription && formatDate(subscription.currentPeriodEnd)}.
            You'll continue to have access until then.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-teal-600 hover:text-teal-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Return to Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-8 text-white">
            <h1 className="text-2xl font-bold mb-2">CURRENT SUBSCRIPTION</h1>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">Premium Plan</h2>
                <p className="text-xl font-semibold text-teal-100">$19.99 per month</p>
              </div>
              <div className="text-right">
                <button
                  onClick={handleCancel}
                  disabled={canceling || subscription?.cancelAtPeriodEnd}
                  className="bg-white text-teal-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {canceling ? (
                    <span className="flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Canceling...
                    </span>
                  ) : subscription?.cancelAtPeriodEnd ? (
                    "Canceled"
                  ) : (
                    "Cancel subscription"
                  )}
                </button>
              </div>
            </div>
            {subscription && (
              <p className="text-teal-100 mt-2">
                {subscription.cancelAtPeriodEnd 
                  ? `Subscription ends on ${formatDate(subscription.currentPeriodEnd)}`
                  : `Your subscription renews on ${formatDate(subscription.currentPeriodEnd)}`
                }
              </p>
            )}
          </div>

          {/* Payment Method Section */}
          <div className="px-6 py-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">PAYMENT METHOD</h3>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
              <div className="flex items-center">
                <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold mr-3">
                  VISA
                </div>
                <span className="text-gray-700">Visa •••• {subscription?.stripeCustomerId?.slice(-4) || "****"}</span>
              </div>
              <span className="text-gray-500">Expires 06/2028</span>
            </div>

            <button className="text-teal-600 hover:text-teal-700 text-sm font-medium">
              + Add payment method
            </button>
          </div>

          {/* Billing Information Section */}
          <div className="px-6 py-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">BILLING INFORMATION</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Name</span>
                <span className="text-gray-900">{agent?.name || "Agent Name"}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Email</span>
                <span className="text-gray-900">{agent?.email || "agent@example.com"}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Billing address</span>
                <div className="text-right text-gray-900">
                  <div>123 Business Street</div>
                  <div>City, State 12345</div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-6 py-4 bg-red-50 border-t border-red-200">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Cancellation Notice */}
          {subscription?.cancelAtPeriodEnd && (
            <div className="px-6 py-4 bg-yellow-50 border-t border-yellow-200">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                <p className="text-yellow-700">
                  Your subscription is canceled and will end on {formatDate(subscription.currentPeriodEnd)}.
                  You'll continue to have access until then.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Powered by Roambii • Need help? Contact support</p>
        </div>
      </div>
    </div>
  );
}; 