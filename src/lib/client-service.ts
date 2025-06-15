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

// Helper to safely convert any input to ISO string 
const toISOString = (date: any): string => {
  console.log("Converting to ISO string:", typeof date, date);
  
  if (!date) return new Date().toISOString();
  
  if (typeof date === 'string') {
    // Check if already ISO format
    if (date.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/)) {
      return date;
    }
    
    // Try to parse it
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  
  if (date instanceof Date) {
    return date.toISOString();
  }
  
  // If it's a Firestore Timestamp
  if (date?.toDate && typeof date.toDate === "function") {
    return date.toDate().toISOString();
  }
  
  // Default fallback
  return new Date().toISOString();
};

// Format date helper
export const formatDate = (date: any): Date | null => {
  return safeToDate(date);
};

// Convert Firestore document to Client type
const convertToClient = (doc: DocumentData): Client => {
  const data = doc.data();
  
  console.log('Converting client document:', {
    id: doc.id,
    rawData: data
  });
  
  const lastBookingDate = safeToDate(data.lastBookingDate);
  const createdAtDate = safeToDate(data.createdAt);
  const updatedAtDate = safeToDate(data.updatedAt);
  
  // Convert Date objects to ISO strings for Redux storage
  const lastBookingISO = lastBookingDate ? lastBookingDate.toISOString() : new Date().toISOString();
  const createdAtISO = createdAtDate ? createdAtDate.toISOString() : new Date().toISOString();
  const updatedAtISO = updatedAtDate ? updatedAtDate.toISOString() : new Date().toISOString();
  
  const client = {
    id: doc.id,
    userId: data.userId,
    agentId: data.agentId,
    contactInfo: {
      name: data.contactInfo?.name || "Unknown",
      email: data.contactInfo?.email || "",
      phone: data.contactInfo?.phone || "",
    },
    status: data.status || "active",
    totalBookings: data.totalBookings || 0,
    totalSpent: data.totalSpent || 0,
    lastBookingDate: lastBookingISO,
    notes: data.notes || "",
    preferences: data.preferences || {
      destinations: [],
      accommodationType: "",
      budgetRange: "",
      travelStyle: [],
      specialRequirements: [],
    },
    bookings: data.bookings || [],
    createdAt: createdAtISO,
    updatedAt: updatedAtISO,
  };
  
  console.log('Converted client:', {
    id: client.id,
    agentId: client.agentId,
    userId: client.userId,
    notes: client.notes
  });
  
  return client;
};

