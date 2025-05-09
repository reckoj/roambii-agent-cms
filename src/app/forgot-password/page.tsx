// app/forgot-password/page.tsx
"use client";

import { useState } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { resetPasswordAsync } from "@/lib/redux/slices/authSlice";
import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useAppDispatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setIsLoading(true);

    try {
      const resultAction = await dispatch(resetPasswordAsync(email));
      if (resetPasswordAsync.fulfilled.match(resultAction)) {
        setSuccess(true);
      } else {
        setError(resultAction.payload as string);
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <Link
            href="/login"
            className="inline-flex items-center text-teal-600 hover:text-teal-700 mb-8"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Login
          </Link>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password</h1>
            <p className="text-gray-600">
              Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

          {success ? (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold text-teal-800 mb-2">Check Your Email</h3>
              <p className="text-teal-700">
                We've sent password reset instructions to your email address.
              </p>
          </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
          <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
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

              {error && (
                <div className="text-red-500 text-sm text-center">{error}</div>
              )}

            <button
              type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-lg shadow-lg transform transition hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}
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
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                  </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Secure Access
                        </h3>
                        <p className="text-sm text-gray-500">
                          Reset your password securely
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">
              Need Help?
            </h2>
            <p className="text-xl text-teal-100 font-light">
              We'll help you get back into your account
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
