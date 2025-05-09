import React from "react";
import { Bus, Utensils, Bed, Palmtree, Camera, Trash2 } from "lucide-react";
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

// Activity type icon mapping
const activityIcons: Record<string, React.ReactNode> = {
  transport: <Bus size={16} color={COLORS.white} />,
  accommodation: <Bed size={16} color={COLORS.white} />,
  activity: <Palmtree size={16} color={COLORS.white} />,
  food: <Utensils size={16} color={COLORS.white} />,
};

// Activity type color mapping
const activityColors: Record<string, string> = {
  transport: COLORS.transport,
  accommodation: COLORS.accommodation,
  activity: COLORS.activity,
  food: COLORS.food,
};

interface ActivityItemProps {
  activity: Activity;
  isAuthorized: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const ActivityItem: React.FC<ActivityItemProps> = ({
  activity,
  isAuthorized,
  onEdit,
  onDelete,
}) => {
  // Format time for display
  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(":");
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));

      return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch (e) {
      return time;
    }
  };

  return (
    <div
      className={`flex items-start ${
        isAuthorized ? "cursor-pointer hover:bg-gray-50" : ""
      }`}
      onClick={isAuthorized ? onEdit : undefined}
    >
      {/* Time column */}
      <div className="w-16 mr-3">
        <span className="font-medium text-gray-700">
          {formatTime(activity.time)}
        </span>
      </div>

      {/* Activity type indicator */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0"
        style={{
          backgroundColor: activityColors[activity.type] || COLORS.activity,
        }}
      >
        {activityIcons[activity.type] || (
          <Camera size={16} color={COLORS.white} />
        )}
      </div>

      {/* Content column */}
      <div className="flex-grow min-w-0">
        <h4 className="text-base font-medium text-gray-900 mb-1">
          {activity.title}
        </h4>
        {activity.notes && (
          <p className="text-sm text-gray-600">{activity.notes}</p>
        )}
      </div>

      {/* Delete button */}
      {isAuthorized && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 text-gray-400 hover:text-red-500"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
};

export default ActivityItem;
