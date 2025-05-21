import { db } from "@/lib/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
  DocumentData,
} from "firebase/firestore";
import { Booking } from "@/types/booking";

// Define the revenue statistics interface
export interface RevenueStats {
  totalRevenue: number;
  monthlyRevenue: {
    current: number;
    previous: number;
    percentChange: number;
  };
  yearlyRevenue: {
    current: number;
    previous: number;
    percentChange: number;
  };
  avgBookingValue: number;
  topPackageRevenue: {
    packageId: string;
    packageName: string;
    revenue: number;
  } | null;
  packagesSold: number;
  packageRevenueByType: Record<string, number>;
  revenueByMonth: {
    month: string;
    revenue: number;
    bookings: number;
  }[];
}

// Define types
type PackageRevenueItem = {
  id: string;
  name: string;
  revenue: number;
  count: number;
  type: string;
};

/**
 * Get comprehensive revenue statistics for an agent
 * @param agentId The ID of the agent
 * @param months Number of months to include in monthly data (default: 6)
 */
export const getAgentRevenueStats = async (
  agentId: string,
  months: number = 6
): Promise<RevenueStats> => {
  try {
    console.log("Fetching revenue statistics for agent:", agentId);

    // Initialize default return structure
    const revenueStats: RevenueStats = {
      totalRevenue: 0,
      monthlyRevenue: {
        current: 0,
        previous: 0,
        percentChange: 0,
      },
      yearlyRevenue: {
        current: 0,
        previous: 0,
        percentChange: 0,
      },
      avgBookingValue: 0,
      topPackageRevenue: null,
      packagesSold: 0,
      packageRevenueByType: {},
      revenueByMonth: [],
    };

    // Get current date info for period calculations
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calculate date ranges for queries
    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const previousMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const currentYearStart = new Date(currentYear, 0, 1);
    const previousYearStart = new Date(currentYear - 1, 0, 1);
    const previousYearEnd = new Date(currentYear, 0, 0);

    // Start date for historical data (n months ago)
    const historicalStart = new Date(currentYear, currentMonth - months, 1);

    // Convert to Firestore timestamps
    const currentMonthTimestamp = Timestamp.fromDate(currentMonthStart);
    const previousMonthTimestamp = Timestamp.fromDate(previousMonthStart);
    const currentYearTimestamp = Timestamp.fromDate(currentYearStart);
    const previousYearTimestamp = Timestamp.fromDate(previousYearStart);
    const previousYearEndTimestamp = Timestamp.fromDate(previousYearEnd);
    const historicalTimestamp = Timestamp.fromDate(historicalStart);

    // Create a query for all agent bookings in the historical period
    const bookingsRef = collection(db, "bookings");
    const bookingsQuery = query(
      bookingsRef,
      where("agent_id", "==", agentId),
      where("created_at", ">=", historicalTimestamp),
      orderBy("created_at", "desc")
    );

    // Execute the query
    const bookingsSnapshot = await getDocs(bookingsQuery);
    console.log(
      `Found ${bookingsSnapshot.size} bookings for revenue calculation`
    );

    if (bookingsSnapshot.empty) {
      console.log("No bookings found, returning default stats");
      return revenueStats;
    }

    // Prepare data structures for analysis
    const allBookings: Booking[] = [];
    const packageRevenue: Record<string, PackageRevenueItem> = {};

    const monthlyData: Record<string, { revenue: number; bookings: number }> =
      {};
    let currentMonthRevenue = 0;
    let previousMonthRevenue = 0;
    let currentYearRevenue = 0;
    let previousYearRevenue = 0;
    let totalBookings = 0;

    // Initialize monthly data for past months
    for (let i = 0; i < months; i++) {
      const monthDate = new Date(currentYear, currentMonth - i, 1);
      const monthKey = `${monthDate.getFullYear()}-${monthDate.getMonth() + 1}`;
      monthlyData[monthKey] = { revenue: 0, bookings: 0 };
    }

    // Process each booking
    bookingsSnapshot.forEach((doc) => {
      const data = doc.data();
      const booking = convertBookingData(doc.id, data);

      // Skip cancelled bookings for revenue calculations
      if (booking.status === "cancelled") {
        return;
      }

      allBookings.push(booking);
      totalBookings++;

      // Update total revenue
      revenueStats.totalRevenue += booking.price;

      // Update package revenue tracking
      const packageKey = booking.packageId;
      if (!packageRevenue[packageKey]) {
        packageRevenue[packageKey] = {
          id: packageKey,
          name: booking.packageName,
          revenue: 0,
          count: 0,
          type: data.package_type || "Unknown", // Get package type if available
        };
      }

      packageRevenue[packageKey].revenue += booking.price;
      packageRevenue[packageKey].count += 1;

      // Update type-based revenue
      const packageType = data.package_type || "Unknown";
      if (!revenueStats.packageRevenueByType[packageType]) {
        revenueStats.packageRevenueByType[packageType] = 0;
      }
      revenueStats.packageRevenueByType[packageType] += booking.price;

      // Calculate monthly and yearly revenue
      const createdAt =
        typeof booking.createdAt === "string"
          ? new Date(booking.createdAt)
          : booking.createdAt;

      if (createdAt) {
        // Format as YYYY-MM for grouping
        const yearMonth = `${createdAt.getFullYear()}-${
          createdAt.getMonth() + 1
        }`;

        // Update monthly data
        if (!monthlyData[yearMonth]) {
          monthlyData[yearMonth] = { revenue: 0, bookings: 0 };
        }

        monthlyData[yearMonth].revenue += booking.price;
        monthlyData[yearMonth].bookings += 1;

        // Current month vs previous month
        if (createdAt >= currentMonthStart) {
          currentMonthRevenue += booking.price;
        } else if (
          createdAt >= previousMonthStart &&
          createdAt < currentMonthStart
        ) {
          previousMonthRevenue += booking.price;
        }

        // Current year vs previous year
        if (createdAt >= currentYearStart) {
          currentYearRevenue += booking.price;
        } else if (
          createdAt >= previousYearStart &&
          createdAt <= previousYearEnd
        ) {
          previousYearRevenue += booking.price;
        }
      }
    });

    // Update packagesSold count
    revenueStats.packagesSold = totalBookings;

    // Calculate average booking value
    revenueStats.avgBookingValue =
      totalBookings > 0 ? revenueStats.totalRevenue / totalBookings : 0;

    // Find top package by revenue
    let topPackage: PackageRevenueItem | null = null;
    let maxRevenue = 0;

    // Use type assertion to treat values as PackageRevenueItem[]
    const packageValues = Object.values(packageRevenue) as PackageRevenueItem[];
    
    packageValues.forEach((pkg) => {
      if (pkg.revenue > maxRevenue) {
        maxRevenue = pkg.revenue;
        topPackage = pkg;
      }
    });

    if (topPackage) {
      revenueStats.topPackageRevenue = {
        packageId: (topPackage as PackageRevenueItem).id,
        packageName: (topPackage as PackageRevenueItem).name,
        revenue: (topPackage as PackageRevenueItem).revenue,
      };
    }

    // Calculate monthly percentage change
    revenueStats.monthlyRevenue = {
      current: currentMonthRevenue,
      previous: previousMonthRevenue,
      percentChange:
        previousMonthRevenue > 0
          ? ((currentMonthRevenue - previousMonthRevenue) /
              previousMonthRevenue) *
            100
          : 0,
    };

    // Calculate yearly percentage change
    revenueStats.yearlyRevenue = {
      current: currentYearRevenue,
      previous: previousYearRevenue,
      percentChange:
        previousYearRevenue > 0
          ? ((currentYearRevenue - previousYearRevenue) / previousYearRevenue) *
            100
          : 0,
    };

    // Format monthly data for chart display
    revenueStats.revenueByMonth = Object.entries(monthlyData)
      .map(([key, data]) => {
        const [year, month] = key.split("-").map(Number);
        // Get month name (e.g., "Jan", "Feb")
        const monthName = new Date(year, month - 1, 1).toLocaleString(
          "default",
          { month: "short" }
        );
        return {
          month: monthName,
          revenue: data.revenue,
          bookings: data.bookings,
        };
      })
      .sort((a, b) => {
        // Sort from oldest to newest
        const monthOrder = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
      });

    console.log("Revenue statistics calculated successfully");
    return revenueStats;
  } catch (error) {
    console.error("Error calculating revenue statistics:", error);
    throw error;
  }
};

