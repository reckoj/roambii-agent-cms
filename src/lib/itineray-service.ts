// lib/itinerary-service.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  arrayUnion,
  arrayRemove,
  Timestamp,
  addDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import {
  Itinerary,
  DayPlan,
  Activity,
  ItineraryWithDetails,
} from "@/lib/models";

// Collection names
const COLLECTIONS = {
  ITINERARIES: "itineraries",
  DAY_PLANS: "day_plans",
  ACTIVITIES: "activities",
};

/**
 * Helper function to safely convert Firestore Timestamp to Date
 */
const convertTimestampToDate = (value: Timestamp | Date | any): Date => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
};

/**
 * Create a new itinerary with optional day plans and activities
 */
export const createItinerary = async (
  itinerary: Omit<Itinerary, "id" | "createdAt" | "updatedAt">,
  dayPlans?: Omit<
    DayPlan,
    "id" | "itineraryId" | "createdAt" | "updatedAt" | "activities"
  >[],
  activities?: {
    [dayPlanIndex: number]: Omit<
      Activity,
      "id" | "dayPlanId" | "createdAt" | "updatedAt"
    >[];
  }
): Promise<Itinerary | null> => {
  try {
    // 1. Create the itinerary document
    const itineraryRef = doc(collection(db, COLLECTIONS.ITINERARIES));

    const itineraryData: Omit<Itinerary, "id"> = {
      ...itinerary,
      startDate: new Date(itinerary.startDate.toString()),
      endDate: new Date(itinerary.endDate.toString()),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(itineraryRef, itineraryData);

    const createdItinerary: Itinerary = {
      id: itineraryRef.id,
      ...itineraryData,
    };

    // 2. Create day plans if provided
    if (dayPlans && dayPlans.length > 0) {
      for (let i = 0; i < dayPlans.length; i++) {
        const dayPlan = dayPlans[i];
        const dayPlanRef = doc(collection(db, COLLECTIONS.DAY_PLANS));

        const dayPlanData: Omit<DayPlan, "id" | "activities"> = {
          ...dayPlan,
          itineraryId: itineraryRef.id,
          date: new Date(dayPlan.date.toString()),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await setDoc(dayPlanRef, dayPlanData);

        // 3. Create activities for this day plan if provided
        if (activities && activities[i] && activities[i].length > 0) {
          for (const activity of activities[i]) {
            const activityRef = doc(collection(db, COLLECTIONS.ACTIVITIES));

            const activityData: Omit<Activity, "id"> = {
              ...activity,
              dayPlanId: dayPlanRef.id,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            await setDoc(activityRef, activityData);
          }
        }
      }
    }

    return createdItinerary;
  } catch (error) {
    console.error("Error creating itinerary:", error);
    return null;
  }
};

/**
 * Get itinerary by ID with all day plans and activities
 */
export const getItineraryWithDetails = async (
  itineraryId: string
): Promise<ItineraryWithDetails | null> => {
  try {
    // 1. Fetch the itinerary
    const itineraryRef = doc(db, COLLECTIONS.ITINERARIES, itineraryId);
    const itineraryDoc = await getDoc(itineraryRef);

    if (!itineraryDoc.exists()) {
      return null;
    }

    const itineraryData = itineraryDoc.data() as Omit<Itinerary, "id">;

    const itinerary: Itinerary = {
      id: itineraryDoc.id,
      ...itineraryData,
      startDate: convertTimestampToDate(itineraryData.startDate),
      endDate: convertTimestampToDate(itineraryData.endDate),
      createdAt: convertTimestampToDate(itineraryData.createdAt),
      updatedAt: convertTimestampToDate(itineraryData.updatedAt),
    };

    // 2. Fetch day plans for this itinerary
    const dayPlansRef = collection(db, COLLECTIONS.DAY_PLANS);
    const dayPlansQuery = query(
      dayPlansRef,
      where("itineraryId", "==", itineraryId),
      orderBy("day", "asc")
    );

    const dayPlansSnapshot = await getDocs(dayPlansQuery);
    const dayPlansWithActivities: (DayPlan & { activities: Activity[] })[] = [];

    // 3. For each day plan, fetch its activities
    for (const dayPlanDoc of dayPlansSnapshot.docs) {
      const dayPlanData = dayPlanDoc.data() as Omit<
        DayPlan,
        "id" | "activities"
      >;

      const dayPlan: DayPlan = {
        id: dayPlanDoc.id,
        ...dayPlanData,
        date: convertTimestampToDate(dayPlanData.date),
        createdAt: dayPlanData.createdAt
          ? convertTimestampToDate(dayPlanData.createdAt)
          : undefined,
        updatedAt: dayPlanData.updatedAt
          ? convertTimestampToDate(dayPlanData.updatedAt)
          : undefined,
        activities: [],
      };

      // Fetch activities for this day plan
      const activitiesRef = collection(db, COLLECTIONS.ACTIVITIES);
      const activitiesQuery = query(
        activitiesRef,
        where("dayPlanId", "==", dayPlanDoc.id),
        orderBy("time", "asc")
      );

      const activitiesSnapshot = await getDocs(activitiesQuery);
      const activities: Activity[] = [];

      activitiesSnapshot.forEach((activityDoc) => {
        const activityData = activityDoc.data() as Omit<Activity, "id">;

        activities.push({
          id: activityDoc.id,
          ...activityData,
          createdAt: activityData.createdAt
            ? convertTimestampToDate(activityData.createdAt)
            : undefined,
          updatedAt: activityData.updatedAt
            ? convertTimestampToDate(activityData.updatedAt)
            : undefined,
        });
      });

      dayPlansWithActivities.push({
        ...dayPlan,
        activities,
      });
    }

    return {
      itinerary,
      dayPlans: dayPlansWithActivities,
    };
  } catch (error) {
    console.error("Error getting itinerary with details:", error);
    return null;
  }
};

/**
 * Get all itineraries for a user
 */
export const getUserItineraries = async (
  userId: string
): Promise<Itinerary[]> => {
  try {
    if (!userId) {
      console.warn("getUserItineraries called with no userId");
      return [];
    }

    const itinerariesRef = collection(db, COLLECTIONS.ITINERARIES);

    // Query for itineraries owned by user and shared with user
    const userItinerariesQuery = query(
      itinerariesRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const sharedItinerariesQuery = query(
      itinerariesRef,
      where("sharedWith", "array-contains", userId),
      orderBy("createdAt", "desc")
    );

    // Execute both queries
    const [userSnapshot, sharedSnapshot] = await Promise.all([
      getDocs(userItinerariesQuery),
      getDocs(sharedItinerariesQuery),
    ]);

    const itineraries: Itinerary[] = [];
    const processedIds = new Set<string>();

    // Process user's own itineraries
    userSnapshot.forEach((doc) => {
      try {
        const itineraryData = doc.data() as Omit<Itinerary, "id">;
        processedIds.add(doc.id);

        itineraries.push({
          id: doc.id,
          ...itineraryData,
          startDate: convertTimestampToDate(itineraryData.startDate),
          endDate: convertTimestampToDate(itineraryData.endDate),
          createdAt: itineraryData.createdAt
            ? convertTimestampToDate(itineraryData.createdAt)
            : undefined,
          updatedAt: itineraryData.updatedAt
            ? convertTimestampToDate(itineraryData.updatedAt)
            : undefined,
        });
      } catch (error) {
        console.error(`Error processing itinerary ${doc.id}:`, error);
      }
    });

    // Process shared itineraries (avoiding duplicates)
    sharedSnapshot.forEach((doc) => {
      try {
        if (!processedIds.has(doc.id)) {
          const itineraryData = doc.data() as Omit<Itinerary, "id">;

          itineraries.push({
            id: doc.id,
            ...itineraryData,
            startDate: convertTimestampToDate(itineraryData.startDate),
            endDate: convertTimestampToDate(itineraryData.endDate),
            createdAt: itineraryData.createdAt
              ? convertTimestampToDate(itineraryData.createdAt)
              : undefined,
            updatedAt: itineraryData.updatedAt
              ? convertTimestampToDate(itineraryData.updatedAt)
              : undefined,
          });
        }
      } catch (error) {
        console.error(`Error processing shared itinerary ${doc.id}:`, error);
      }
    });

    return itineraries;
  } catch (error) {
    console.error("Error getting user itineraries:", error);
    return [];
  }
};

/**
 * Update an existing itinerary
 */
export const updateItinerary = async (
  itineraryId: string,
  updates: Partial<Omit<Itinerary, "id" | "createdAt" | "updatedAt">>
): Promise<Itinerary | null> => {
  try {
    const itineraryRef = doc(db, COLLECTIONS.ITINERARIES, itineraryId);
    const itineraryDoc = await getDoc(itineraryRef);

    if (!itineraryDoc.exists()) {
      throw new Error("Itinerary not found");
    }

    const updateData: any = {
      ...updates,
      updatedAt: new Date(),
    };

    // Convert date strings to Date objects if provided
    if (updates.startDate) {
      updateData.startDate = new Date(updates.startDate.toString());
    }

    if (updates.endDate) {
      updateData.endDate = new Date(updates.endDate.toString());
    }

    await updateDoc(itineraryRef, updateData);

    // Fetch the updated itinerary
    const updatedDoc = await getDoc(itineraryRef);
    const itineraryData = updatedDoc.data() as Omit<Itinerary, "id">;

    return {
      id: itineraryId,
      ...itineraryData,
      startDate: convertTimestampToDate(itineraryData.startDate),
      endDate: convertTimestampToDate(itineraryData.endDate),
      createdAt: convertTimestampToDate(itineraryData.createdAt),
      updatedAt: convertTimestampToDate(itineraryData.updatedAt),
    };
  } catch (error) {
    console.error("Error updating itinerary:", error);
    return null;
  }
};

/**
 * Save (create or update) an activity
 */
export const saveActivity = async (
  activity: Activity
): Promise<Activity | null> => {
  try {
    // If activity has an ID, update it
    if (activity.id) {
      const activityRef = doc(db, COLLECTIONS.ACTIVITIES, activity.id);
      const activityDoc = await getDoc(activityRef);

      if (!activityDoc.exists()) {
        throw new Error("Activity not found");
      }

      const { id, ...activityData } = activity;

      await updateDoc(activityRef, {
        ...activityData,
        updatedAt: new Date(),
      });

      // Fetch the updated activity
      const updatedDoc = await getDoc(activityRef);
      const updatedData = updatedDoc.data() as Omit<Activity, "id">;

      return {
        id: activity.id,
        ...updatedData,
        createdAt: updatedData.createdAt
          ? convertTimestampToDate(updatedData.createdAt)
          : undefined,
        updatedAt: updatedData.updatedAt
          ? convertTimestampToDate(updatedData.updatedAt)
          : undefined,
      };
    }
    // Otherwise, create a new activity
    else {
      const activityRef = collection(db, COLLECTIONS.ACTIVITIES);

      const newActivity: Omit<Activity, "id"> = {
        ...activity,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(activityRef, newActivity);

      return {
        id: docRef.id,
        ...newActivity,
      };
    }
  } catch (error) {
    console.error("Error saving activity:", error);
    return null;
  }
};

/**
 * Delete an activity
 */
export const deleteActivity = async (activityId: string): Promise<boolean> => {
  try {
    const activityRef = doc(db, COLLECTIONS.ACTIVITIES, activityId);
    await deleteDoc(activityRef);
    return true;
  } catch (error) {
    console.error("Error deleting activity:", error);
    return false;
  }
};

/**
 * Delete an itinerary and all related day plans and activities
 */
export const deleteItinerary = async (
  itineraryId: string
): Promise<boolean> => {
  try {
    // 1. Get all day plans for this itinerary
    const dayPlansRef = collection(db, COLLECTIONS.DAY_PLANS);
    const dayPlansQuery = query(
      dayPlansRef,
      where("itineraryId", "==", itineraryId)
    );

    const dayPlansSnapshot = await getDocs(dayPlansQuery);

    // 2. For each day plan, get and delete its activities
    for (const dayPlanDoc of dayPlansSnapshot.docs) {
      const activitiesRef = collection(db, COLLECTIONS.ACTIVITIES);
      const activitiesQuery = query(
        activitiesRef,
        where("dayPlanId", "==", dayPlanDoc.id)
      );

      const activitiesSnapshot = await getDocs(activitiesQuery);

      // Delete each activity
      const activityDeletePromises = activitiesSnapshot.docs.map(
        (activityDoc) =>
          deleteDoc(doc(db, COLLECTIONS.ACTIVITIES, activityDoc.id))
      );

      await Promise.all(activityDeletePromises);

      // Delete the day plan
      await deleteDoc(doc(db, COLLECTIONS.DAY_PLANS, dayPlanDoc.id));
    }

    // 3. Finally, delete the itinerary
    await deleteDoc(doc(db, COLLECTIONS.ITINERARIES, itineraryId));

    return true;
  } catch (error) {
    console.error("Error deleting itinerary:", error);
    return false;
  }
};

/**
 * Share an itinerary with another user
 */
export const shareItinerary = async (
  itineraryId: string,
  userIdToShareWith: string
): Promise<Itinerary | null> => {
  try {
    const itineraryRef = doc(db, COLLECTIONS.ITINERARIES, itineraryId);

    // Add user ID to sharedWith array using arrayUnion (which handles duplicates)
    await updateDoc(itineraryRef, {
      sharedWith: arrayUnion(userIdToShareWith),
      updatedAt: new Date(),
    });

    // Fetch and return the updated itinerary
    const itineraryDoc = await getDoc(itineraryRef);

    if (!itineraryDoc.exists()) {
      throw new Error("Itinerary not found");
    }

    const itineraryData = itineraryDoc.data() as Omit<Itinerary, "id">;

    return {
      id: itineraryId,
      ...itineraryData,
      startDate: convertTimestampToDate(itineraryData.startDate),
      endDate: convertTimestampToDate(itineraryData.endDate),
      createdAt: convertTimestampToDate(itineraryData.createdAt),
      updatedAt: convertTimestampToDate(itineraryData.updatedAt),
    };
  } catch (error) {
    console.error("Error sharing itinerary:", error);
    return null;
  }
};

/**
 * Remove a user's access to an itinerary
 */
export const removeItineraryAccess = async (
  itineraryId: string,
  userIdToRemove: string
): Promise<Itinerary | null> => {
  try {
    const itineraryRef = doc(db, COLLECTIONS.ITINERARIES, itineraryId);

    // Remove user ID from sharedWith array
    await updateDoc(itineraryRef, {
      sharedWith: arrayRemove(userIdToRemove),
      updatedAt: new Date(),
    });

    // Fetch and return the updated itinerary
    const itineraryDoc = await getDoc(itineraryRef);

    if (!itineraryDoc.exists()) {
      throw new Error("Itinerary not found");
    }

    const itineraryData = itineraryDoc.data() as Omit<Itinerary, "id">;

    return {
      id: itineraryId,
      ...itineraryData,
      startDate: convertTimestampToDate(itineraryData.startDate),
      endDate: convertTimestampToDate(itineraryData.endDate),
      createdAt: convertTimestampToDate(itineraryData.createdAt),
      updatedAt: convertTimestampToDate(itineraryData.updatedAt),
    };
  } catch (error) {
    console.error("Error removing itinerary access:", error);
    return null;
  }
};
