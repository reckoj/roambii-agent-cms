import { Client, ClientFilter } from "@/types/client";
import { db } from "@/lib/firebase/config";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  serverTimestamp,
  Timestamp,
  DocumentData,
} from "firebase/firestore";

// Collection name
const COLLECTIONS = {
  CLIENTS: "clients",
  BOOKINGS: "bookings",
};

// Safe date conversion function
const safeToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;

  try {
    // If it's a Firestore Timestamp
    if (timestamp?.toDate && typeof timestamp.toDate === "function") {
      return timestamp.toDate();
    }

    // If it's already a Date
    if (timestamp instanceof Date) {
      return timestamp;
    }

    // If it's a number or string that can be parsed
    if (typeof timestamp === "number" || typeof timestamp === "string") {
      const date = new Date(timestamp);
      // Check if valid date
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  } catch (error) {
    console.error("Error converting timestamp to date:", error);
    return null;
  }
};

// Format date helper
export const formatDate = (date: any): Date | null => {
  return safeToDate(date);
};

// Convert Firestore document to Client type
const convertToClient = (doc: DocumentData): Client => {
  const data = doc.data();
  
  const lastBookingDate = safeToDate(data.last_booking_date);
  const createdAtDate = safeToDate(data.created_at);
  const updatedAtDate = safeToDate(data.updated_at);
  
  return {
    id: doc.id,
    userId: data.user_id,
    agentId: data.agent_id,
    contactInfo: {
      name: data.contact_info?.name || "Unknown",
      email: data.contact_info?.email || "",
      phone: data.contact_info?.phone || "",
    },
    status: data.status || "active",
    totalBookings: data.total_bookings || 0,
    totalSpent: data.total_spent || 0,
    lastBookingDate: lastBookingDate || new Date(),
    notes: data.notes || "",
    preferences: data.preferences || {
      destinations: [],
      accommodationType: "",
      budgetRange: "",
      travelStyle: [],
      specialRequirements: [],
    },
    bookings: data.bookings || [],
    createdAt: createdAtDate || new Date(),
    updatedAt: updatedAtDate || new Date(),
  };
};

// Get all clients for an agent
export const getAgentClients = async (
  agentId: string,
  filterOptions: ClientFilter = {}
): Promise<Client[]> => {
  try {
    const { sortBy = "lastBookingDate", sortDirection = "desc" } = filterOptions;
    
    // Map field names to Firestore fields
    const fieldMap: Record<string, string> = {
      lastBookingDate: "last_booking_date",
      totalSpent: "total_spent",
      totalBookings: "total_bookings",
    };
    
    const sortField = fieldMap[sortBy] || "last_booking_date";
    
    let clientsQuery = query(
      collection(db, COLLECTIONS.CLIENTS),
      where("agent_id", "==", agentId),
      orderBy(sortField, sortDirection)
    );
    
    if (filterOptions.status && filterOptions.status !== "all") {
      clientsQuery = query(
        clientsQuery,
        where("status", "==", filterOptions.status)
      );
    }
    
    const snapshot = await getDocs(clientsQuery);
    const clients = snapshot.docs.map((doc) => convertToClient(doc));
    
    return clients;
  } catch (error) {
    console.error("Error getting agent clients:", error);
    throw error;
  }
};

