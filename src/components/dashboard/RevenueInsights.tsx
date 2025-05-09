import React from "react";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/solid";
import {
  CurrencyDollarIcon,
  CalendarIcon,
  ShoppingBagIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";

type RevenueInsightsProps = {
  totalRevenue: number;
  avgBookingValue: number;
  topPackageRevenue: number;
  revenueGrowth: number;
  timeFrame?: string;
  loading?: boolean;
};

const RevenueInsights: React.FC<RevenueInsightsProps> = ({
  totalRevenue,
  avgBookingValue,
  topPackageRevenue,
  revenueGrowth,
  timeFrame = "This Month",
  loading = false,
}) => {
  // Format currency values
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const insights = [
    {
      title: "Total Revenue",
      value: formatCurrency(totalRevenue),
      icon: CurrencyDollarIcon,
      color: "bg-cyan-100 text-cyan-800",
      iconColor: "text-cyan-500",
    },
    {
      title: "Avg. Booking Value",
      value: formatCurrency(avgBookingValue),
      icon: CalendarIcon,
      color: "bg-indigo-100 text-indigo-800",
      iconColor: "text-indigo-500",
    },
    {
      title: "Top Package Revenue",
      value: formatCurrency(topPackageRevenue),
      icon: ShoppingBagIcon,
      color: "bg-purple-100 text-purple-800",
      iconColor: "text-purple-500",
    },
    {
      title: "Revenue Growth",
      value: `${revenueGrowth > 0 ? "+" : ""}${revenueGrowth}%`,
      icon: ArrowTrendingUpIcon,
      color:
        revenueGrowth >= 0
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800",
      iconColor: revenueGrowth >= 0 ? "text-green-500" : "text-red-500",
    },
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 animate-pulse">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 h-6 bg-gray-200 rounded w-1/3"></h3>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="p-4 rounded-lg">
              <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
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
          Revenue Insights
        </h3>
        <span className="text-sm text-gray-500">{timeFrame}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {insights.map((insight, index) => (
          <div key={index} className={`p-4 rounded-lg ${insight.color}`}>
            <div className="flex items-start">
              <div
                className={`p-2 rounded-md ${insight.iconColor} bg-white mr-3`}
              >
                <insight.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">{insight.title}</p>
                <p className="text-xl font-bold">{insight.value}</p>

                {insight.title === "Revenue Growth" && (
                  <div className="flex items-center mt-1">
                    {revenueGrowth >= 0 ? (
                      <ArrowUpIcon className="h-4 w-4 text-green-600 mr-1" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4 text-red-600 mr-1" />
                    )}
                    <span className="text-xs">
                      vs. previous {timeFrame.toLowerCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RevenueInsights;
