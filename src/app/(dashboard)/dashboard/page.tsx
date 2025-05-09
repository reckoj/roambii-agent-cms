"use client";

import { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  CurrencyDollarIcon,
  ShoppingBagIcon,
  CalendarIcon,
  UserGroupIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { RootState } from "@/lib/redux/store";
import { fetchBookingStatsAsync } from "@/lib/redux/slices/bookingSlice";
import Link from "next/link";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import RevenueInsights from "@/components/dashboard/RevenueInsights";
import PackagePerformance from "@/components/dashboard/PackagePerformance";
import UpcomingBookings from "@/components/dashboard/UpcomingBookings";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Define color scheme
const colors = {
  primary: {
    light: "rgba(79, 209, 197, 0.2)",
    main: "rgba(79, 209, 197, 1)",
    dark: "rgba(14, 116, 144, 1)",
  },
  secondary: {
    light: "rgba(79, 70, 229, 0.2)",
    main: "rgba(79, 70, 229, 1)",
    dark: "rgba(67, 56, 202, 1)",
  },
  success: {
    light: "rgba(16, 185, 129, 0.2)",
    main: "rgba(16, 185, 129, 1)",
    dark: "rgba(5, 150, 105, 1)",
  },
  warning: {
    light: "rgba(245, 158, 11, 0.2)",
    main: "rgba(245, 158, 11, 1)",
    dark: "rgba(217, 119, 6, 1)",
  },
  error: {
    light: "rgba(239, 68, 68, 0.2)",
    main: "rgba(239, 68, 68, 1)",
    dark: "rgba(220, 38, 38, 1)",
  },
};

// Sample dashboard data for comparison/fallback - would be fetched from Firebase in a real implementation
type StatsCard = {
  name: string;
  value: string;
  prevValue?: string;
  change: string;
  changeType: "increase" | "decrease" | "neutral";
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
};

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state: RootState) => state.auth);
  const { bookingStats, loadingStats, bookings } = useAppSelector(
    (state) => state.bookings
  );
  const { packages } = useAppSelector((state) => state.packages);
  const agent = auth?.agent;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsCard[]>([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  // Sample data for new components
  const [packagePerformanceData, setPackagePerformanceData] = useState<any[]>(
    []
  );
  const [upcomingBookingsData, setUpcomingBookingsData] = useState<any[]>([]);

  // Chart data states
  const [revenueData, setRevenueData] = useState<any>(null);
  const [bookingStatusData, setBookingStatusData] = useState<any>(null);
  const [monthlyBookingsData, setMonthlyBookingsData] = useState<any>(null);

  // Fetch booking stats when component mounts
  useEffect(() => {
    if (agent) {
      dispatch(fetchBookingStatsAsync(agent.id));
    }
  }, [agent, dispatch]);

  // Generate data for additional components and charts
  useEffect(() => {
    // Revenue data - 6 month trend
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

    setRevenueData({
      labels: months,
      datasets: [
        {
          label: "Revenue",
          data: [3200, 4100, 2900, 7500, 5600, bookingStats?.revenue || 12650],
          fill: true,
          backgroundColor: colors.primary.light,
          borderColor: colors.primary.main,
          tension: 0.4,
        },
        {
          label: "Bookings",
          data: [10, 14, 8, 22, 18, bookingStats?.total || 34],
          fill: false,
          borderColor: colors.secondary.main,
          borderDash: [5, 5],
          tension: 0.4,
        },
      ],
    });

    // Booking status distribution
    setBookingStatusData({
      labels: ["Confirmed", "Pending", "Cancelled"],
      datasets: [
        {
          data: [
            bookingStats?.confirmed || 22,
            bookingStats?.pending || 8,
            bookingStats?.cancelled || 4,
          ],
          backgroundColor: [
            colors.success.main,
            colors.warning.main,
            colors.error.main,
          ],
          borderWidth: 0,
        },
      ],
    });

    // Monthly bookings data
    setMonthlyBookingsData({
      labels: months,
      datasets: [
        {
          label: "Bookings",
          data: [8, 12, 6, 18, 14, bookingStats?.total || 34],
          backgroundColor: colors.secondary.main,
          borderRadius: 4,
        },
      ],
    });

    // Package performance data from real packages
    if (packages && packages.length > 0) {
      // Sort packages by some criteria (using price as a placeholder for revenue)
      const sortedPackages = [...packages].sort((a, b) => b.price - a.price);

      // Take top 5 packages
      const topPackages = sortedPackages.slice(0, 5);

      // Transform packages into package performance data
      const packageData = topPackages.map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        bookings: Math.floor(Math.random() * 15) + 1, // Placeholder for actual booking counts
        revenue: pkg.price * (Math.floor(Math.random() * 15) + 1), // Placeholder for actual revenue
        growth: Math.floor(Math.random() * 30) - 10, // Placeholder for growth (-10 to +20%)
        image: pkg.image || undefined,
      }));

      setPackagePerformanceData(packageData);
    } else {
      // Fallback to sample data if no packages available
      setPackagePerformanceData([
        {
          id: "1",
          name: "Luxury Beach Resort",
          bookings: 12,
          revenue: 24000,
          growth: 18,
          image:
            "https://images.unsplash.com/photo-1540541338287-41700207dee6?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8NXx8YmVhY2glMjByZXNvcnR8ZW58MHx8MHx8&w=100&q=80",
        },
        {
          id: "2",
          name: "European City Tour",
          bookings: 8,
          revenue: 14400,
          growth: 5,
          image:
            "https://images.unsplash.com/photo-1491557345352-5929e343eb89?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8ZXVyb3BlYW4lMjBjaXR5fGVufDB8fDB8fA%3D%3D&w=100&q=80",
        },
        {
          id: "3",
          name: "Mountain Adventure",
          bookings: 6,
          revenue: 9600,
          growth: -3,
          image:
            "https://images.unsplash.com/photo-1464278533981-50e57c2b7d1d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MXx8bW91bnRhaW4lMjBhZHZlbnR1cmV8ZW58MHx8MHx8&w=100&q=80",
        },
        {
          id: "4",
          name: "Island Paradise",
          bookings: 5,
          revenue: 12500,
          growth: 12,
          image:
            "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8aXNsYW5kJTIwcGFyYWRpc2V8ZW58MHx8MHx8&w=100&q=80",
        },
        {
          id: "5",
          name: "Safari Experience",
          bookings: 4,
          revenue: 8800,
          growth: 8,
          image:
            "https://images.unsplash.com/photo-1523805009345-7448845a9e53?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8c2FmYXJpfGVufDB8fDB8fA%3D%3D&w=100&q=80",
        },
      ]);
    }

    // Upcoming bookings sample data
    setUpcomingBookingsData([
      {
        id: "bk-1",
        clientName: "Emma Johnson",
        packageName: "Luxury Beach Resort Package - 7 nights",
        startDate: new Date(new Date().setDate(new Date().getDate() + 5)),
        endDate: new Date(new Date().setDate(new Date().getDate() + 12)),
        status: "confirmed",
      },
      {
        id: "bk-2",
        clientName: "Michael Chen",
        packageName: "European City Tour - Paris & Rome",
        startDate: new Date(new Date().setDate(new Date().getDate() + 12)),
        endDate: new Date(new Date().setDate(new Date().getDate() + 20)),
        status: "pending",
      },
      {
        id: "bk-3",
        clientName: "Sophia Rodriguez",
        packageName: "Mountain Adventure - Swiss Alps",
        startDate: new Date(new Date().setDate(new Date().getDate() + 18)),
        endDate: new Date(new Date().setDate(new Date().getDate() + 25)),
        status: "confirmed",
      },
    ]);

    // Simulate fetching data
    setTimeout(() => {
      const statsDelta = bookingStats
        ? {
            revenue: bookingStats.revenue > 10000 ? "12%" : "8%",
            revenueDelta:
              bookingStats.revenue > 10000 ? "increase" : "decrease",
            packages: "5%",
            packagesDelta: "increase",
            bookings: bookingStats.total > 30 ? "3%" : "2%",
            bookingsDelta: bookingStats.total > 30 ? "decrease" : "increase",
            clients: "8%",
            clientsDelta: "increase",
          }
        : {
            revenue: "12%",
            revenueDelta: "increase",
            packages: "5%",
            packagesDelta: "increase",
            bookings: "3%",
            bookingsDelta: "decrease",
            clients: "8%",
            clientsDelta: "increase",
          };

      setStats([
        {
          name: "Total Revenue",
          value: bookingStats
            ? `$${bookingStats.revenue.toLocaleString()}`
            : "$12,650",
          prevValue: "$11,300",
          change: statsDelta.revenue,
          changeType: statsDelta.revenueDelta as "increase" | "decrease",
          icon: CurrencyDollarIcon,
          color: "bg-cyan-500",
        },
        {
          name: "Packages",
          value: packages ? packages.length.toString() : "28",
          prevValue: "26",
          change: statsDelta.packages,
          changeType: statsDelta.packagesDelta as "increase" | "decrease",
          icon: ShoppingBagIcon,
          color: "bg-indigo-500",
        },
        {
          name: "Bookings",
          value: bookingStats ? bookingStats.total.toString() : "34",
          prevValue: "35",
          change: statsDelta.bookings,
          changeType: statsDelta.bookingsDelta as "increase" | "decrease",
          icon: CalendarIcon,
          color: "bg-purple-500",
        },
        {
          name: "Clients",
          value: "42",
          prevValue: "39",
          change: statsDelta.clients,
          changeType: statsDelta.clientsDelta as "increase" | "decrease",
          icon: UserGroupIcon,
          color: "bg-pink-500",
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
  }, [bookingStats, packages]);

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          drawBorder: false as const,
          color: "#E5E7EB",
        },
        ticks: {
          precision: 0,
        },
      },
      x: {
        grid: {
          display: false as const,
          drawBorder: false as const,
        },
      },
    },
    interaction: {
      mode: "nearest" as const,
      axis: "x" as const,
      intersect: false,
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          drawBorder: false as const,
          color: "#E5E7EB",
        },
        ticks: {
          precision: 0,
        },
      },
      x: {
        grid: {
          display: false as const,
          drawBorder: false as const,
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
      },
    },
    cutout: "70%",
  };

  // Calculate additional statistics for RevenueInsights component
  const avgBookingValue =
    bookingStats && bookingStats.total > 0
      ? bookingStats.revenue / bookingStats.total
      : 370;

  const topPackageRevenue =
    packagePerformanceData.length > 0
      ? packagePerformanceData[0].revenue
      : 24000;

  const revenueGrowth = 12; // Placeholder

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-8">
      {/* Welcome Banner */}
      <div className="rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-800 mb-8 p-6 shadow-md">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div className="sm:flex-auto">
            <h1 className="text-xl font-semibold text-white">
              Welcome back, {agent?.name || "Agent"}!
            </h1>
            <p className="mt-2 text-sm text-cyan-100">
              Here's an overview of your travel business performance
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:flex-none flex space-x-3">
            <Link
              href="/bookings/create"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-white px-4 py-2 text-sm font-medium text-cyan-600 shadow-sm hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 sm:w-auto"
            >
              <CalendarIcon className="h-5 w-5 mr-2" />
              New Booking
            </Link>
            <Link
              href="/packages/create"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-white px-4 py-2 text-sm font-medium text-cyan-600 shadow-sm hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 sm:w-auto"
            >
              <ShoppingBagIcon className="h-5 w-5 mr-2" />
              New Package
            </Link>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      {loading || loadingStats ? (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className="bg-white overflow-hidden shadow rounded-lg animate-pulse"
            >
              <div className="p-5">
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
              className="bg-white overflow-hidden shadow-lg rounded-lg transition-all duration-300 hover:shadow-xl"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div
                    className={`flex-shrink-0 rounded-md ${stat.color} p-3 text-white`}
                  >
                    <stat.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd>
                        <div className="text-lg font-bold text-gray-900">
                          {stat.value}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div
                    className={`inline-flex items-baseline px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      stat.changeType === "increase"
                        ? "bg-green-100 text-green-800"
                        : stat.changeType === "decrease"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {stat.changeType === "increase" ? (
                      <ArrowUpIcon className="h-4 w-4 mr-1 text-green-500" />
                    ) : stat.changeType === "decrease" ? (
                      <ArrowDownIcon className="h-4 w-4 mr-1 text-red-500" />
                    ) : (
                      <span className="h-4 w-4 mr-1">−</span>
                    )}
                    <span>
                      {stat.change} {stat.prevValue && `vs ${stat.prevValue}`}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">This month</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Revenue Insights & Booking Status */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Revenue & Bookings
            </h2>
            <div className="flex items-center">
              <span className="inline-block h-3 w-3 rounded-full bg-cyan-500 mr-1"></span>
              <span className="text-xs text-gray-500 mr-3">Revenue</span>
              <span className="inline-block h-3 w-3 rounded-full bg-indigo-500 mr-1"></span>
              <span className="text-xs text-gray-500">Bookings</span>
            </div>
          </div>
          {revenueData ? (
            <div className="h-64">
              <Line options={lineChartOptions} data={revenueData} />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
            </div>
          )}
        </div>

        {/* Booking Status Breakdown */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Booking Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 rounded-full bg-green-100 mr-4">
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Confirmed</p>
                    <p className="text-xl font-bold">
                      {bookingStats?.confirmed || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 rounded-full bg-yellow-100 mr-4">
                    <ClockIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pending</p>
                    <p className="text-xl font-bold">
                      {bookingStats?.pending || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 rounded-full bg-red-100 mr-4">
                    <XCircleIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Cancelled</p>
                    <p className="text-xl font-bold">
                      {bookingStats?.cancelled || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-60 flex items-center justify-center">
              {bookingStatusData ? (
                <Doughnut data={bookingStatusData} options={doughnutOptions} />
              ) : (
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Insights & Package Performance */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <RevenueInsights
          totalRevenue={bookingStats?.revenue || 12650}
          avgBookingValue={avgBookingValue}
          topPackageRevenue={topPackageRevenue}
          revenueGrowth={revenueGrowth}
          loading={loading || loadingStats}
        />

        <PackagePerformance
          packages={packagePerformanceData}
          loading={loading}
        />
      </div>

      {/* Monthly Bookings & Upcoming Bookings */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Monthly Bookings Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Monthly Bookings
          </h2>
          {monthlyBookingsData ? (
            <div className="h-64">
              <Bar options={barChartOptions} data={monthlyBookingsData} />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
            </div>
          )}
        </div>

        {/* Upcoming Bookings */}
        <div className="lg:col-span-1">
          <UpcomingBookings bookings={upcomingBookingsData} loading={loading} />
        </div>
      </div>

      {/* Recent bookings */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Bookings
          </h2>
          <Link
            href="/bookings"
            className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
          >
            View all bookings
          </Link>
        </div>
        <div className="mt-4 overflow-hidden bg-white shadow-lg rounded-lg">
          {loading ? (
            <div className="animate-pulse bg-white">
              <div className="h-12 bg-gray-100"></div>
              {[...Array(5)].map((_, index) => (
                <div key={index} className="h-16 border-t border-gray-200">
                  <div className="grid grid-cols-6 gap-4 p-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-4 bg-gray-200 rounded"></div>
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
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-cyan-600 sm:pl-6">
                      {booking.id}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {booking.client}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 max-w-xs truncate">
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
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
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
  );
}