// Get client details from bookings (alternative approach)
export const getAgentClientsFromBookings = async (
  agentId: string,
  filterOptions: ClientFilter = {}
): Promise<Client[]> => {
  try {
    // Get all bookings for this agent
    const bookingsCollection = collection(db, COLLECTIONS.BOOKINGS);
    console.log("Searching for bookings with agentId:", agentId);
    console.log("Agent ID type:", typeof agentId);
    
    // Store all found bookings
    const bookingDocs = new Map();
    
    // Try different query approaches
    // 1. Query by packageDetails.agent.id field
    const agentIdQuery = query(
      bookingsCollection,
      where("packageDetails.agent.id", "==", agentId)
    );
    
    console.log("Attempting query with packageDetails.agent.id");
    const agentIdSnapshot = await getDocs(agentIdQuery);
    console.log(`Found ${agentIdSnapshot.size} bookings with packageDetails.agent.id`);
    agentIdSnapshot.forEach(doc => bookingDocs.set(doc.id, doc));
    
    // 2. Query by agent_id field
    const agentIdDirectQuery = query(
      bookingsCollection,
      where("agent_id", "==", agentId)
    );
    
    console.log("Attempting query with agent_id");
    const agentIdDirectSnapshot = await getDocs(agentIdDirectQuery);
    console.log(`Found ${agentIdDirectSnapshot.size} bookings with agent_id`);
    agentIdDirectSnapshot.forEach(doc => bookingDocs.set(doc.id, doc));
    
    // 3. Query by agentId field
    const agentIdFieldQuery = query(
      bookingsCollection,
      where("agentId", "==", agentId)
    );
    
    console.log("Attempting query with agentId");
    const agentIdFieldSnapshot = await getDocs(agentIdFieldQuery);
    console.log(`Found ${agentIdFieldSnapshot.size} bookings with agentId`);
    agentIdFieldSnapshot.forEach(doc => bookingDocs.set(doc.id, doc));
    
    // 4. Query by packageDetails.agentId field
    const packageAgentIdQuery = query(
      bookingsCollection,
      where("packageDetails.agentId", "==", agentId)
    );
    
    console.log("Attempting query with packageDetails.agentId");
    const packageAgentIdSnapshot = await getDocs(packageAgentIdQuery);
    console.log(`Found ${packageAgentIdSnapshot.size} bookings with packageDetails.agentId`);
    packageAgentIdSnapshot.forEach(doc => bookingDocs.set(doc.id, doc));
    
    // 5. Try with a string version of the ID if it's not already a string
    if (typeof agentId !== 'string') {
      const stringAgentId = String(agentId);
      const stringAgentIdQuery = query(
        bookingsCollection,
        where("packageDetails.agent.id", "==", stringAgentId)
      );
      
      console.log("Attempting query with string version of agentId");
      const stringAgentIdSnapshot = await getDocs(stringAgentIdQuery);
      console.log(`Found ${stringAgentIdSnapshot.size} bookings with string version of agentId`);
      stringAgentIdSnapshot.forEach(doc => bookingDocs.set(doc.id, doc));
    }
    
    const bookingsSnapshot = Array.from(bookingDocs.values());
    console.log(`Combined total of ${bookingsSnapshot.length} unique bookings`);
    
    // If no bookings found, try a broader query to check booking structure
    if (bookingsSnapshot.length === 0) {
      console.log("No bookings found with targeted queries. Checking a sample of recent bookings to understand data structure...");
      const recentBookingsQuery = query(
        bookingsCollection,
        orderBy("createdAt", "desc"),
        limit(5)
      );
      
      const recentBookings = await getDocs(recentBookingsQuery);
      console.log(`Found ${recentBookings.size} recent bookings to examine`);
      
      recentBookings.forEach(doc => {
        const data = doc.data();
        console.log("Sample booking structure:", JSON.stringify({
          id: doc.id,
          agent_id: data.agent_id,
          agentId: data.agentId,
          packageDetails: {
            agent: data.packageDetails?.agent,
            agentId: data.packageDetails?.agentId
          },
          clientRelationship: data.clientRelationship ? 
            { exists: true, userId: data.clientRelationship?.userId ? 'found' : 'missing' } : 
            'missing'
        }, null, 2));
      });
    }
    
    // Process bookings to extract client relationships
    const clientMap = new Map<string, Client>();
    
    for (const doc of bookingsSnapshot) {
      const booking = doc.data();
      console.log("Processing booking:", doc.id);
      
      // Log relevant parts of the booking data for debugging
      console.log("Booking agent info:", JSON.stringify({
        agent_id: booking.agent_id,
        agentId: booking.agentId,
        packageAgent: booking.packageDetails?.agent,
        packageAgentId: booking.packageDetails?.agentId
      }, null, 2));
      
      console.log("Booking client info:", JSON.stringify({
        clientRelationship: booking.clientRelationship ? 
          { exists: true, userId: booking.clientRelationship?.userId ? 'found' : 'missing' } : 
          'missing',
        travelerInfo: booking.travelerInfo ? 'exists' : 'missing',
        user: booking.user || 'missing'
      }, null, 2));
      
      let userId;
      let contactInfo = { name: "Unknown", email: "", phone: "" };
      
      // Check various possible locations for client relationship data
      
      // 1. Check clientRelationship field
      if (booking.clientRelationship && booking.clientRelationship.userId) {
        console.log("Found clientRelationship data with userId");
        userId = booking.clientRelationship.userId;
        if (booking.clientRelationship.contactInfo) {
          contactInfo = booking.clientRelationship.contactInfo;
        }
      } 
      // 2. Check travelerInfo field if no clientRelationship
      else if (booking.travelerInfo) {
        console.log("Found travelerInfo data");
        // If there's a user reference
        if (booking.user && typeof booking.user === 'string' && booking.user.includes('/')) {
          userId = booking.user.split('/').pop();
          console.log("Extracted userId from user reference:", userId);
        }
        // If no user ref but we have traveler info
        else if (booking.travelerInfo.fullName || booking.travelerInfo.email) {
          // Use email as a fallback identifier or create a synthetic ID
          userId = booking.travelerInfo.email || `traveler-${doc.id}`;
          console.log("Using traveler info as userId:", userId);
        }
        
        // Get contact info from travelerInfo
        contactInfo = {
          name: booking.travelerInfo.fullName || "Unknown",
          email: booking.travelerInfo.email || "",
          phone: booking.travelerInfo.phone || "",
        };
      }
      // 3. Direct client fields
      else if (booking.clientId || booking.client_id) {
        console.log("Found direct client fields");
        userId = booking.clientId || booking.client_id;
        contactInfo = {
          name: booking.clientName || booking.client_name || "Unknown",
          email: booking.clientEmail || booking.client_email || "",
          phone: booking.clientPhone || booking.client_phone || "",
        };
      }
      // 4. If user field contains client identification
      else if (booking.user) {
        console.log("Found user field:", booking.user);
        if (typeof booking.user === 'string') {
          // If it's a path reference, extract the ID
          if (booking.user.includes('/')) {
            userId = booking.user.split('/').pop();
          } else {
            userId = booking.user;
          }
          console.log("Extracted userId from user field:", userId);
        } else if (typeof booking.user === 'object' && booking.user !== null) {
          // If it's an object containing user details
          userId = booking.user.id || booking.user.userId || booking.user.uid;
          console.log("Extracted userId from user object:", userId);
          
          contactInfo = {
            name: booking.user.name || booking.user.displayName || "Unknown",
            email: booking.user.email || "",
            phone: booking.user.phone || booking.user.phoneNumber || "",
          };
        }
      }
      
      if (!userId) {
        console.log("No userId found for booking:", doc.id);
        // Create a synthetic user ID as a last resort
        userId = `synthetic-${doc.id}`;
        console.log("Created synthetic userId:", userId);
      }
      
      console.log("Final userId for client:", userId, "with contact info:", contactInfo);
      
      const bookingDate = booking.createdAt instanceof Timestamp 
        ? booking.createdAt.toDate() 
        : new Date(booking.createdAt || Date.now());
        
      const bookingAmount = booking.payment?.amount || booking.packageDetails?.price || booking.price || 0;
      console.log("Booking amount:", bookingAmount);
      
      if (clientMap.has(userId)) {
        // Update existing client
        const existingClient = clientMap.get(userId)!;
        console.log("Updating existing client:", existingClient.id);
        
        if (!existingClient.bookings?.includes(doc.id)) {
          existingClient.bookings?.push(doc.id);
        }
        existingClient.totalBookings++;
        existingClient.totalSpent += bookingAmount;
        
        // Update last booking date if newer
        const existingDate = existingClient.lastBookingDate instanceof Date
          ? existingClient.lastBookingDate
          : new Date(existingClient.lastBookingDate || 0);
          
        if (bookingDate > existingDate) {
          existingClient.lastBookingDate = bookingDate;
        }
      } else {
        // Create new client entry
        console.log("Creating new client for userId:", userId);
        clientMap.set(userId, {
          id: `embedded-${userId}`,
          agentId: agentId,
          userId: userId,
          bookings: [doc.id],
          totalBookings: 1,
          totalSpent: bookingAmount,
          lastBookingDate: bookingDate,
          status: 'active',
          createdAt: bookingDate,
          updatedAt: bookingDate,
          contactInfo: contactInfo,
          notes: booking.clientRelationship?.notes || "",
          preferences: booking.clientRelationship?.preferences || {},
        });
      }
    }
    
    // Convert to array and apply sorting
    let clients = Array.from(clientMap.values());
    console.log(`Created ${clients.length} client objects`);
    
    // Apply sorting
    const { sortBy = "lastBookingDate", sortDirection = "desc" } = filterOptions;
    
    if (sortBy === "lastBookingDate") {
      clients.sort((a, b) => {
        const dateA = new Date(a.lastBookingDate).getTime();
        const dateB = new Date(b.lastBookingDate).getTime();
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
      });
    } else if (sortBy === "totalSpent") {
      clients.sort((a, b) => {
        return sortDirection === "asc" 
          ? a.totalSpent - b.totalSpent 
          : b.totalSpent - a.totalSpent;
      });
    } else if (sortBy === "totalBookings") {
      clients.sort((a, b) => {
        return sortDirection === "asc" 
          ? a.totalBookings - b.totalBookings 
          : b.totalBookings - a.totalBookings;
      });
    }
    
    console.log("Final client list count:", clients.length);
    return clients;
  } catch (error) {
    console.error("Error getting clients from bookings:", error);
    throw error;
  }
};

