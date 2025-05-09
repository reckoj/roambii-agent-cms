"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchUserItinerariesAsync } from "@/lib/redux/slices/itinerarySlice";
import { Calendar, MapPin, Plus, ChevronRight, RefreshCw } from "lucide-react";

// Define theme colors
const COLORS = {
  primary: "#1ABC9C",
  primaryLight: "#36d6ba",
  secondary: "#D9D9D9",
  background: "#F9FAFC",
  cardBackground: "#FFFFFF",
  text: "#333333",
  textLight: "#8A8D9F",
  white: "#FFFFFF",
  divider: "#EEEEEE",
};

export default function ItinerariesPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { agent } = useAppSelector((state) => state.auth);
  const { itineraries, loading, error, lastRefreshTime } = useAppSelector(
    (state) => state.itineraries
  );

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (agent) {
      dispatch(fetchUserItinerariesAsync(agent.id));
    }
  }, [dispatch, agent]);

  // Handle manual refresh
  const handleRefresh = async () => {
    if (!agent || refreshing) return;

    setRefreshing(true);
    try {
      await dispatch(fetchUserItinerariesAsync(agent.id)).unwrap();
    } catch (error) {
      console.error("Error refreshing itineraries:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Navigate to create itinerary
  const handleCreateItinerary = () => {
    router.push("/itineraries/create");
  };

  // Format date range
  const formatDateRange = (
    startDate: string | Date,
    endDate: string | Date
  ) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startStr = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const endStr = end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return `${startStr} - ${endStr}`;
  };

  // Calculate trip duration
  const calculateDuration = (
    startDate: string | Date,
    endDate: string | Date
  ) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return `${diffDays} ${diffDays === 1 ? "day" : "days"}`;
  };

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Sign In Required
          </h2>
          <p className="text-gray-600 mb-6">
            Please sign in to view your itineraries.
          </p>
          <Link
            href="/login"
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Itineraries</h1>
            {lastRefreshTime && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {new Date(lastRefreshTime).toLocaleTimeString()}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="p-2 text-teal-600 hover:text-teal-700 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw
                className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>

            <button
              onClick={handleCreateItinerary}
              className="flex items-center bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Itinerary
            </button>
          </div>
        </div>

        {loading && !refreshing ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
            <p className="mt-4 text-gray-600">Loading itineraries...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="text-teal-600 hover:text-teal-700 font-medium"
            >
              Try Again
            </button>
          </div>
        ) : itineraries.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 rounded-full flex items-center justify-center">
              <Calendar className="h-12 w-12 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Itineraries Yet
            </h2>
            <p className="text-gray-600 mb-6">
              Create your first travel itinerary to get started
            </p>
            <button
              onClick={handleCreateItinerary}
              className="flex items-center mx-auto bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Itinerary
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {itineraries.map((itinerary) => (
              <Link
                key={itinerary.id}
                href={`/itineraries/${itinerary.id}`}
                className="block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6 relative">
                  {/* Teal gradient bar on the left */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-teal-400 to-teal-600"></div>

                  <div className="flex justify-between items-start">
                    <div className="pl-4">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {itinerary.title}
                      </h3>

                      <div className="flex items-center mb-2">
                        <Calendar className="h-4 w-4 text-teal-500 mr-2" />
                        <span className="text-gray-600">
                          {formatDateRange(
                            itinerary.startDate,
                            itinerary.endDate
                          )}
                        </span>
                      </div>

                      {itinerary.destinations && (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-teal-500 mr-2" />
                          <span className="text-gray-600">
                            {Array.isArray(itinerary.destinations)
                              ? itinerary.destinations.join(", ")
                              : itinerary.destinations}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end">
                      <div className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm font-medium mb-2">
                        {calculateDuration(
                          itinerary.startDate,
                          itinerary.endDate
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-teal-500 mt-2" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
