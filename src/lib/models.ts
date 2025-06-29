// lib/models.ts

export interface Itinerary {
  id: string;
  title: string;
  destinations: string[] | string;
  startDate: Date | string;
  endDate: Date | string;
  userId: string;
  isSelling?: boolean;
  itinerary_price?: number;
  sharedWith?: string[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface DayPlan {
  id: string;
  itineraryId: string;
  day: number;
  date: Date | string;
  title?: string;
  description?: string;
  activities: Activity[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Activity {
  id: string;
  dayPlanId: string;
  title: string;
  time: string; // in "HH:MM" format
  type: "transport" | "accommodation" | "activity" | "food";
  notes?: string;
  location?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  _delete?: boolean; // Special flag for deletion operations
}

export interface ItineraryWithDetails {
  itinerary: Itinerary;
  dayPlans: (DayPlan & { activities: Activity[] })[];
}