// Get all clients for an agent
export const getAgentClients = async (
  agentId: string,
  filterOptions: ClientFilter = {}
): Promise<Client[]> => {
  try {
    console.log('=== Getting Agent Clients ===');
    console.log('Agent ID:', agentId);
    
    const { sortBy = "lastBookingDate", sortDirection = "desc" } = filterOptions;
    
    // Map field names to Firestore fields
    const fieldMap: Record<string, string> = {
      lastBookingDate: "lastBookingDate",
      totalSpent: "totalSpent", 
      totalBookings: "totalBookings",
    };
    
    const sortField = fieldMap[sortBy] || "lastBookingDate";
    
    let clientsQuery = query(
      collection(db, COLLECTIONS.CLIENTS),
      where("agentId", "==", agentId),
      orderBy(sortField, sortDirection)
    );
    
    if (filterOptions.status && filterOptions.status !== "all") {
      clientsQuery = query(
        clientsQuery,
        where("status", "==", filterOptions.status)
      );
    }
    
    console.log('Executing clients query with agentId field...');
    const snapshot = await getDocs(clientsQuery);
    console.log(`Found ${snapshot.size} clients in collection`);
    
    const clients = snapshot.docs.map((doc) => {
      const data = doc.data();
      console.log('Client document:', {
        id: doc.id,
        agentId: data.agentId,
        userId: data.userId,
        notes: data.notes
      });
      return convertToClient(doc);
    });
    
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
    console.log("Getting clients from bookings for agent:", agentId);
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
    
    // 2. Query by agentId field (updated to match database structure)
    const agentIdDirectQuery = query(
      bookingsCollection,
      where("agentId", "==", agentId)
    );
    
    console.log("Attempting query with agentId");
    const agentIdDirectSnapshot = await getDocs(agentIdDirectQuery);
    console.log(`Found ${agentIdDirectSnapshot.size} bookings with agentId`);
    agentIdDirectSnapshot.forEach(doc => bookingDocs.set(doc.id, doc));
    
    // 3. Query by packageDetails.agentId field
    const packageAgentIdQuery = query(
      bookingsCollection,
      where("packageDetails.agentId", "==", agentId)
    );
    
    console.log("Attempting query with packageDetails.agentId");
    const packageAgentIdSnapshot = await getDocs(packageAgentIdQuery);
    console.log(`Found ${packageAgentIdSnapshot.size} bookings with packageDetails.agentId`);
    packageAgentIdSnapshot.forEach(doc => bookingDocs.set(doc.id, doc));
    
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
      
      // Extract booking date, ensuring we get a proper date object
      let bookingDate: Date;
      if (booking.createdAt instanceof Timestamp) {
        bookingDate = booking.createdAt.toDate();
      } else if (typeof booking.createdAt === 'string') {
        bookingDate = new Date(booking.createdAt);
      } else {
        bookingDate = new Date();
      }
      
      const bookingDateString = bookingDate.toISOString();
      console.log("Booking date (ISO):", bookingDateString);
      
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
        const existingDate = new Date(existingClient.lastBookingDate);
        if (bookingDate > existingDate) {
          existingClient.lastBookingDate = bookingDateString;
        }
      } else {
        // Create new client entry with ISO string dates
        console.log("Creating new client for userId:", userId);
        clientMap.set(userId, {
          id: `embedded-${userId}`,
          agentId: agentId,
          userId: userId,
          bookings: [doc.id],
          totalBookings: 1,
          totalSpent: bookingAmount,
          lastBookingDate: bookingDateString,
          status: 'active',
          createdAt: bookingDateString,
          updatedAt: bookingDateString,
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
    console.log("Getting client by ID:", id);
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
      
      console.log("Creating client from booking data");
      
      // Get dates and convert to ISO strings
      const bookingDate = safeToDate(bookingData.createdAt) || new Date();
      const bookingDateString = bookingDate.toISOString();
      
      // Create a client object from the booking data
      return {
        id: id,
        userId: userId,
        agentId: bookingData.agentId,
        contactInfo: bookingData.clientRelationship.contactInfo || {
          name: bookingData.travelerInfo?.fullName || "Unknown",
          email: bookingData.travelerInfo?.email || "",
          phone: bookingData.travelerInfo?.phone || "",
        },
        status: 'active',
        totalBookings: 1, // Will update below
        totalSpent: 0, // Will update below
        lastBookingDate: bookingDateString,
        notes: bookingData.clientRelationship.notes || "",
        preferences: bookingData.clientRelationship.preferences || {},
        bookings: [],
        createdAt: bookingDateString,
        updatedAt: bookingDateString,
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
      where("agentId", "==", agentId),
      where("clientRelationship.userId", "==", userId)
    );
    
    const snapshot = await getDocs(bookingsQuery);
    if (snapshot.empty) return null;
    
    // Initialize client data with serialized dates
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
      lastBookingDate: new Date(0).toISOString(), // Using ISO string
      bookings: [],
      createdAt: new Date().toISOString(), // Using ISO string
      updatedAt: new Date().toISOString(), // Using ISO string
    };
    
    console.log("Initial client data dates:", {
      lastBookingDate: clientData.lastBookingDate,
      createdAt: clientData.createdAt,
      updatedAt: clientData.updatedAt
    });
    
    // Process each booking
    snapshot.docs.forEach(doc => {
      const booking = doc.data();
      
      // Update contact info if available
      if (booking.clientRelationship?.contactInfo) {
        clientData.contactInfo = booking.clientRelationship.contactInfo;
      } else if (booking.travelerInfo) {
        clientData.contactInfo = {
          name: booking.travelerInfo.fullName || clientData.contactInfo.name,
          email: booking.travelerInfo.email || clientData.contactInfo.email,
          phone: booking.travelerInfo.phone || clientData.contactInfo.phone,
        };
      }
      
      // Update notes and preferences
      if (booking.clientRelationship?.notes) {
        clientData.notes = booking.clientRelationship.notes;
      }
      if (booking.clientRelationship?.preferences) {
        clientData.preferences = booking.clientRelationship.preferences;
      }
      
      // Add booking to list
      clientData.bookings?.push(doc.id);
      clientData.totalBookings++;
      
      // Add to total spent
      const bookingAmount = booking.payment?.amount || booking.packageDetails?.price || booking.price || 0;
      clientData.totalSpent += bookingAmount;
      
      // Update last booking date
      let bookingDate: Date;
      if (booking.createdAt instanceof Timestamp) {
        bookingDate = booking.createdAt.toDate();
      } else if (typeof booking.createdAt === 'string') {
        bookingDate = new Date(booking.createdAt);
      } else {
        bookingDate = new Date();
      }
      
      const bookingDateString = bookingDate.toISOString();
      const currentLastBooking = new Date(clientData.lastBookingDate);
      
      if (bookingDate > currentLastBooking) {
        clientData.lastBookingDate = bookingDateString;
      }
      
      // Update created/updated dates
      if (bookingDate < new Date(clientData.createdAt)) {
        clientData.createdAt = bookingDateString;
      }
      clientData.updatedAt = new Date().toISOString();
    });
    
    console.log("Final client data dates:", {
      lastBookingDate: clientData.lastBookingDate,
      createdAt: clientData.createdAt,
      updatedAt: clientData.updatedAt
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
    console.log('=== Updating Client Notes ===');
    console.log('Client ID:', id);
    console.log('Notes:', notes);
    
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
          updatedAt: serverTimestamp(),
        });
      });
      
      await Promise.all(promises);
      console.log('Updated notes in embedded client bookings');
      return;
    }
    
    // For regular clients
    const clientRef = doc(db, COLLECTIONS.CLIENTS, id);
    await updateDoc(clientRef, {
      notes,
      updatedAt: serverTimestamp(),
    });
    console.log('Updated notes in client document');
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