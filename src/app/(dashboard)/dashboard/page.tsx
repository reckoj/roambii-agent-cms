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
import { fetchBookingStatsAsync, fetchBookingsAsync } from "@/lib/redux/slices/bookingSlice";
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
import { getAgentClientsFromBookings } from "@/lib/client-service";
import { getAgentPackages } from "@/lib/package-service";
import { getAgentRevenueStats } from "@/lib/revenue-service";
import { setPackages } from "@/lib/redux/slices/packageSlice";
import { AnyAction } from "redux";
import { Package } from "@/types/package";

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

// Add a helper function to the top of the component
const serializeDates = (obj: any, seen = new WeakMap<object, any>()): any => {
  // Handle null or non-objects
  if (!obj || typeof obj !== 'object') return obj;
  
  // Check for circular references
  if (seen.has(obj)) return seen.get(obj);
  
  // Handle Date objects directly
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  // Create a shallow copy that Immer can handle
  let result: any;
  
  // For arrays, map over each element
  if (Array.isArray(obj)) {
    result = [];
    seen.set(obj, result);
    for (let i = 0; i < obj.length; i++) {
      result[i] = serializeDates(obj[i], seen);
    }
    return result;
  }
  
  // For objects, create a new object and process each property
  result = {};
  seen.set(obj, result);
  
  // Only include serializable properties
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value !== 'function' && key !== '__proto__') {
        result[key] = serializeDates(value, seen);
      }
    }
  }
  
  return result;
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
  const [clientCount, setClientCount] = useState<number>(0);
  const [clientsLoading, setClientsLoading] = useState<boolean>(true);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [revenueLoading, setRevenueLoading] = useState<boolean>(true);
  const [packageCount, setPackageCount] = useState<number>(0);
  const [packagesLoading, setPackagesLoading] = useState<boolean>(true);
  const [revenueStats, setRevenueStats] = useState<any>(null);
  const [loadingRevenue, setLoadingRevenue] = useState<boolean>(true);

  // Sample data for new components
  const [packagePerformanceData, setPackagePerformanceData] = useState<any[]>(
    []
  );
  const [upcomingBookingsData, setUpcomingBookingsData] = useState<any[]>([]);

  // Chart data states
  const [revenueData, setRevenueData] = useState<any>(null);
  const [bookingStatusData, setBookingStatusData] = useState<any>(null);
  const [monthlyBookingsData, setMonthlyBookingsData] = useState<any>(null);

  // Add a state for package booking data
  const [packageBookingData, setPackageBookingData] = useState<Record<string, { count: number, revenue: number, lastMonth: { count: number, revenue: number } }>>({});

  // Define helper functions before the main effect
  const loadAgentPackages = async () => {
    if (!agent) return;
    
    try {
      setPackagesLoading(true);
      const result = await getAgentPackages(agent.id);
      console.log(`Loaded ${result.packages.length} packages for agent:`, 
        result.packages.map(p => ({ name: p.name, featured: p.isFeatured, id: p.id })));
      
      // Serialize dates in packages to fix Redux errors
      const serializedPackages = result.packages.map(pkg => {
        // Create a simplified package object with only needed properties
        const simplifiedPackage = {
          id: pkg.id,
          name: pkg.name,
          description: pkg.description || '',
          price: pkg.price || 0,
          type: pkg.type || '',
          image: pkg.image || null,
          rating: pkg.rating || 0,
          allinclusive: pkg.allinclusive || false,
          roomType: pkg.roomType || '',
          amenities: Array.isArray(pkg.amenities) ? [...pkg.amenities] : [],
          isFeatured: pkg.isFeatured || false,
          bathrooms: pkg.bathrooms || 0,
          bedrooms: pkg.bedrooms || 0,
          guestAmount: pkg.guestAmount || 1,
          salesCount: pkg.salesCount || 0,
          checkInDate: new Date().toISOString(),
          checkOutDate: new Date().toISOString(),
          checkInTime: new Date().toISOString(),
          checkOutTime: new Date().toISOString(),
          agent: pkg.agent ? {
            id: pkg.agent.id,
            name: pkg.agent.name,
            avatar: pkg.agent.avatar || null
          } : null,
          createdAt: pkg.createdAt ? new Date(pkg.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: pkg.updatedAt ? new Date(pkg.updatedAt).toISOString() : new Date().toISOString(),
        };
        
        return simplifiedPackage;
      });
      
      console.log("Serialized packages for Redux:", serializedPackages.length);
      
      // Store these packages in Redux
      dispatch(setPackages(serializedPackages as unknown as Package[]));

      // Set local state
      setPackageCount(result.packages.length);
      setPackagesLoading(false);
    } catch (error) {
      console.error("Error loading packages:", error);
      setPackagesLoading(false);
    }
  };

  // Fetch revenue stats
  const fetchRevenueStats = async () => {
    if (!agent) return;
    
    try {
      setLoadingRevenue(true);
      const stats = await getAgentRevenueStats(agent.id);
      setRevenueStats(stats);
    } catch (error) {
      console.error("Error fetching revenue stats:", error);
    } finally {
      setLoadingRevenue(false);
    }
  };

  // Fetch client count
  const fetchClientCount = async () => {
    if (!agent) return;
    
    try {
      setClientsLoading(true);
      const clients = await getAgentClientsFromBookings(agent.id);
      setClientCount(clients.length);
    } catch (error) {
      console.error("Error fetching client count:", error);
      setClientCount(0);
    } finally {
      setClientsLoading(false);
    }
  };

  // Fetch booking stats and real-time data when component mounts
  useEffect(() => {
    const fetchDashboardData = () => {
      if (agent) {
        console.log("Fetching dashboard data for agent:", agent.id);
        
        // Fetch booking stats
        dispatch(fetchBookingStatsAsync(agent.id))
          .then((action) => {
            if (fetchBookingStatsAsync.fulfilled.match(action)) {
              const stats = action.payload;
              if (stats) {
                setTotalRevenue(stats.revenue);
                console.log("Booking stats loaded:", stats);
              }
              setRevenueLoading(false);
            }
          })
          .catch((error) => {
            console.error("Error fetching booking stats:", error);
            setRevenueLoading(false);
          });

        // Fetch bookings for package performance calculation
        dispatch(fetchBookingsAsync({ 
          agentId: agent.id, 
          reset: true,
        })).then(result => {
          console.log("Bookings loaded for performance calculation");
        });
        
        // Fetch packages directly
        loadAgentPackages();
        fetchRevenueStats();
        fetchClientCount();
      }
    };
    
    fetchDashboardData();
    
    // Set up visibility listener to refresh data when tab becomes active
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("Tab became visible, refreshing dashboard data");
        fetchDashboardData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [agent, dispatch]);

  // Generate real package performance data when packages and bookings are available
  useEffect(() => {
    if (!packages?.length) {
      console.log(`Missing data for package performance: Packages: ${packages?.length}`);
      return;
    }
    
    console.log("Generating package performance data from", packages.length, "packages");
    console.log("Packages detail:", packages.map(p => ({ id: p.id, name: p.name, isFeatured: p.isFeatured, price: p.price })));
    
    // Create a map to organize package performance data
    interface PackageStat {
      id: string;
      name: string;
      bookingCount: number;
      revenue: number;
      image: string | null;
      isFeatured: boolean;
    }
    
    const packageStats: Record<string, PackageStat> = {};
    
    // Initialize with all packages, using the salesCount field
    packages.forEach(pkg => {
      console.log(`Package ${pkg.name} has salesCount: ${pkg.salesCount || 0}, featured: ${pkg.isFeatured}`);
      packageStats[pkg.id] = {
        id: pkg.id,
        name: pkg.name,
        bookingCount: pkg.salesCount || 0, // Use the salesCount field from the package
        revenue: (pkg.salesCount || 0) * pkg.price, // Calculate revenue based on sales count
        image: pkg.image || null,
        isFeatured: pkg.isFeatured || false,
      };
    });
    
    // If we have bookings available, we can use them to refine revenue calculations
    // (in case the price changed after some sales)
    if (bookings?.length) {
      console.log("Using", bookings.length, "bookings to refine revenue calculations");
      
      // Update revenue with booking data while preserving the salesCount
      bookings.forEach(booking => {
        let packageIdToUse = booking.packageId;
        
        // Check if package exists in our list
        if (!packageStats[packageIdToUse]) {
          // Try to find the package by name matching
          const packageName = booking.packageName;
          if (packageName) {
            const matchingPackage = packages.find(p => 
              p.name.toLowerCase() === packageName.toLowerCase()
            );
            if (matchingPackage) {
              console.log("Found package by name instead of ID:", matchingPackage.name);
              packageIdToUse = matchingPackage.id;
            } else {
              console.log("Package not found by ID or name:", packageIdToUse, packageName);
              return;
            }
          } else {
            console.log("Booking has no package ID or name:", booking.id);
            return;
          }
        }
        
        // Update revenue based on actual booking prices
        packageStats[packageIdToUse].revenue += booking.price || 0;
      });
    }
    
    // Convert to array and sort by revenue
    const sortedPackages = Object.values(packageStats)
      .filter(pkg => pkg.name && pkg.id) // Make sure we have valid packages
      .sort((a, b) => b.revenue - a.revenue);
    
    console.log("All sorted packages:", sortedPackages.map(p => `${p.name} (${p.bookingCount} bookings, $${p.revenue}, featured: ${p.isFeatured})`));
    
    // Take top packages or all if we have fewer
    const topPackages = sortedPackages.slice(0, Math.min(5, sortedPackages.length));
    
    // Format for display
    const packageData = topPackages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      bookings: pkg.bookingCount,
      revenue: pkg.revenue,
      growth: Math.floor(Math.random() * 30) - 10, // Placeholder for growth calculation
      image: pkg.image,
    }));
    
    console.log("Top packages selected for display:", packageData.map(p => p.name));
    
    // Use dummy data if no real package data is available
    if (packageData.length === 0) {
      setPackagePerformanceData([
        {
          id: "1",
          name: "Luxury Beach Resort",
          bookings: 12,
          revenue: 24000,
          growth: 18,
          image: "https://images.unsplash.com/photo-1540541338287-41700207dee6?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8NXx8YmVhY2glMjByZXNvcnR8ZW58MHx8MHx8&w=100&q=80",
        },
        // Add more dummy data if needed
      ]);
    } else {
      setPackagePerformanceData(packageData);
    }
    
  }, [packages, bookings]);

  // Generate data for additional components and charts
  useEffect(() => {
    // Get real months for chart labels - last 6 months
    const lastMonths = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toLocaleString('default', { month: 'short' });
    }).reverse();

    // Revenue chart - use real data from bookingStats
    setRevenueData({
      labels: lastMonths,
      datasets: [
        {
          label: "Revenue",
          data: [0, 0, 0, 0, 0, totalRevenue || 0],
          fill: true,
          backgroundColor: colors.primary.light,
          borderColor: colors.primary.main,
          tension: 0.4,
        },
        {
          label: "Bookings",
          data: [0, 0, 0, 0, 0, bookingStats?.total || 0],
          fill: false,
          borderColor: colors.secondary.main,
          borderDash: [5, 5],
          tension: 0.4,
        },
      ],
    });

    // Booking status distribution - use real data
    setBookingStatusData({
      labels: ["Confirmed", "Pending", "Cancelled"],
      datasets: [
        {
          data: [
            bookingStats?.confirmed || 0,
            bookingStats?.pending || 0,
            bookingStats?.cancelled || 0,
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

    // Monthly bookings data - use real data if available
    setMonthlyBookingsData({
      labels: lastMonths,
      datasets: [
        {
          label: "Bookings",
          data: [0, 0, 0, 0, 0, bookingStats?.bookingsMonth || 0],
          backgroundColor: colors.secondary.main,
          borderRadius: 4,
        },
      ],
    });

    // Get real upcoming bookings if available
    if (bookings && bookings.length > 0) {
      console.log("Creating upcoming bookings from", bookings.length, "bookings");
      
      // Filter to only include future bookings
      const futureBookings = bookings
        .filter((booking) => {
          const startDate = new Date(booking.startDate);
          return startDate > new Date();
        })
        .sort((a, b) => {
          const dateA = new Date(a.startDate);
          const dateB = new Date(b.startDate);
          return dateA.getTime() - dateB.getTime();
        })
        .slice(0, 3); // Get the next 3 bookings

      const upcomingData = futureBookings.map((booking) => ({
        id: booking.id,
        clientName: booking.clientName,
        packageName: booking.packageName,
        startDate: new Date(booking.startDate),
        endDate: new Date(booking.endDate),
        status: booking.status,
      }));

      setUpcomingBookingsData(upcomingData);
      console.log("Upcoming bookings data created:", upcomingData.length, "items");
    }

    // Real recent bookings from Redux state
    if (bookings && bookings.length > 0) {
      console.log("Creating recent bookings list");
      
      // Get the 5 most recent bookings
      const recentBookingsData = bookings
        .slice(0, 5)
        .map((booking) => ({
          id: booking.id,
          client: booking.clientName,
          package: booking.packageName,
          date: new Date(booking.createdAt instanceof Date ? booking.createdAt : new Date()).toISOString().split('T')[0],
          amount: `$${booking.price.toLocaleString()}`,
          status: booking.status.charAt(0).toUpperCase() + booking.status.slice(1), // Capitalize first letter
        }));

      setRecentBookings(recentBookingsData);
      console.log("Recent bookings list created with", recentBookingsData.length, "bookings");
    }

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
          value: revenueLoading
            ? "Loading..."
            : `$${(totalRevenue + (bookingStats?.pendingRevenue || 0)).toLocaleString()}`,
          prevValue: "$11,300",
          change: statsDelta.revenue,
          changeType: statsDelta.revenueDelta as "increase" | "decrease",
          icon: CurrencyDollarIcon,
          color: "bg-cyan-500",
        },
        {
          name: "Packages",
          value: packagesLoading ? "Loading..." : packageCount.toString(),
          prevValue: "26",
          change: statsDelta.packages,
          changeType: statsDelta.packagesDelta as "increase" | "decrease",
          icon: ShoppingBagIcon,
          color: "bg-indigo-500",
        },
        {
          name: "Bookings",
          value: bookingStats ? bookingStats.total.toString() : "0",
          prevValue: "35",
          change: statsDelta.bookings,
          changeType: statsDelta.bookingsDelta as "increase" | "decrease",
          icon: CalendarIcon,
          color: "bg-purple-500",
        },
        {
          name: "Clients",
          value: clientsLoading ? "Loading..." : clientCount.toString(),
          prevValue: "39",
          change: statsDelta.clients,
          changeType: statsDelta.clientsDelta as "increase" | "decrease",
          icon: UserGroupIcon,
          color: "bg-pink-500",
        },
      ]);

      setLoading(false);
    }, 1000);
  }, [
    bookingStats,
    packages,
    bookings,
    clientCount,
    clientsLoading,
    totalRevenue,
    revenueLoading,
    packageCount,
    packagesLoading,
  ]);

  // Directly load packages for display - this is a backup in case Redux isn't working
  useEffect(() => {
    const loadPackagesDirectly = async () => {
      if (!agent) return;
      
      try {
        console.log("Loading packages directly from API");
        setPackagesLoading(true);
        
        // Load packages directly
        const result = await getAgentPackages(agent.id);
        console.log(`API returned ${result.packages.length} packages`, result.packages);
        
        // Create package performance data directly
        if (result.packages.length > 0) {
          const directPackageData = result.packages
            .slice(0, 5)
            .map(pkg => ({
              id: pkg.id,
              name: pkg.name,
              bookings: 0,
              revenue: pkg.price || 0,
              growth: 0,
              image: pkg.image || '',
            }));
            
          console.log("Setting package data directly from API:", directPackageData);
          setPackagePerformanceData(directPackageData);
          setPackageCount(result.packages.length);
        } else {
          console.log("No packages found via direct API call");
        }
      } catch (error) {
        console.error("Error loading packages directly:", error);
      } finally {
        setPackagesLoading(false);
      }
    };
    
    if (!packagePerformanceData.length) {
      loadPackagesDirectly();
    }
  }, [agent, packagePerformanceData.length]);

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
          totalRevenue={totalRevenue}
          avgBookingValue={
            bookingStats && bookingStats.total > 0
              ? bookingStats.revenue / bookingStats.total
              : 0
          }
          topPackageRevenue={
            revenueStats?.topPackageRevenue?.revenue || 
            (packagePerformanceData.length > 0 ? packagePerformanceData[0].revenue : 0)
          }
          revenueGrowth={
            revenueStats?.monthlyRevenue?.percentChange || 
            (bookingStats?.revenueMonth && bookingStats.revenueMonth > 0 ? 15 : 0)
          }
          loading={loading || loadingStats || loadingRevenue}
        />

        <PackagePerformance
          packages={packagePerformanceData}
          loading={loading || packagesLoading}
          timeFrame="All Time"
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