/**
 * Helper function to convert Firestore data to Booking object
 */
function convertBookingData(id: string, data: DocumentData): Booking {
  const startDate =
    data.start_date instanceof Timestamp
      ? data.start_date.toDate()
      : new Date(data.start_date || Date.now());

  const endDate =
    data.end_date instanceof Timestamp
      ? data.end_date.toDate()
      : new Date(data.end_date || Date.now());

  const createdAt =
    data.created_at instanceof Timestamp
      ? data.created_at.toDate()
      : new Date(data.created_at || Date.now());

  return {
    id,
    clientId: data.client_id || "",
    clientName: data.client_name || "Unknown Client",
    clientEmail: data.client_email || "",
    clientPhone: data.client_phone,
    packageId: data.package_id || "",
    packageName: data.package_name || "Unknown Package",
    agentId: data.agent_id || "",
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    price: data.price || 0,
    totalPaid: data.total_paid || 0,
    balance: data.balance || 0,
    status: data.status || "pending",
    travelers: data.travelers || 1,
    notes: data.notes,
    paymentMethod: data.payment_method,
    paymentStatus: data.payment_status || "unpaid",
    createdAt: createdAt.toISOString(),
    updatedAt:
      data.updated_at instanceof Timestamp
        ? data.updated_at.toDate().toISOString()
        : new Date(data.updated_at || Date.now()).toISOString(),
  };
}
