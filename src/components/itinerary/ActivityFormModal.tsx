import React, { useState, useEffect } from "react";
import { X, Clock, Bus, Utensils, Bed, Palmtree, Camera } from "lucide-react";
import { Activity } from "@/lib/models";

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

// Activity type data
const activityTypes = [
  {
    value: "transport",
    label: "Transport",
    icon: Bus,
    color: COLORS.transport,
  },
  {
    value: "accommodation",
    label: "Accommodation",
    icon: Bed,
    color: COLORS.accommodation,
  },
  {
    value: "activity",
    label: "Activity",
    icon: Palmtree,
    color: COLORS.activity,
  },
  { value: "food", label: "Food", icon: Utensils, color: COLORS.food },
];

interface ActivityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (activityData: Partial<Activity>) => void;
  activity: Partial<Activity> | null;
}

const ActivityFormModal: React.FC<ActivityFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  activity,
}) => {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("12:00");
  const [type, setType] = useState<string>("activity");
  const [notes, setNotes] = useState("");

  // Reset form when modal opens with new activity data
  useEffect(() => {
    if (activity) {
      setTitle(activity.title || "");
      setTime(activity.time || "12:00");
      setType(activity.type || "activity");
      setNotes(activity.notes || "");
    } else {
      // Default values for new activity
      setTitle("");
      setTime("12:00");
      setType("activity");
      setNotes("");
    }
  }, [activity, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("Please enter an activity title");
      return;
    }

    onSave({
      id: activity?.id, // Include id if editing
      title: title.trim(),
      time,
      type: type as "transport" | "accommodation" | "activity" | "food",
      notes: notes.trim(),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {activity?.id ? "Edit Activity" : "Add Activity"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-grow">
          <form onSubmit={handleSubmit}>
            {/* Activity Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Activity Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {activityTypes.map((activityType) => {
                  const Icon = activityType.icon;
                  const isSelected = type === activityType.value;

                  return (
                    <button
                      key={activityType.value}
                      type="button"
                      className={`
                        flex items-center px-3 py-2 rounded-lg border
                        ${
                          isSelected
                            ? `bg-${
                                activityType.value === "transport"
                                  ? "blue"
                                  : activityType.value === "accommodation"
                                  ? "purple"
                                  : activityType.value === "activity"
                                  ? "amber"
                                  : "red"
                              }-100 border-${
                                activityType.value === "transport"
                                  ? "blue"
                                  : activityType.value === "accommodation"
                                  ? "purple"
                                  : activityType.value === "activity"
                                  ? "amber"
                                  : "red"
                              }-300`
                            : "bg-white border-gray-300 hover:bg-gray-50"
                        }
                      `}
                      onClick={() => setType(activityType.value)}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center mr-2"
                        style={{ backgroundColor: activityType.color }}
                      >
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <span
                        className={`font-medium ${
                          isSelected ? "text-gray-900" : "text-gray-700"
                        }`}
                      >
                        {activityType.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time */}
            <div className="mb-4">
              <label
                htmlFor="activity-time"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Time
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Clock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="time"
                  id="activity-time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>

            {/* Title */}
            <div className="mb-4">
              <label
                htmlFor="activity-title"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Activity Title
              </label>
              <input
                type="text"
                id="activity-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter activity title"
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label
                htmlFor="activity-notes"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Notes (Optional)
              </label>
              <textarea
                id="activity-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add additional details..."
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </form>
        </div>

        <div className="border-t border-gray-200 p-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityFormModal;
