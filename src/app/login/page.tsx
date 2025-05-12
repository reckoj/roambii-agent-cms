// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/lib/redux/hooks";
import { loginUserAsync } from "@/lib/redux/slices/authSlice";
import { ArrowRight, Mail, Lock, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  storeUserInLocalStorage,
  checkAndStoreSubscriptionStatus,
} from "@/lib/auth-helpers";
// import LoginDebugger from "@/components/LoginDebug";
import Cookies from "js-cookie";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    console.log("Login attempt with email:", email);

    try {
      const resultAction = await dispatch(loginUserAsync({ email, password }));

      if (
        resultAction.meta?.requestStatus === "fulfilled" &&
        resultAction.payload
      ) {
        const user = resultAction.payload as any;
        console.log("Login successful:", user);

        // Store user data in localStorage
        storeUserInLocalStorage({
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        });

        // Set a cookie for server-side auth checks
        Cookies.set("lastUserId", user.id, { expires: 7 }); // Expires in 7 days

        // Check and store subscription status
        const hasSubscription = await checkAndStoreSubscriptionStatus(user.id);
        console.log("Subscription status:", hasSubscription);

        // Redirect based on subscription status
        if (hasSubscription) {
          router.push("/dashboard");
        } else {
          router.push("/subscribe");
        }
      } else {
        // Handle access denied error without logging to console
        const errorMessage =
          typeof resultAction.payload === "string"
            ? resultAction.payload
            : "Invalid email or password";
        setError(errorMessage);
      }
    } catch (err: any) {
      // Handle errors without logging to console
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder-gray-400 text-gray-900"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder-gray-400 text-gray-900"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-lg shadow-lg transform transition hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                "Signing in..."
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} className="ml-2" />
                </>
              )}
            </button>

            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-sm text-teal-600 hover:text-teal-700"
              >
                Forgot your password?
              </Link>
            </div>
          </form>

          {/* Debug component - REMOVE IN PRODUCTION */}
          {/* <LoginDebugger /> */}
        </div>
      </div>

      {/* Right side - Design/Image */}
      <div className="hidden lg:block lg:w-1/2 relative bg-gradient-to-br from-teal-500 to-teal-700">
        <div className="absolute inset-0 bg-pattern opacity-5"></div>
        <div className="relative h-full flex items-center justify-center p-12">
          <div className="max-w-lg text-center">
            <div className="relative mx-auto max-w-md mb-8">
              <div className="absolute inset-0 bg-teal-300 rounded-3xl transform rotate-3 scale-105 opacity-20"></div>
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden transform -rotate-1">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center">
                        <svg
                          className="h-6 w-6 text-teal-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Travel Made Easy
                        </h3>
                        <p className="text-sm text-gray-500">
                          Your journey starts here
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">
              Welcome to Roambii
            </h2>
            <p className="text-xl text-teal-100 font-light">
              Your trusted platform for personalized travel experiences
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
