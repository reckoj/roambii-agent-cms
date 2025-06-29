"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  fetchItineraryWithDetailsAsync,
  saveActivityAsync,
  deleteItineraryAsync,
  updateItineraryAsync,
} from "@/lib/redux/slices/itinerarySlice";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  ChevronDown,
  ChevronUp,
  Edit,
  Save,
  Plus,
  Trash2,
} from "lucide-react";
import ActivityFormModal from "@/components/itinerary/ActivityFormModal";
import { Activity } from "@/lib/models";
import ActivityItem from "@/components/itinerary/ActivityItem";

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
  transport: "#3498DB",
  accommodation: "#9B59B6",
  activity: "#F39C12",
  food: "#E74C3C",
};

export default function ItineraryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  const { agent } = useAppSelector((state) => state.auth);
  const { currentItinerary, loading, error } = useAppSelector(
    (state) => state.itineraries
  );

  const [editing, setEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedIsSelling, setEditedIsSelling] = useState(false);
  const [editedItineraryPrice, setEditedItineraryPrice] = useState("");
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [selectedDayPlan, setSelectedDayPlan] = useState<any>(null);
  const [currentActivity, setCurrentActivity] =
    useState<Partial<Activity> | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const itineraryId = params?.id as string;

  useEffect(() => {
    if (itineraryId) {
      dispatch(fetchItineraryWithDetailsAsync(itineraryId));
    }
  }, [dispatch, itineraryId]);

  useEffect(() => {
    if (currentItinerary) {
      setEditedTitle(currentItinerary.itinerary.title);
      setEditedIsSelling(currentItinerary.itinerary.isSelling || false);
      setEditedItineraryPrice(currentItinerary.itinerary.itinerary_price?.toString() || "");

      // Initialize expanded state for all days
      const expanded: Record<string, boolean> = {};
      currentItinerary.dayPlans.forEach((dayPlan) => {
        expanded[dayPlan.id] = true; // Start with all days expanded
      });
      setExpandedDays(expanded);
    }
  }, [currentItinerary]);

  // Toggle day expansion
  const toggleDayExpansion = (dayId: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dayId]: !prev[dayId],
    }));
  };

  // Format date
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Save edited itinerary
  const handleSaveItinerary = async () => {
    if (!currentItinerary) return;

    if (!editedTitle.trim()) {
      alert("Itinerary title cannot be empty");
      return;
    }

    // Validate price if selling is enabled
    if (editedIsSelling) {
      if (!editedItineraryPrice.trim()) {
        alert("Please enter a price for the itinerary");
        return;
      }
      const priceValue = parseFloat(editedItineraryPrice);
      if (isNaN(priceValue) || priceValue <= 0) {
        alert("Please enter a valid price");
        return;
      }
    }

    try {
      await dispatch(
        updateItineraryAsync({
          itineraryId,
          updatedData: { 
            title: editedTitle.trim(),
            isSelling: editedIsSelling,
            itinerary_price: editedIsSelling ? parseFloat(editedItineraryPrice) : undefined,
          },
        })
      ).unwrap();

      setEditing(false);
    } catch (error) {
      console.error("Error updating itinerary:", error);
      alert("Failed to update itinerary");
    }
  };

  // Delete itinerary
  const handleDeleteItinerary = async () => {
    try {
      await dispatch(deleteItineraryAsync(itineraryId)).unwrap();
      router.push("/itineraries");
    } catch (error) {
      console.error("Error deleting itinerary:", error);
      alert("Failed to delete itinerary");
    }
  };

  // Open add activity modal
  const openAddActivityModal = (dayPlan: any) => {
    setSelectedDayPlan(dayPlan);
    setCurrentActivity(null);
    setActivityModalOpen(true);
  };

  // Open edit activity modal
  const openEditActivityModal = (activity: Activity, dayPlan: any) => {
    setSelectedDayPlan(dayPlan);
    setCurrentActivity(activity);
    setActivityModalOpen(true);
  };

  // Handle save activity from modal
  const handleSaveActivity = async (activityData: Partial<Activity>) => {
    if (!selectedDayPlan) return;

    try {
      await dispatch(
        saveActivityAsync({
          ...activityData,
          dayPlanId: selectedDayPlan.id,
        })
      );

      // Refresh itinerary data
      dispatch(fetchItineraryWithDetailsAsync(itineraryId));
      setActivityModalOpen(false);
    } catch (error) {
      console.error("Error saving activity:", error);
      alert("Failed to save activity");
    }
  };

  // Handle delete activity
  const handleDeleteActivity = async (activityId: string) => {
    try {
      // For simplicity, we can reuse saveActivityAsync with a special flag to delete
      await dispatch(
        saveActivityAsync({
          id: activityId,
          _delete: true, // Special flag for backend to handle deletion
        })
      );

      // Refresh itinerary data
      dispatch(fetchItineraryWithDetailsAsync(itineraryId));
    } catch (error) {
      console.error("Error deleting activity:", error);
      alert("Failed to delete activity");
    }
  };

  // Get sorted activities for a day plan
  const getSortedActivities = (activities: Activity[]) => {
    return [...activities].sort((a, b) => {
      return a.time.localeCompare(b.time);
    });
  };

  // Check if user is authorized to edit
  const isAuthorized = () => {
    if (!agent || !currentItinerary) return false;
    return agent.id === currentItinerary.itinerary.userId;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading itinerary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/itineraries"
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            Back to Itineraries
          </Link>
        </div>
      </div>
    );
  }

  if (!currentItinerary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Itinerary Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The itinerary you're looking for doesn't exist or has been deleted.
          </p>
          <Link
            href="/itineraries"
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            Back to Itineraries
          </Link>
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

          {isAuthorized() && (
            <div>
              {editing ? (
                <button
                  onClick={handleSaveItinerary}
                  className="flex items-center bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </button>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
              )}
            </div>
          )}
        </div>

        {/* Itinerary Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {editing ? (
            <div className="space-y-4 mb-4">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full text-2xl font-bold text-gray-900 border-b border-gray-300 focus:border-teal-500 focus:outline-none"
                placeholder="Itinerary Title"
              />
              
                              <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="relative">
                      <input
                        type="checkbox"
                        id="editIsSelling"
                        checked={editedIsSelling}
                        onChange={(e) => setEditedIsSelling(e.target.checked)}
                        className="sr-only"
                      />
                      <label
                        htmlFor="editIsSelling"
                        className={`flex items-center cursor-pointer w-11 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${
                          editedIsSelling ? 'bg-teal-500' : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                            editedIsSelling ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </label>
                    </div>
                    <span className="ml-3 text-sm font-medium text-gray-700">
                      Make this itinerary available for sale
                    </span>
                  </div>

                {editedIsSelling && (
                  <div className="ml-6">
                    <label
                      htmlFor="editItineraryPrice"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Price
                    </label>
                    <div className="relative max-w-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        id="editItineraryPrice"
                        value={editedItineraryPrice}
                        onChange={(e) => setEditedItineraryPrice(e.target.value)}
                        placeholder="200"
                        min="0"
                        step="0.01"
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 placeholder-gray-400 text-gray-700"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {currentItinerary.itinerary.title}
              </h1>
              {currentItinerary.itinerary.isSelling && (
                <div className="inline-flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  For Sale - ${currentItinerary.itinerary.itinerary_price}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center mb-3">
            <Calendar className="h-5 w-5 text-teal-500 mr-2" />
            <p className="text-gray-600">
              {formatDate(currentItinerary.itinerary.startDate)} -{" "}
              {formatDate(currentItinerary.itinerary.endDate)}
            </p>
          </div>

          {currentItinerary.itinerary.destinations && (
            <div className="flex items-start">
              <MapPin className="h-5 w-5 text-teal-500 mr-2 mt-0.5" />
              <p className="text-gray-600">
                {Array.isArray(currentItinerary.itinerary.destinations)
                  ? currentItinerary.itinerary.destinations.join(", ")
                  : currentItinerary.itinerary.destinations}
              </p>
            </div>
          )}
        </div>

        {/* Day Plans */}
        <div className="space-y-6">
          {currentItinerary.dayPlans.map((dayPlan, index) => (
            <div
              key={dayPlan.id}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              {/* Day Header */}
              <button
                onClick={() => toggleDayExpansion(dayPlan.id)}
                className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-200 focus:outline-none"
              >
                <div className="flex items-center">
                  <div className="bg-teal-500 text-white px-3 py-1 rounded-full text-sm font-medium mr-4">
                    Day {dayPlan.day}
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {formatDate(dayPlan.date)}
                  </h3>
                </div>

                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2">
                    {dayPlan.activities.length}{" "}
                    {dayPlan.activities.length === 1
                      ? "activity"
                      : "activities"}
                  </span>
                  {expandedDays[dayPlan.id] ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Activities */}
              {expandedDays[dayPlan.id] && (
                <div className="p-6">
                  {dayPlan.activities.length === 0 ? (
                    <p className="text-center text-gray-500 italic py-4">
                      No activities planned for this day
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {getSortedActivities(dayPlan.activities).map(
                        (activity) => (
                          <ActivityItem
                            key={activity.id}
                            activity={activity}
                            isAuthorized={isAuthorized()}
                            onEdit={() =>
                              openEditActivityModal(activity, dayPlan)
                            }
                            onDelete={() => handleDeleteActivity(activity.id)}
                          />
                        )
                      )}
                    </div>
                  )}

                  {/* Add Activity Button */}
                  {isAuthorized() && (
                    <button
                      onClick={() => openAddActivityModal(dayPlan)}
                      className="mt-6 flex items-center justify-center w-full py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Activity
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Delete Itinerary Button */}
        {isAuthorized() && (
          <div className="mt-8">
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Itinerary
            </button>
          </div>
        )}
      </div>

      {/* Activity Form Modal */}
      <ActivityFormModal
        isOpen={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        onSave={handleSaveActivity}
        activity={currentActivity}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Delete Itinerary
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this itinerary? This action cannot
              be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteItinerary}
                className="px-4 py-2 text-white bg-red-500 rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
