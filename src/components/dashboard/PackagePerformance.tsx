import React from "react";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/solid";

type PackageData = {
  id: string;
  name: string;
  bookings: number;
  revenue: number;
  growth: number;
  image?: string;
};

type PackagePerformanceProps = {
  packages: PackageData[];
  timeFrame?: string;
  loading?: boolean;
};

const PackagePerformance: React.FC<PackagePerformanceProps> = ({
  packages,
  timeFrame = "This Month",
  loading = false,
}) => {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 animate-pulse">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 h-6 bg-gray-200 rounded w-1/3"></h3>
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex items-center p-2">
              <div className="h-10 w-10 bg-gray-200 rounded-lg mr-4"></div>
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
              <div className="h-6 w-20 bg-gray-200 rounded"></div>
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
          Top Performing Packages
        </h3>
        <span className="text-sm text-gray-500">{timeFrame}</span>
      </div>

      <div className="space-y-3">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="h-12 w-12 rounded-lg bg-gray-200 overflow-hidden mr-4 flex-shrink-0">
              {pkg.image ? (
                <img
                  src={pkg.image}
                  alt={pkg.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-cyan-500 to-cyan-600 text-white font-bold text-sm">
                  {pkg.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {pkg.name}
              </h4>
              <div className="flex items-center text-xs text-gray-500">
                <span className="mr-2">{pkg.bookings} bookings</span>
                <span>{formatCurrency(pkg.revenue)}</span>
              </div>
            </div>

            <div
              className={`flex items-center text-sm font-medium ${
                pkg.growth >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {pkg.growth >= 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
              )}
              {pkg.growth >= 0 ? "+" : ""}
              {pkg.growth}%
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <a
          href="/packages"
          className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
        >
          View all packages
        </a>
      </div>
    </div>
  );
};

export default PackagePerformance;
