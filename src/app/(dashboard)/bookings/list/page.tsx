"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  fetchBookingsAsync,
  setFilters,
  clearBookings,
} from "@/lib/redux/slices/bookingSlice";
import Link from "next/link";
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon 
} from "@heroicons/react/24/outline";
import { BookingProgressBar } from "@/components/booking";
import { Booking, BookingFilter } from "@/types/booking";

export default function BookingsListPage() {
  const dispatch = useAppDispatch();
  const { agent } = useAppSelector((state) => state.auth);
  const { bookings, loading, filters, hasMore, lastVisible } = useAppSelector(
    (state) => state.bookings
  );

  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || "");
  const [statusFilter, setStatusFilter] = useState(filters.status || "all");

  // Load initial bookings
  useEffect(() => {
    if (agent) {
      dispatch(clearBookings());
      dispatch(
        fetchBookingsAsync({
          agentId: agent.id,
          filters: { ...filters, searchTerm, status: statusFilter },
          reset: true,
        })
      );
    }
  }, [agent, dispatch]);

  // Handle search
  const handleSearch = () => {
    if (!agent) return;

    const newFilters: BookingFilter = {
      ...filters,
      searchTerm: searchTerm.trim() || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    };

    dispatch(setFilters(newFilters));
    dispatch(clearBookings());
    dispatch(
      fetchBookingsAsync({
        agentId: agent.id,
        filters: newFilters,
        reset: true,
      })
    );
  };

  // Load more bookings
  const loadMore = () => {
    if (!agent || loading || !hasMore) return;

    dispatch(
      fetchBookingsAsync({
        agentId: agent.id,
        filters,
        lastVisible,
        reset: false,
      })
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
          <Link
            href="/bookings/create"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Booking
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="search" className="sr-only">
              Search bookings
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
                placeholder="Search by client name, email, or package..."
              />
            </div>
          </div>
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Status
              </label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm rounded-md"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <button
              onClick={handleSearch}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading && bookings.length === 0 ? (
          <div className="animate-pulse">
            <div className="h-12 bg-gray-100"></div>
            {[...Array(5)].map((_, index) => (
              <div key={index} className="h-20 border-t border-gray-200">
                <div className="p-4">
                  <div className="grid grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-4 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No bookings
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new booking.
            </p>
            <div className="mt-6">
              <Link
                href="/bookings/create"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                New Booking
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Client
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Package
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Dates
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Amount
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Progress
                    </th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {booking.clientName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {booking.clientEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500 max-w-xs">
                        <div className="truncate">{booking.packageName}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <div>
                          <div>{formatDate(booking.startDate)}</div>
                          <div className="text-xs text-gray-400">
                            to {formatDate(booking.endDate)}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-medium">
                        {formatCurrency(booking.price)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                            booking.status
                          )}`}
                        >
                          {booking.status.charAt(0).toUpperCase() +
                            booking.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm">
                        <div className="w-40">
                          <BookingProgressBar 
                            progress={booking.progress} 
                            agentId={agent?.id}
                          />
                        </div>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <Link
                          href={`/bookings/${booking.id}`}
                          className="text-cyan-600 hover:text-cyan-900"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-gray-200">
              {bookings.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/bookings/${booking.id}`}
                  className="block p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-900">
                      {booking.clientName}
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(
                        booking.status
                      )}`}
                    >
                      {booking.status.charAt(0).toUpperCase() +
                        booking.status.slice(1)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mb-2 truncate">
                    {booking.packageName}
                  </div>
                  <div className="text-xs text-gray-500 mb-3">
                    {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(booking.price)}
                    </div>
                    <div className="w-24">
                      <BookingProgressBar 
                        progress={booking.progress} 
                        agentId={agent?.id}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-cyan-700 bg-cyan-100 hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-cyan-700"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 