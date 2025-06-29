"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { createItineraryAsync } from "@/lib/redux/slices/itinerarySlice";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Plus,
  Minus,
  X,
  Save,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function CreateItineraryPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { agent } = useAppSelector((state) => state.auth);
  const { loading, error } = useAppSelector((state) => state.itineraries);

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(new Date().setDate(new Date().getDate() + 7))
  );
  const [destinations, setDestinations] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);

  // If not authenticated, redirect to login
  useEffect(() => {
    if (!agent) {
      router.push("/login");
    }
  }, [agent, router]);

  // Add destination field
  const addDestination = () => {
    setDestinations([...destinations, ""]);
  };

  // Remove destination field
  const removeDestination = (index: number) => {
    const newDestinations = [...destinations];
    newDestinations.splice(index, 1);
    setDestinations(newDestinations);
  };

  // Update destination at index
  const updateDestination = (index: number, value: string) => {
    const newDestinations = [...destinations];
    newDestinations[index] = value;
    setDestinations(newDestinations);
  };

  // Calculate number of days between start and end dates
  const calculateDaysBetween = (start: Date, end: Date) => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agent) {
      alert("You must be logged in to create an itinerary");
      return;
    }

    if (!title.trim()) {
      alert("Please enter an itinerary title");
      return;
    }

    // Filter out empty destinations
    const filteredDestinations = destinations.filter(
      (dest) => dest.trim() !== ""
    );
    if (filteredDestinations.length === 0) {
      alert("Please add at least one destination");
      return;
    }

    // Calculate number of days for day plans
    const numDays = calculateDaysBetween(startDate, endDate);

    try {
      setSubmitting(true);

      // Create day plans for each day
      const dayPlans = [];
      for (let i = 0; i < numDays; i++) {
        const dayDate = new Date(startDate);
        dayDate.setDate(dayDate.getDate() + i);

        dayPlans.push({
          day: i + 1,
          date: dayDate,
        });
      }

      // Create the itinerary
      const result = await dispatch(
        createItineraryAsync({
          itinerary: {
            title: title.trim(),
            destinations: filteredDestinations,
            startDate,
            endDate,
            userId: agent.id,
          },
          dayPlans,
        })
      ).unwrap();

      // Navigate to the new itinerary
      if (result) {
        router.push(`/itineraries/${result.id}`);
      }
    } catch (error) {
      console.error("Error creating itinerary:", error);
      alert("Failed to create itinerary. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-24">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/itineraries"
            className="inline-flex items-center text-teal-600 hover:text-teal-700"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Itineraries
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Create New Itinerary
          </h1>

          {error && (
            <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Itinerary Title */}
            <div className="mb-6">
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Itinerary Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="E.g., Summer Vacation in Europe"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 placeholder-gray-400 text-gray-700"
              />
            </div>

            {/* Date Range */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="startDate"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Start Date *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <DatePicker
                    selected={startDate}
                    onChange={(date: Date | null) => {
                      if (date) {
                        setStartDate(date);
                        // If end date is before new start date, update it
                        if (endDate < date) {
                          setEndDate(date);
                        }
                      }
                    }}
                    selectsStart
                    startDate={startDate}
                    endDate={endDate}
                    dateFormat="MMMM d, yyyy"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-gray-400"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="endDate"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  End Date *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <DatePicker
                    selected={endDate}
                    onChange={(date: Date | null) => date && setEndDate(date)}
                    selectsEnd
                    startDate={startDate}
                    endDate={endDate}
                    minDate={startDate}
                    dateFormat="MMMM d, yyyy"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Destinations */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destinations *
              </label>
              <div className="space-y-3">
                {destinations.map((destination, index) => (
                  <div key={index} className="flex items-center">
                    <div className="relative flex-grow">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={destination}
                        onChange={(e) =>
                          updateDestination(index, e.target.value)
                        }
                        placeholder="E.g., Paris, France"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 placeholder-gray-400 text-gray-700"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDestination(index)}
                      disabled={destinations.length === 1}
                      className="ml-2 p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed "
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addDestination}
                className="mt-3 flex items-center text-teal-600 hover:text-teal-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add another destination
              </button>
            </div>

            {/* Trip Summary */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-medium text-gray-900 mb-2">Trip Summary</h3>
              <p className="text-gray-700">
                Duration:{" "}
                <span className="font-medium">
                  {calculateDaysBetween(startDate, endDate)} days
                </span>
              </p>
              <p className="text-gray-700">
                Day Plans:{" "}
                <span className="font-medium">
                  {calculateDaysBetween(startDate, endDate)}
                </span>
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Itinerary
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
