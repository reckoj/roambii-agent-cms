import React, { useState } from "react";
import { BookingProgress, ProgressStage } from "@/types/booking";
import Modal from "@/components/shared/Modal";
import { CheckCircleIcon, ClockIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface ProgressUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress?: BookingProgress;
  onUpdateProgress: (stageId: number, completed: boolean, notes?: string) => Promise<void>;
  loading?: boolean;
}

const ProgressUpdateModal: React.FC<ProgressUpdateModalProps> = ({
  isOpen,
  onClose,
  progress,
  onUpdateProgress,
  loading = false,
}) => {
  const [selectedStageId, setSelectedStageId] = useState<number>(0);
  const [completed, setCompleted] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleStageSelect = (stage: ProgressStage) => {
    setSelectedStageId(stage.id);
    setCompleted(stage.completed);
    setNotes(stage.notes || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      await onUpdateProgress(selectedStageId, completed, notes.trim() || undefined);
      onClose();
      // Reset form
      setSelectedStageId(0);
      setCompleted(false);
      setNotes("");
    } catch (error) {
      console.error("Error updating progress:", error);
      // You could add toast notification here
    } finally {
      setSubmitting(false);
    }
  };

  if (!progress) {
    return null;
  }

  const selectedStage = progress.stages.find(stage => stage.id === selectedStageId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Booking Progress">
      <div className="max-w-2xl">
        {/* Stage Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Select Stage to Update
          </h3>
          <div className="space-y-3">
            {progress.stages.map((stage) => (
              <div
                key={stage.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedStageId === stage.id
                    ? "border-cyan-500 bg-cyan-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => handleStageSelect(stage)}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {stage.completed ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : progress.currentStage === stage.id ? (
                      <ClockIcon className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300 bg-white"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-sm font-medium ${
                          stage.completed
                            ? "text-green-700"
                            : progress.currentStage === stage.id
                            ? "text-yellow-700"
                            : "text-gray-700"
                        }`}
                      >
                        {stage.name}
                      </p>
                      {stage.completedAt && (
                        <span className="text-xs text-gray-500">
                          {new Date(stage.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {stage.notes && (
                      <p className="text-xs text-gray-600 mt-1">{stage.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Update Form */}
        {selectedStage && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-2">
                Update: {selectedStage.name}
              </h4>
            </div>

            {/* Completion Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="completed"
                    value="false"
                    checked={!completed}
                    onChange={() => setCompleted(false)}
                    className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">In Progress</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="completed"
                    value="true"
                    checked={completed}
                    onChange={() => setCompleted(true)}
                    className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Completed</span>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
                placeholder="Add any notes about this stage..."
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  "Update Progress"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default ProgressUpdateModal; 