// Get a client by ID
export const getClientById = async (id: string): Promise<Client | null> => {
  try {
    // If it's an embedded client ID, handle differently
    if (id.startsWith('embedded-')) {
      const userId = id.replace('embedded-', '');
      // Find this client in all bookings
      const bookingsQuery = query(
        collection(db, COLLECTIONS.BOOKINGS),
        where("clientRelationship.userId", "==", userId)
      );
      
      const snapshot = await getDocs(bookingsQuery);
      if (snapshot.empty) return null;
      
      // Extract client info from the first booking
      const bookingData = snapshot.docs[0].data();
      if (!bookingData.clientRelationship) return null;
      
      // Create a client object from the booking data
      return {
        id: id,
        userId: userId,
        agentId: bookingData.agent_id,
        contactInfo: bookingData.clientRelationship.contactInfo || {
          name: bookingData.travelerInfo?.fullName || "Unknown",
          email: bookingData.travelerInfo?.email || "",
          phone: bookingData.travelerInfo?.phone || "",
        },
        status: 'active',
        totalBookings: 1, // Will update below
        totalSpent: 0, // Will update below
        lastBookingDate: new Date(),
        notes: bookingData.clientRelationship.notes || "",
        preferences: bookingData.clientRelationship.preferences || {},
        bookings: [],
        createdAt: bookingData.created_at || new Date(),
        updatedAt: bookingData.updated_at || new Date(),
      };
    }
    
    // For regular client IDs
    const clientRef = doc(db, COLLECTIONS.CLIENTS, id);
    const clientSnap = await getDoc(clientRef);
    
    if (!clientSnap.exists()) {
      return null;
    }
    
    return convertToClient(clientSnap);
  } catch (error) {
    console.error("Error getting client by ID:", error);
    throw error;
  }
};

