import React from "react";
import {
  CurrencyDollarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";

interface RevenueCardProps {
  totalRevenue: number;
  previousPeriodRevenue: number;
  percentChange: number;
  period: "month" | "year";
  loading?: boolean;
}

const RevenueCard: React.FC<RevenueCardProps> = ({
  totalRevenue,
  previousPeriodRevenue,
  percentChange,
  period,
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

  // Handle percent formatting, ensuring we always have a sign and fixed decimal places
  const formatPercent = (value: number): string => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  // Determine if change is positive, negative, or neutral
  const getChangeType = (): "increase" | "decrease" | "neutral" => {
    if (percentChange > 0) return "increase";
    if (percentChange < 0) return "decrease";
    return "neutral";
  };

  const changeType = getChangeType();

  // Display content based on loading state
  if (loading) {
    return (
      <div className="bg-white overflow-hidden shadow-lg rounded-lg transition-all duration-300 hover:shadow-xl animate-pulse">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-gray-200 p-3 h-12 w-12"></div>
            <div className="ml-5 w-0 flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="mt-2 h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white overflow-hidden shadow-lg rounded-lg transition-all duration-300 hover:shadow-xl">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0 rounded-md bg-cyan-500 p-3 text-white">
            <CurrencyDollarIcon className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                Total Revenue
              </dt>
              <dd>
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(totalRevenue)}
                </div>
              </dd>
            </dl>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div
            className={`inline-flex items-baseline px-2.5 py-0.5 rounded-full text-xs font-medium ${
              changeType === "increase"
                ? "bg-green-100 text-green-800"
                : changeType === "decrease"
                ? "bg-red-100 text-red-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {changeType === "increase" ? (
              <ArrowUpIcon className="h-4 w-4 mr-1 text-green-500" />
            ) : changeType === "decrease" ? (
              <ArrowDownIcon className="h-4 w-4 mr-1 text-red-500" />
            ) : (
              <span className="h-4 w-4 mr-1">−</span>
            )}
            <span>
              {formatPercent(percentChange)} vs{" "}
              {formatCurrency(previousPeriodRevenue)}
            </span>
          </div>
          <span className="text-xs text-gray-500">This {period}</span>
        </div>
      </div>
    </div>
  );
};

export default RevenueCard;
