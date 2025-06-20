"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  fetchBookingByIdAsync,
  updateBookingProgressAsync,
} from "@/lib/redux/slices/bookingSlice";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { BookingProgressBar } from "@/components/booking";
import { PencilIcon } from "lucide-react";

export default function BookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  const bookingId = params?.id as string;

  const { agent } = useAppSelector((state) => state.auth);
  const { selectedBooking, loading, error } = useAppSelector(
    (state) => state.bookings
  );

  // Debug logging to see what we're getting
  console.log("Booking Detail Debug:", {
    selectedBooking,
    loading,
    error,
    bookingId
  });

  // Remove modal state - we'll use direct click interaction

  // Fetch booking details
  useEffect(() => {
    if (bookingId) {
      dispatch(fetchBookingByIdAsync(bookingId));
    }
  }, [bookingId, dispatch]);

  const handleStageClick = async (stageId: number) => {
    console.log("handleStageClick called with:", { stageId, bookingId, agentId: agent?.id });
    
    if (!bookingId || !agent) {
      console.log("Missing required data:", { bookingId, agent: agent?.id });
      return;
    }

    try {
      console.log("Dispatching updateBookingProgressAsync...");
      const result = await dispatch(
        updateBookingProgressAsync({
          bookingId,
          stageId,
          completed: true, // Always mark as completed when clicked
          agentId: agent.id,
        })
      ).unwrap();
      console.log("Progress update successful:", result);
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !selectedBooking) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Booking Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            {error || "The booking you're looking for doesn't exist."}
          </p>
          <Link
            href="/bookings"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link
              href="/bookings"
              className="mr-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Back to Bookings
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              Booking #{selectedBooking.id.slice(-6)}
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                selectedBooking.status
              )}`}
            >
              {selectedBooking.status.charAt(0).toUpperCase() +
                selectedBooking.status.slice(1)}
            </span>
            <Link
              href={`/bookings/edit/${selectedBooking.id}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit Booking
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Booking Details */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Booking Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Client Information
                </h3>
                <div className="space-y-2">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">Name:</span>{" "}
                    {selectedBooking.clientName}
                  </p>
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">Email:</span>{" "}
                    {selectedBooking.clientEmail}
                  </p>
                  {selectedBooking.clientPhone && (
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Phone:</span>{" "}
                      {selectedBooking.clientPhone}
                    </p>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Package Information
                </h3>
                <div className="space-y-2">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">Package:</span>{" "}
                    {selectedBooking.packageName}
                  </p>
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">Travelers:</span>{" "}
                    {selectedBooking.travelers}
                  </p>
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">Dates:</span>{" "}
                    {formatDate(selectedBooking.startDate)} -{" "}
                    {formatDate(selectedBooking.endDate)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500 mb-1">
                  Total Price
                </h4>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(selectedBooking.price)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500 mb-1">
                  Amount Paid
                </h4>
                <p className="text-2xl font-semibold text-green-600">
                  {formatCurrency(selectedBooking.totalPaid)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500 mb-1">
                  Balance Due
                </h4>
                <p className="text-2xl font-semibold text-red-600">
                  {formatCurrency(selectedBooking.balance)}
                </p>
              </div>
            </div>

            {selectedBooking.notes && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Notes
                </h3>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {selectedBooking.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Progress Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Booking Progress
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Click on the next stage to mark it as complete
              </p>
            </div>
            
            <div className="space-y-4">
              <BookingProgressBar 
                progress={selectedBooking.progress} 
                showDetails={true}
                onStageClick={handleStageClick}
                canUpdate={true}
                agentId={agent?.id}
              />
            </div>

            <div className="mt-6 text-xs text-gray-500">
              <p>
                Last updated:{" "}
                {selectedBooking.progress?.updatedAt
                  ? new Date(selectedBooking.progress.updatedAt).toLocaleDateString()
                  : "Never"}
              </p>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
} 