// Get detailed client info from bookings
export const getClientDetailsFromBookings = async (
  agentId: string,
  userId: string
): Promise<Client | null> => {
  try {
    // Get all bookings for this user and agent
    const bookingsQuery = query(
      collection(db, COLLECTIONS.BOOKINGS),
      where("agent_id", "==", agentId),
      where("clientRelationship.userId", "==", userId)
    );
    
    const snapshot = await getDocs(bookingsQuery);
    if (snapshot.empty) return null;
    
    // Initialize client data
    let clientData: Client = {
      id: `embedded-${userId}`,
      userId: userId,
      agentId: agentId,
      contactInfo: {
        name: "Unknown",
        email: "",
        phone: "",
      },
      status: 'active',
      totalBookings: 0,
      totalSpent: 0,
      lastBookingDate: new Date(0),
      bookings: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Process all bookings to calculate stats and collect info
    snapshot.forEach(doc => {
      const booking = doc.data();
      
      // Add booking ID to list
      clientData.bookings?.push(doc.id);
      
      // Update total bookings count
      clientData.totalBookings++;
      
      // Update total spent
      const bookingAmount = booking.payment?.amount || booking.packageDetails?.price || 0;
      clientData.totalSpent += bookingAmount;
      
      // Update contact info from the most complete source
      if (booking.clientRelationship?.contactInfo?.name) {
        clientData.contactInfo.name = booking.clientRelationship.contactInfo.name;
      } else if (booking.travelerInfo?.fullName) {
        clientData.contactInfo.name = booking.travelerInfo.fullName;
      }
      
      if (booking.clientRelationship?.contactInfo?.email) {
        clientData.contactInfo.email = booking.clientRelationship.contactInfo.email;
      } else if (booking.travelerInfo?.email) {
        clientData.contactInfo.email = booking.travelerInfo.email;
      }
      
      if (booking.clientRelationship?.contactInfo?.phone) {
        clientData.contactInfo.phone = booking.clientRelationship.contactInfo.phone;
      } else if (booking.travelerInfo?.phone) {
        clientData.contactInfo.phone = booking.travelerInfo.phone;
      }
      
      // Update preferences if available
      if (booking.clientRelationship?.preferences) {
        clientData.preferences = booking.clientRelationship.preferences;
      }
      
      // Update notes if available
      if (booking.clientRelationship?.notes) {
        clientData.notes = booking.clientRelationship.notes;
      }
      
      // Update created/updated dates
      const bookingDate = booking.createdAt instanceof Timestamp 
        ? booking.createdAt.toDate() 
        : new Date(booking.createdAt);
        
      // Update last booking date if newer
      if (bookingDate > new Date(clientData.lastBookingDate)) {
        clientData.lastBookingDate = bookingDate;
      }
      
      // Set created date to earliest booking
      const clientCreatedAt = new Date(clientData.createdAt);
      if (bookingDate < clientCreatedAt) {
        clientData.createdAt = bookingDate;
      }
      
      // Set updated date to most recent booking
      const clientUpdatedAt = new Date(clientData.updatedAt);
      if (bookingDate > clientUpdatedAt) {
        clientData.updatedAt = bookingDate;
      }
    });
    
    return clientData;
  } catch (error) {
    console.error("Error getting client details from bookings:", error);
    throw error;
  }
};

// Update client status
export const updateClientStatus = async (
  id: string,
  status: 'active' | 'inactive'
): Promise<void> => {
  try {
    // Embedded clients can't be updated directly
    if (id.startsWith('embedded-')) {
      throw new Error("Cannot update embedded client status directly");
    }
    
    const clientRef = doc(db, COLLECTIONS.CLIENTS, id);
    await updateDoc(clientRef, {
      status,
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating client status:", error);
    throw error;
  }
};

// Update client notes
export const updateClientNotes = async (
  id: string,
  notes: string
): Promise<void> => {
  try {
    // For embedded clients, find the related bookings and update
    if (id.startsWith('embedded-')) {
      const userId = id.replace('embedded-', '');
      const bookingsQuery = query(
        collection(db, COLLECTIONS.BOOKINGS),
        where("clientRelationship.userId", "==", userId)
      );
      
      const snapshot = await getDocs(bookingsQuery);
      
      // Update notes in each booking with this user relationship
      const promises = snapshot.docs.map(doc => {
        const bookingRef = doc.ref;
        return updateDoc(bookingRef, {
          "clientRelationship.notes": notes,
          updated_at: serverTimestamp(),
        });
      });
      
      await Promise.all(promises);
      return;
    }
    
    // For regular clients
    const clientRef = doc(db, COLLECTIONS.CLIENTS, id);
    await updateDoc(clientRef, {
      notes,
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating client notes:", error);
    throw error;
  }
};

// Update client preferences
export const updateClientPreferences = async (
  id: string,
  preferences: Client["preferences"]
): Promise<void> => {
  try {
    // For embedded clients, find the related bookings and update
    if (id.startsWith('embedded-')) {
      const userId = id.replace('embedded-', '');
      const bookingsQuery = query(
        collection(db, COLLECTIONS.BOOKINGS),
        where("clientRelationship.userId", "==", userId)
      );
      
      const snapshot = await getDocs(bookingsQuery);
      
      // Update preferences in each booking with this user relationship
      const promises = snapshot.docs.map(doc => {
        const bookingRef = doc.ref;
        return updateDoc(bookingRef, {
          "clientRelationship.preferences": preferences,
          updated_at: serverTimestamp(),
        });
      });
      
      await Promise.all(promises);
      return;
    }
    
    // For regular clients
    const clientRef = doc(db, COLLECTIONS.CLIENTS, id);
    await updateDoc(clientRef, {
      preferences,
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating client preferences:", error);
    throw error;
  }
}; 