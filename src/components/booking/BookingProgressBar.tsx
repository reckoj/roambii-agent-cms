import React from "react";
import { BookingProgress } from "@/types/booking";
import {
  calculateProgressPercentage,
  createInitialProgress,
} from "@/lib/progress-service";
import { CheckCircleIcon, ClockIcon } from "@heroicons/react/24/solid";

interface BookingProgressBarProps {
  progress?: BookingProgress;
  showDetails?: boolean;
  onStageClick?: (stageId: number) => void;
  canUpdate?: boolean;
  agentId?: string; // Add agentId to create initial progress if needed
}

const BookingProgressBar: React.FC<BookingProgressBarProps> = ({
  progress,
  showDetails = false,
  onStageClick,
  canUpdate = false,
  agentId,
}) => {
  // If no progress data exists, create initial progress or show fallback
  const currentProgress =
    progress || (agentId ? createInitialProgress(agentId) : null);

  console.log("BookingProgressBar Debug:", {
    progress,
    agentId,
    currentProgress,
    canUpdate,
    showDetails
  });

  if (!currentProgress) {
    // Show a fallback message when no progress data is available
    return (
      <div className="w-full">
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">
            No progress tracking available
          </p>
        </div>
      </div>
    );
  }

  const percentage = calculateProgressPercentage(currentProgress);

  const handleStageClick = (stageId: number, isCompleted: boolean) => {
    if (!canUpdate || !onStageClick) return;

    // Only allow advancing to the next incomplete stage
    if (!isCompleted && stageId === currentProgress.currentStage) {
      onStageClick(stageId);
    }
  };

  if (showDetails) {
    // Vertical detailed view for booking detail pages
    return (
      <div className="w-full">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Booking Progress
            </span>
            <span className="text-sm text-gray-500">{percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </div>

        {/* Vertical Progress Steps */}
        <div className="space-y-4">
          {currentProgress.stages.map((stage, index) => {
            const shouldShowButton = canUpdate && !stage.completed && stage.id === currentProgress.currentStage;
            console.log(`Stage ${stage.id} (${stage.name}):`, {
              completed: stage.completed,
              isCurrentStage: stage.id === currentProgress.currentStage,
              currentStage: currentProgress.currentStage,
              canUpdate,
              shouldShowButton
            });
            
            return (
            <div key={stage.id} className="relative">
              {/* Connecting Line */}
              {index < currentProgress.stages.length - 1 && (
                <div className="absolute left-2.5 top-6 w-0.5 h-8 bg-gray-200"></div>
              )}

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5 relative z-10">
                  {stage.completed ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500 bg-white rounded-full" />
                  ) : currentProgress.currentStage === stage.id ? (
                    <ClockIcon className="h-5 w-5 text-yellow-500 bg-white rounded-full" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300 bg-white"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-sm font-medium ${
                        stage.completed
                          ? "text-green-700"
                          : currentProgress.currentStage === stage.id
                          ? "text-yellow-700"
                          : "text-gray-500"
                      }`}
                    >
                      {stage.name}
                    </p>
                    {stage.completedAt && (
                      <span className="text-xs text-gray-400">
                        {new Date(stage.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {stage.notes && (
                    <p className="text-xs text-gray-600 mt-1">{stage.notes}</p>
                  )}
                                     {/* Add clear button for current stage */}
                   {canUpdate &&
                     !stage.completed &&
                     stage.id === currentProgress.currentStage && (
                      <div className="mt-2">
                                               <button
                         onClick={(e) => {
                           e.stopPropagation();
                           console.log("Button clicked! Stage:", stage.id, "Completed:", stage.completed);
                           if (onStageClick) {
                             console.log("Calling onStageClick with stage:", stage.id);
                             onStageClick(stage.id);
                           } else {
                             console.log("No onStageClick handler provided");
                           }
                         }}
                         className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
                       >
                         Mark Complete
                       </button>
                      </div>
                    )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Compact horizontal view for lists and cards
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-gray-700">Progress</span>
        <span className="text-xs text-gray-500">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className="bg-gradient-to-r from-cyan-500 to-blue-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="text-xs text-gray-600 mt-1">
        {currentProgress.stages[currentProgress.currentStage]?.name ||
          "Completed"}
      </div>
    </div>
  );
};

export default BookingProgressBar;
 