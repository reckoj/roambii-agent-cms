// app/(dashboard)/dashboard/page.tsx
"use client";

import { JSX, useEffect, useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  CurrencyDollarIcon,
  ShoppingBagIcon,
  CalendarIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { RootState } from "@/lib/redux/store";

// Sample dashboard data - would be fetched from Firebase in a real implementation
type StatsCard = {
  name: string;
  value: string;
  change: string;
  changeType: "increase" | "decrease";
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export default function DashboardPage() {
  const auth = useAppSelector((state: RootState) => state.auth);
  const agent = auth?.agent;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsCard[]>([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  // Simulate fetching data
  useEffect(() => {
    // In a real implementation, you would fetch this data from Firebase
    setTimeout(() => {
      setStats([
        {
          name: "Total Revenue",
          value: "$12,650",
          change: "12%",
          changeType: "increase",
          icon: CurrencyDollarIcon,
        },
        {
          name: "Packages Sold",
          value: "28",
          change: "5%",
          changeType: "increase",
          icon: ShoppingBagIcon,
        },
        {
          name: "Bookings",
          value: "34",
          change: "3%",
          changeType: "decrease",
          icon: CalendarIcon,
        },
        {
          name: "Clients",
          value: "42",
          change: "8%",
          changeType: "increase",
          icon: UserGroupIcon,
        },
      ]);

      setRecentBookings([
        {
          id: "BOOK-123",
          client: "Jane Cooper",
          package: "Luxury Beach Resort Package",
          date: "2023-05-10",
          amount: "$2,400",
          status: "Confirmed",
        },
        {
          id: "BOOK-122",
          client: "John Smith",
          package: "European Adventure Tour",
          date: "2023-05-08",
          amount: "$3,200",
          status: "Confirmed",
        },
        {
          id: "BOOK-121",
          client: "Robert Johnson",
          package: "Mountain Retreat Package",
          date: "2023-05-06",
          amount: "$1,800",
          status: "Pending",
        },
        {
          id: "BOOK-120",
          client: "Emily Davis",
          package: "City Explorer Package",
          date: "2023-05-05",
          amount: "$1,250",
          status: "Confirmed",
        },
        {
          id: "BOOK-119",
          client: "Michael Brown",
          package: "Island Paradise Getaway",
          date: "2023-05-04",
          amount: "$2,800",
          status: "Cancelled",
        },
      ]);

      setLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700">
            Welcome back, {agent?.name || "Agent"}! Here's an overview of your
            business.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 sm:w-auto"
          >
            Create New Package
          </button>
        </div>
      </div>

      {/* Stats cards */}
      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className="bg-white overflow-hidden shadow rounded-lg"
            >
              <div className="p-5 animate-pulse">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                  <div className="ml-5 w-full">
                    <div className="h-2 bg-gray-200 rounded"></div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                  <div className="mt-2 h-2 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="bg-white overflow-hidden shadow rounded-lg"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <stat.icon
                      className="h-6 w-6 text-gray-400"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">
                          {stat.value}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-4">
                  <div
                    className={`inline-flex items-baseline px-2.5 py-0.5 rounded-full text-sm font-medium ${
                      stat.changeType === "increase"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {stat.changeType === "increase" ? (
                      <svg
                        className="-ml-1 mr-0.5 flex-shrink-0 self-center h-5 w-5 text-green-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="-ml-1 mr-0.5 flex-shrink-0 self-center h-5 w-5 text-red-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    <span className="sr-only">
                      {stat.changeType === "increase"
                        ? "Increased"
                        : "Decreased"}{" "}
                      by
                    </span>
                    {stat.change}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent bookings */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Recent Bookings</h2>
        <div className="mt-4 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                {loading ? (
                  <div className="animate-pulse bg-white">
                    <div className="h-12 bg-gray-100"></div>
                    {[...Array(5)].map((_, index) => (
                      <div
                        key={index}
                        className="h-16 border-t border-gray-200"
                      >
                        <div className="grid grid-cols-6 gap-4 p-4">
                          {[...Array(6)].map((_, i) => (
                            <div
                              key={i}
                              className="h-4 bg-gray-200 rounded"
                            ></div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                        >
                          Booking ID
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Client
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Package
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Date
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Amount
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {recentBookings.map((booking) => (
                        <tr key={booking.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {booking.id}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {booking.client}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {booking.package}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {new Date(booking.date).toLocaleDateString()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {booking.amount}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span
                              className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                booking.status === "Confirmed"
                                  ? "bg-green-100 text-green-800"
                                  : booking.status === "Pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {booking.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 text-right">
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
          >
            View all bookings
          </button>
        </div>
      </div>
    </div>
  );
}
