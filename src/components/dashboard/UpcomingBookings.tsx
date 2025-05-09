import React from "react";
import { CalendarIcon, UserIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

type BookingData = {
  id: string;
  clientName: string;
  packageName: string;
  startDate: Date | string;
  endDate: Date | string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
};

type UpcomingBookingsProps = {
  bookings: BookingData[];
  loading?: boolean;
};

const UpcomingBookings: React.FC<UpcomingBookingsProps> = ({
  bookings,
  loading = false,
}) => {
  // Format date
  const formatDate = (date: Date | string) => {
    if (!date) return "";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get status badge color
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
      <div className="bg-white rounded-lg shadow-lg p-6 animate-pulse">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 h-6 bg-gray-200 rounded w-1/3"></h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex justify-between mb-2">
                <div className="h-5 bg-gray-200 rounded w-1/4"></div>
                <div className="h-5 bg-gray-200 rounded w-1/6"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Upcoming Bookings
        </h3>
        <Link
          href="/bookings"
          className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
        >
          View all
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <p>No upcoming bookings</p>
          <Link
            href="/bookings/create"
            className="mt-2 inline-block text-sm text-cyan-600 hover:text-cyan-700 font-medium"
          >
            Create a booking
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <Link
              key={booking.id}
              href={`/bookings/${booking.id}`}
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-sm font-medium text-gray-900">
                  {booking.clientName}
                </h4>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(
                    booking.status
                  )}`}
                >
                  {booking.status.charAt(0).toUpperCase() +
                    booking.status.slice(1)}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-1 truncate">
                {booking.packageName}
              </p>
              <div className="flex items-center text-xs text-gray-500">
                <CalendarIcon className="h-4 w-4 mr-1" />
                <span>
                  {formatDate(booking.startDate)} -{" "}
                  {formatDate(booking.endDate)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpcomingBookings;
