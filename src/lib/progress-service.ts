import { BookingProgress, ProgressStage } from "@/types/booking";

// Default progress stages for all bookings
export const DEFAULT_PROGRESS_STAGES: ProgressStage[] = [
  {
    id: 0,
    name: "Booking received",
    completed: true, // First stage is completed when booking is created
    completedAt: new Date().toISOString(),
  },
  {
    id: 1,
    name: "Agent processing",
    completed: false,
  },
  {
    id: 2,
    name: "Confirmation sent",
    completed: false,
  },
];

// Create initial progress object for new bookings
export const createInitialProgress = (agentId: string): BookingProgress => {
  const stages = DEFAULT_PROGRESS_STAGES.map(stage => {
    const newStage: ProgressStage = {
      ...stage,
    };
    
    // Only add completedAt if the stage is completed
    if (stage.completed) {
      newStage.completedAt = new Date().toISOString();
    }
    
    return newStage;
  });

  // Find the first incomplete stage to set as current
  let currentStage = 0;
  for (let i = 0; i < stages.length; i++) {
    if (!stages[i].completed) {
      currentStage = i;
      break;
    }
  }

  const progress = {
    currentStage,
    stages,
    updatedAt: new Date().toISOString(),
    updatedBy: agentId,
  };

  console.log("Created initial progress:", progress);
  return progress;
};

// Calculate progress percentage
export const calculateProgressPercentage = (progress: BookingProgress): number => {
  const completedStages = progress.stages.filter(stage => stage.completed).length;
  return Math.round((completedStages / progress.stages.length) * 100);
};

// Get current stage name
export const getCurrentStageName = (progress: BookingProgress): string => {
  if (progress.currentStage >= progress.stages.length) {
    return progress.stages[progress.stages.length - 1].name;
  }
  return progress.stages[progress.currentStage].name;
};

// Update progress stage
export const updateProgressStage = (
  progress: BookingProgress,
  stageId: number,
  completed: boolean,
  notes?: string,
  agentId?: string
): BookingProgress => {
  const updatedStages = progress.stages.map(stage => {
    if (stage.id === stageId) {
      const updatedStage: ProgressStage = {
        ...stage,
        completed,
        completedAt: completed ? new Date().toISOString() : undefined,
      };
      
      // Only add notes if it's not undefined
      if (notes !== undefined) {
        updatedStage.notes = notes;
      }
      
      return updatedStage;
    }
    return stage;
  });

  // Update current stage to the next incomplete stage
  let newCurrentStage = 0;
  for (let i = 0; i < updatedStages.length; i++) {
    if (!updatedStages[i].completed) {
      newCurrentStage = i;
      break;
    }
    newCurrentStage = i + 1; // If all stages are complete, set to last stage + 1
  }

  return {
    ...progress,
    currentStage: newCurrentStage,
    stages: updatedStages,
    updatedAt: new Date().toISOString(),
    updatedBy: agentId || progress.updatedBy,
  };
}; 