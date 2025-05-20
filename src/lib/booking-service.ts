import {
  Booking,
  BookingFilter,
  BookingStats,
  PaymentDetails,
} from "@/types/booking";
import { db } from "@/lib/firebase/config";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  serverTimestamp,
  Timestamp,
  startAt,
  endAt,
  DocumentData,
  QuerySnapshot,
} from "firebase/firestore";
import { Package } from "@/types/package";

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

// Convert Firestore document to Booking type
const convertToBooking = (doc: DocumentData): Booking => {
  const data = doc.data();

  // Get dates with fallbacks to ensure we never return null
  const startDateResult = safeToDate(data.start_date);
  const endDateResult = safeToDate(data.end_date);
  const createdAtResult = safeToDate(data.created_at);
  const updatedAtResult = safeToDate(data.updated_at);

  return {
    id: doc.id,
    clientId: data.client_id,
    clientName: data.client_name,
    clientEmail: data.client_email,
    clientPhone: data.client_phone,
    packageId: data.package_id,
    packageName: data.package_name,
    agentId: data.agent_id,
    startDate: startDateResult || new Date(), // Default to current date if null
    endDate:
      endDateResult || new Date(new Date().setDate(new Date().getDate() + 7)), // Default to +7 days if null
    price: data.price || 0,
    totalPaid: data.total_paid || 0,
    balance: data.balance || 0,
    status: data.status || "pending",
    travelers: data.travelers || 1,
    notes: data.notes,
    paymentMethod: data.payment_method,
    paymentStatus: data.payment_status || "unpaid",
    createdAt: createdAtResult || new Date(),
    updatedAt: updatedAtResult || new Date(),
  };
};

// Create a new booking
export const createBooking = async (
  bookingData: Omit<Booking, "id">
): Promise<Booking> => {
  try {
    const bookingRef = collection(db, "bookings");

    // Prepare data for Firestore
    const newBooking = {
      client_id: bookingData.clientId,
      client_name: bookingData.clientName,
      client_name_lower: bookingData.clientName.toLowerCase(), // For case-insensitive search
      client_email: bookingData.clientEmail,
      client_phone: bookingData.clientPhone,
      package_id: bookingData.packageId,
      package_name: bookingData.packageName,
      agent_id: bookingData.agentId,
      start_date:
        bookingData.startDate instanceof Date
          ? Timestamp.fromDate(bookingData.startDate)
          : Timestamp.fromDate(new Date(bookingData.startDate)),
      end_date:
        bookingData.endDate instanceof Date
          ? Timestamp.fromDate(bookingData.endDate)
          : Timestamp.fromDate(new Date(bookingData.endDate)),
      price: bookingData.price,
      total_paid: bookingData.totalPaid || 0,
      balance: bookingData.price - (bookingData.totalPaid || 0),
      status: bookingData.status,
      travelers: bookingData.travelers,
      notes: bookingData.notes || "",
      payment_method: bookingData.paymentMethod || "",
      payment_status: bookingData.paymentStatus || "unpaid",
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };

    const docRef = await addDoc(bookingRef, newBooking);

    // Increment the package sales count if there's a valid package ID
    if (bookingData.packageId) {
      try {
        console.log(`Incrementing sales count for package ${bookingData.packageId}`);
        const packageRef = doc(db, "package_info", bookingData.packageId);
        const packageDoc = await getDoc(packageRef);
        
        if (packageDoc.exists()) {
          const packageData = packageDoc.data();
          const currentSalesCount = packageData.sales_count || 0;
          console.log(`Current sales count for package ${bookingData.packageId}: ${currentSalesCount}`);
          
          await updateDoc(packageRef, { 
            sales_count: currentSalesCount + 1,
            updated_at: serverTimestamp() 
          });
          console.log(`Updated package ${bookingData.packageId} sales count to ${currentSalesCount + 1}`);
        } else {
          console.warn(`Package ${bookingData.packageId} not found when updating sales count`);
        }
      } catch (error) {
        console.error("Error incrementing package sales count:", error);
        // Don't throw here, as the booking was already created
      }
    } else {
      console.warn("No packageId found in booking data, cannot update sales count");
    }

    // Return the booking with the new ID
    return {
      ...bookingData,
      id: docRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error("Error creating booking:", error);
    throw error;
  }
};

// Get a booking by ID
export const getBookingById = async (id: string): Promise<Booking | null> => {
  try {
    const bookingRef = doc(db, "bookings", id);
    const bookingDoc = await getDoc(bookingRef);

    if (!bookingDoc.exists()) {
      return null;
    }

    return convertToBooking(bookingDoc);
  } catch (error) {
    console.error("Error getting booking:", error);
    throw error;
  }
};

// Update a booking
export const updateBooking = async (
  id: string,
  bookingData: Partial<Booking>
): Promise<Booking> => {
  try {
    const bookingRef = doc(db, "bookings", id);

    // Prepare update data for Firestore
    const updateData: any = {
      updated_at: serverTimestamp(),
    };

    // Map booking fields to Firestore fields
    if (bookingData.clientName !== undefined) {
      updateData.client_name = bookingData.clientName;
      updateData.client_name_lower = bookingData.clientName.toLowerCase();
    }
    if (bookingData.clientEmail !== undefined)
      updateData.client_email = bookingData.clientEmail;
    if (bookingData.clientPhone !== undefined)
      updateData.client_phone = bookingData.clientPhone;
    if (bookingData.packageName !== undefined)
      updateData.package_name = bookingData.packageName;
    if (bookingData.status !== undefined)
      updateData.status = bookingData.status;
    if (bookingData.notes !== undefined) updateData.notes = bookingData.notes;
    if (bookingData.paymentMethod !== undefined)
      updateData.payment_method = bookingData.paymentMethod;
    if (bookingData.paymentStatus !== undefined)
      updateData.payment_status = bookingData.paymentStatus;
    if (bookingData.totalPaid !== undefined) {
      updateData.total_paid = bookingData.totalPaid;
      // Update balance if total paid changes
      if (bookingData.price !== undefined) {
        updateData.balance = bookingData.price - bookingData.totalPaid;
      } else {
        // Get current price
        const currentDoc = await getDoc(bookingRef);
        if (currentDoc.exists()) {
          const currentData = currentDoc.data();
          updateData.balance = currentData.price - bookingData.totalPaid;
        }
      }
    }
    if (bookingData.price !== undefined) {
      updateData.price = bookingData.price;
      // Update balance if price changes
      if (bookingData.totalPaid !== undefined) {
        updateData.balance = bookingData.price - bookingData.totalPaid;
      } else {
        // Get current total paid
        const currentDoc = await getDoc(bookingRef);
        if (currentDoc.exists()) {
          const currentData = currentDoc.data();
          updateData.balance = bookingData.price - currentData.total_paid;
        }
      }
    }
    if (bookingData.travelers !== undefined)
      updateData.travelers = bookingData.travelers;

    if (bookingData.startDate !== undefined) {
      updateData.start_date =
        bookingData.startDate instanceof Date
          ? Timestamp.fromDate(bookingData.startDate)
          : Timestamp.fromDate(new Date(bookingData.startDate));
    }

    if (bookingData.endDate !== undefined) {
      updateData.end_date =
        bookingData.endDate instanceof Date
          ? Timestamp.fromDate(bookingData.endDate)
          : Timestamp.fromDate(new Date(bookingData.endDate));
    }

    // Update document
    await updateDoc(bookingRef, updateData);

    // Retrieve the updated document
    const updatedDoc = await getDoc(bookingRef);
    if (!updatedDoc.exists()) {
      throw new Error("Booking not found after update");
    }

    return convertToBooking(updatedDoc);
  } catch (error) {
    console.error("Error updating booking:", error);
    throw error;
  }
};

// Get bookings with filters
export const getBookings = async (
  agentId: string,
  filters: BookingFilter = {},
  lastVisible?: DocumentSnapshot | null,
  itemsPerPage: number = 10
): Promise<{ bookings: Booking[]; lastVisible: DocumentSnapshot | null }> => {
  try {
    let bookingsQuery = query(
      collection(db, "bookings"),
      where("agent_id", "==", agentId),
      orderBy("created_at", "desc")
    );

    // Apply filters
    if (filters.status && filters.status !== "all") {
      bookingsQuery = query(
        bookingsQuery,
        where("status", "==", filters.status)
      );
    }

    if (filters.startDate) {
      const startTimestamp = Timestamp.fromDate(filters.startDate);
      bookingsQuery = query(
        bookingsQuery,
        where("start_date", ">=", startTimestamp)
      );
    }

    if (filters.endDate) {
      const endTimestamp = Timestamp.fromDate(filters.endDate);
      bookingsQuery = query(
        bookingsQuery,
        where("end_date", "<=", endTimestamp)
      );
    }

    if (filters.clientId) {
      bookingsQuery = query(
        bookingsQuery,
        where("client_id", "==", filters.clientId)
      );
    }

    if (filters.packageId) {
      bookingsQuery = query(
        bookingsQuery,
        where("package_id", "==", filters.packageId)
      );
    }

    // Apply pagination
    if (lastVisible) {
      bookingsQuery = query(
        bookingsQuery,
        startAfter(lastVisible),
        limit(itemsPerPage)
      );
    } else {
      bookingsQuery = query(bookingsQuery, limit(itemsPerPage));
    }

    const snapshot = await getDocs(bookingsQuery);
    const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1] || null;

    // If search term is provided, filter results manually
    // (Note: This is not optimal for large datasets - in production you'd likely use a search service)
    let bookings = snapshot.docs.map((doc) => convertToBooking(doc));

    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      bookings = bookings.filter(
        (booking) =>
          booking.clientName.toLowerCase().includes(searchTerm) ||
          booking.clientEmail.toLowerCase().includes(searchTerm) ||
          booking.packageName.toLowerCase().includes(searchTerm)
      );
    }

    return {
      bookings,
      lastVisible: lastVisibleDoc,
    };
  } catch (error) {
    console.error("Error getting bookings:", error);
    throw error;
  }
};

// Get booking statistics
export const getBookingStats = async (
  agentId: string
): Promise<BookingStats> => {
  try {
    console.log("Fetching booking stats for agent:", agentId);
    const bookingsRef = collection(db, "bookings");
    const bookingDocs = new Map();

    // Try different query approaches to find all bookings for this agent
    
    // 1. Try agent_id field (direct field)
    const agentIdQuery = query(bookingsRef, where("agent_id", "==", agentId));
    console.log("Querying with agent_id field");
    const agentIdSnapshot = await getDocs(agentIdQuery);
    console.log(`Found ${agentIdSnapshot.size} bookings with agent_id match`);
    agentIdSnapshot.forEach(doc => bookingDocs.set(doc.id, doc));
    
    // 2. Try agentId field (camelCase variation)
    const agentIdCamelQuery = query(bookingsRef, where("agentId", "==", agentId));
    console.log("Querying with agentId field");
    const agentIdCamelSnapshot = await getDocs(agentIdCamelQuery);
    console.log(`Found ${agentIdCamelSnapshot.size} bookings with agentId match`);
    agentIdCamelSnapshot.forEach(doc => bookingDocs.set(doc.id, doc));
    
    // 3. Try packageDetails.agent.id field
    const packageAgentQuery = query(bookingsRef, where("packageDetails.agent.id", "==", agentId));
    console.log("Querying with packageDetails.agent.id field");
    const packageAgentSnapshot = await getDocs(packageAgentQuery);
    console.log(`Found ${packageAgentSnapshot.size} bookings with packageDetails.agent.id match`);
    packageAgentSnapshot.forEach(doc => bookingDocs.set(doc.id, doc));
    
    // 4. Try agent.id field
    const agentObjectQuery = query(bookingsRef, where("agent.id", "==", agentId));
    console.log("Querying with agent.id field");
    const agentObjectSnapshot = await getDocs(agentObjectQuery);
    console.log(`Found ${agentObjectSnapshot.size} bookings with agent.id match`);
    agentObjectSnapshot.forEach(doc => bookingDocs.set(doc.id, doc));

    // Combine all results
    const snapshot = Array.from(bookingDocs.values());
    console.log(`Combined total of ${snapshot.length} unique bookings`);

    // Calculate statistics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthTimestamp = Timestamp.fromDate(startOfMonth);

    let totalBookings = 0;
    let confirmedBookings = 0;
    let pendingBookings = 0;
    let cancelledBookings = 0;
    let totalRevenue = 0;
    let pendingRevenue = 0;
    let revenueThisMonth = 0;
    let bookingsThisMonth = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Processing booking ${doc.id} with status: ${data.status || 'unknown'}`);
      
      totalBookings++;
      
      // Get price from various possible fields
      const priceFromMainField = parseFloat(data.price) || 0;
      const priceFromPayment = parseFloat(data.payment?.amount) || 0;
      const priceFromPackageDetails = parseFloat(data.packageDetails?.price) || 0;
      
      // Detailed logging of all price sources
      console.log(`Booking ${doc.id} price sources: `, {
        priceField: data.price,
        paymentAmount: data.payment?.amount,
        packageDetailsPrice: data.packageDetails?.price,
        totalPaid: data.total_paid || data.totalPaid,
        balance: data.balance
      });
      
      const price = priceFromMainField || priceFromPayment || priceFromPackageDetails || 0;
      console.log(`Booking ${doc.id} final price: ${price}`);
      
      // Count by status - handle different case variations
      const status = (data.status || '').toLowerCase();
      if (status === "confirmed" || status === "complete" || status === "completed") {
        confirmedBookings++;
        // Only add to revenue if booking is confirmed or completed
        totalRevenue += price;
        console.log(`Booking ${doc.id} is confirmed/completed. Added ${price} to total revenue. Running total: ${totalRevenue}`);
      } else if (status === "pending" || status === "") {
        pendingBookings++;
        pendingRevenue += price;
        console.log(`Booking ${doc.id} is pending. Added ${price} to pending revenue. Running total: ${pendingRevenue}`);
      } else if (status === "cancelled" || status === "canceled") {
        cancelledBookings++;
        console.log(`Booking ${doc.id} is cancelled. Not adding to revenue.`);
      } else {
        // Default to pending for unknown statuses
        pendingBookings++;
        pendingRevenue += price;
        console.log(`Booking ${doc.id} has unknown status: ${status}, counting as pending. Added ${price} to pending revenue. Running total: ${pendingRevenue}`);
      }

      // This month's data - try different timestamp fields
      const createdAt = data.created_at || data.createdAt;
      if (createdAt) {
        let createdAtTimestamp: Timestamp | null = null;
        
        if (createdAt instanceof Timestamp) {
          createdAtTimestamp = createdAt;
        } else if (createdAt.seconds && createdAt.nanoseconds) {
          createdAtTimestamp = new Timestamp(createdAt.seconds, createdAt.nanoseconds);
        } else if (typeof createdAt === 'string') {
          try {
            const dateObj = new Date(createdAt);
            if (!isNaN(dateObj.getTime())) {
              createdAtTimestamp = Timestamp.fromDate(dateObj);
            }
          } catch (e) {
            console.log(`Could not convert string date: ${createdAt}`);
          }
        }
          
        if (createdAtTimestamp && createdAtTimestamp >= startOfMonthTimestamp) {
          bookingsThisMonth++;
          revenueThisMonth += price;
        }
      } else {
        // If no creation date, assume it's recent and count it
        const updatedAt = data.updated_at || data.updatedAt;
        if (updatedAt) {
          bookingsThisMonth++;
          revenueThisMonth += price;
        }
      }
    });

    console.log(`Stats calculation complete. Total: ${totalBookings}, Revenue: ${totalRevenue}, Pending Revenue: ${pendingRevenue}`);
    console.log(`Status counts - Confirmed: ${confirmedBookings}, Pending: ${pendingBookings}, Cancelled: ${cancelledBookings}`);
    
    return {
      total: totalBookings,
      confirmed: confirmedBookings,
      pending: pendingBookings,
      cancelled: cancelledBookings,
      revenue: totalRevenue,
      pendingRevenue: pendingRevenue,
      revenueMonth: revenueThisMonth,
      bookingsMonth: bookingsThisMonth,
    };
  } catch (error) {
    console.error("Error getting booking stats:", error);
    // Return default values on error
    return {
      total: 0,
      confirmed: 0,
      pending: 0,
      cancelled: 0,
      revenue: 0,
      pendingRevenue: 0,
      revenueMonth: 0,
      bookingsMonth: 0,
    };
  }
};

// Add payment to a booking
export const addPayment = async (
  payment: Omit<PaymentDetails, "id">
): Promise<PaymentDetails> => {
  try {
    // Add payment record
    const paymentsRef = collection(db, "booking_payments");
    const paymentData = {
      booking_id: payment.bookingId,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      transaction_id: payment.transactionId || "",
      date:
        payment.date instanceof Date
          ? Timestamp.fromDate(payment.date)
          : Timestamp.fromDate(new Date(payment.date)),
      notes: payment.notes || "",
      created_at: serverTimestamp(),
    };

    const paymentDocRef = await addDoc(paymentsRef, paymentData);

    // Update booking total paid and payment status
    if (payment.status === "successful") {
      const bookingRef = doc(db, "bookings", payment.bookingId);
      const bookingDoc = await getDoc(bookingRef);

      if (bookingDoc.exists()) {
        const bookingData = bookingDoc.data();
        const currentPaid = bookingData.total_paid || 0;
        const newTotalPaid = currentPaid + payment.amount;
        const price = bookingData.price || 0;
        const balance = price - newTotalPaid;

        // Determine payment status
        let paymentStatus = "unpaid";
        if (balance <= 0) {
          paymentStatus = "paid";
        } else if (newTotalPaid > 0) {
          paymentStatus = "partially_paid";
        }

        await updateDoc(bookingRef, {
          total_paid: newTotalPaid,
          balance: balance,
          payment_status: paymentStatus,
          updated_at: serverTimestamp(),
        });
      }
    }

    return {
      ...payment,
      id: paymentDocRef.id,
    };
  } catch (error) {
    console.error("Error adding payment:", error);
    throw error;
  }
};

// Get payments for a booking
export const getBookingPayments = async (
  bookingId: string
): Promise<PaymentDetails[]> => {
  try {
    const paymentsRef = collection(db, "booking_payments");
    const paymentsQuery = query(
      paymentsRef,
      where("booking_id", "==", bookingId),
      orderBy("date", "desc")
    );

    const snapshot = await getDocs(paymentsQuery);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      // Convert date to string if it's null to avoid type error
      const paymentDate = safeToDate(data.date);
      return {
        id: doc.id,
        bookingId: data.booking_id,
        amount: data.amount,
        method: data.method,
        status: data.status,
        transactionId: data.transaction_id,
        date: paymentDate || new Date(), // Default to current date if null
        notes: data.notes,
      };
    });
  } catch (error) {
    console.error("Error getting booking payments:", error);
    throw error;
  }
};

// Delete a booking
export const deleteBooking = async (id: string): Promise<boolean> => {
  try {
    const bookingRef = doc(db, "bookings", id);
    await deleteDoc(bookingRef);
    return true;
  } catch (error) {
    console.error("Error deleting booking:", error);
    throw error;
  }
};

export const getPackageById = async (id: string): Promise<Package | null> => {
  try {
    const packageRef = doc(db, "package_info", id);
    const packageDoc = await getDoc(packageRef);
    if (packageDoc.exists()) {
      const data = packageDoc.data();

      // Handle dates safely
      const checkInDate = safeToDate(data.check_in_date);
      const checkOutDate = safeToDate(data.check_out_date);
      const checkInTime = safeToDate(data.check_in_time);
      const checkOutTime = safeToDate(data.check_out_time);
      const createdAt = safeToDate(data.createdAt);
      const updatedAt = safeToDate(data.updatedAt);

      return {
        id: packageDoc.id,
        name: data.name,
        description: data.description,
        price: data.price,
        type: data.type,
        image: data.banner_image,
        rating: data.rating,
        allinclusive: data.is_all_inclusive,
        roomType: data.room_type,
        amenities: data.amenities,
        isFeatured: data.is_featured_package,
        bathrooms: data.baths,
        bedrooms: data.beds,
        guestAmount: data.guest_amount,
        checkInDate: checkInDate || new Date(),
        checkOutDate: checkOutDate || new Date(),
        checkInTime: checkInTime || new Date(),
        checkOutTime: checkOutTime || new Date(),
        agent: data.agent,
        createdAt: createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: updatedAt?.toISOString() || new Date().toISOString(),
      } as Package;
    }
    return null;
  } catch (error) {
    console.error("Error getting package:", error);
    throw error;
  }
};

export const getAgentPackages = async (
  agentId: string,
  lastVisible?: DocumentSnapshot | null
): Promise<{ packages: Package[]; lastVisible: DocumentSnapshot | null }> => {
  try {
    console.log("Fetching packages for agent:", agentId);
    const PACKAGES_PER_PAGE = 10;
    let packagesQuery = query(
      collection(db, "package_info"),
      where("agentId", "==", agentId),
      orderBy("createdAt", "desc"),
      limit(PACKAGES_PER_PAGE)
    );

    if (lastVisible) {
      packagesQuery = query(
        collection(db, "package_info"),
        where("agentId", "==", agentId),
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(PACKAGES_PER_PAGE)
      );
    }

    console.log("Executing query...");
    const querySnapshot = await getDocs(packagesQuery);
    console.log("Query returned", querySnapshot.size, "documents");

    const lastVisibleDoc =
      querySnapshot.docs[querySnapshot.docs.length - 1] || null;

    const packages = await Promise.all(
      querySnapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        console.log("Package data:", { id: docSnapshot.id, ...data });

        // Handle both old and new flight info structures
        let flightInfoData = null;
        if (data.flight_info) {
          if (typeof data.flight_info === "string") {
            // Old structure - fetch from separate document
            const flightInfoRef = doc(db, "flight_info", data.flight_info);
            const flightInfoDoc = await getDoc(flightInfoRef);
            if (flightInfoDoc.exists()) {
              const flightInfo = flightInfoDoc.data();
              const departingTime = safeToDate(flightInfo.departing_time);
              const arrivingToTime = safeToDate(flightInfo.arriving_to_time);
              const returningFromTime = safeToDate(
                flightInfo.returning_from_time
              );
              const returningToTime = safeToDate(flightInfo.returning_to_time);
              const departureDate = safeToDate(flightInfo.departure_date);
              const returnDate = safeToDate(flightInfo.return_date);

              flightInfoData = {
                id: flightInfoDoc.id,
                departingFrom: flightInfo.departing_from,
                arrivingTo: flightInfo.arriving_to,
                returningFrom: flightInfo.returning_from,
                returningTo: flightInfo.returning_to,
                departingTime: departingTime || new Date(),
                arrivingToTime: arrivingToTime || new Date(),
                returningFromTime: returningFromTime || new Date(),
                returningToTime: returningToTime || new Date(),
                departureDate: departureDate || new Date(),
                returnDate: returnDate || new Date(),
              };
            }
          } else {
            // New structure - nested object
            const departingTime = safeToDate(data.flight_info.departing_time);
            const arrivingToTime = safeToDate(
              data.flight_info.arriving_to_time
            );
            const returningFromTime = safeToDate(
              data.flight_info.returning_from_time
            );
            const returningToTime = safeToDate(
              data.flight_info.returning_to_time
            );
            const departureDate = safeToDate(data.flight_info.departure_date);
            const returnDate = safeToDate(data.flight_info.return_date);

            flightInfoData = {
              id: docSnapshot.id,
              departingFrom: data.flight_info.departing_from,
              arrivingTo: data.flight_info.arriving_to,
              returningFrom: data.flight_info.returning_from,
              returningTo: data.flight_info.returning_to,
              departingTime: departingTime || new Date(),
              arrivingToTime: arrivingToTime || new Date(),
              returningFromTime: returningFromTime || new Date(),
              returningToTime: returningToTime || new Date(),
              departureDate: departureDate || new Date(),
              returnDate: returnDate || new Date(),
            };
          }
        }

        const checkInDate = safeToDate(data.check_in_date);
        const checkOutDate = safeToDate(data.check_out_date);
        const checkInTime = safeToDate(data.check_in_time);
        const checkOutTime = safeToDate(data.check_out_time);
        const createdAt = safeToDate(data.createdAt);
        const updatedAt = safeToDate(data.updatedAt);

        return {
          id: docSnapshot.id,
          name: data.name,
          description: data.description,
          price: data.price,
          type: data.type,
          image: data.banner_image,
          rating: data.rating,
          allinclusive: data.is_all_inclusive,
          roomType: data.room_type,
          amenities: data.amenities,
          isFeatured: data.is_featured_package,
          bathrooms: data.baths,
          bedrooms: data.beds,
          guestAmount: data.guest_amount,
          checkInDate: checkInDate || new Date(),
          checkOutDate: checkOutDate || new Date(),
          checkInTime: checkInTime || new Date(),
          checkOutTime: checkOutTime || new Date(),
          flightInfo: flightInfoData,
          agent: data.agent,
          createdAt: createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: updatedAt?.toISOString() || new Date().toISOString(),
        } as Package;
      })
    );

    console.log("Processed packages:", packages);
    return {
      packages,
      lastVisible: lastVisibleDoc,
    };
  } catch (error) {
    console.error("Error getting agent packages:", error);
    throw error;
  }
};

// Get bookings for a specific user
export const getUserBookings = async (userId: string): Promise<Booking[]> => {
  try {
    console.log("Searching for bookings with userId:", userId);
    const bookingsCollection = collection(db, "bookings");
    const bookingDocs = new Map();
    
    // 1. Try client_id field
    const clientIdQuery = query(
      bookingsCollection,
      where("client_id", "==", userId),
      orderBy("created_at", "desc")
    );
    
    console.log("Querying by client_id field");
    const clientIdSnapshot = await getDocs(clientIdQuery);
    console.log(`Found ${clientIdSnapshot.size} bookings with client_id match`);
    clientIdSnapshot.forEach(doc => bookingDocs.set(doc.id, doc));
    
    // 2. Try clientId field
    const clientIdDirectQuery = query(
      bookingsCollection,
      where("clientId", "==", userId),
      orderBy("created_at", "desc")
    );
    
    console.log("Querying by clientId field");
    const clientIdDirectSnapshot = await getDocs(clientIdDirectQuery);
    console.log(`Found ${clientIdDirectSnapshot.size} bookings with clientId match`);
    clientIdDirectSnapshot.forEach(doc => bookingDocs.set(doc.id, doc));
    
    // 3. Try clientRelationship.userId field
    const clientRelationshipQuery = query(
      bookingsCollection,
      where("clientRelationship.userId", "==", userId),
      orderBy("created_at", "desc")
    );
    
    console.log("Querying by clientRelationship.userId field");
    const clientRelationshipSnapshot = await getDocs(clientRelationshipQuery);
    console.log(`Found ${clientRelationshipSnapshot.size} bookings with clientRelationship.userId match`);
    clientRelationshipSnapshot.forEach(doc => bookingDocs.set(doc.id, doc));
    
    // 4. Try user field if it's a direct reference
    const userQuery = query(
      bookingsCollection,
      where("user", "==", userId),
      orderBy("created_at", "desc")
    );
    
    console.log("Querying by user field");
    const userSnapshot = await getDocs(userQuery);
    console.log(`Found ${userSnapshot.size} bookings with user field match`);
    userSnapshot.forEach(doc => bookingDocs.set(doc.id, doc));
    
    // 5. Try user field if it's a path reference
    const userRefQuery = query(
      bookingsCollection,
      where("user", "==", `users/${userId}`),
      orderBy("created_at", "desc")
    );
    
    console.log("Querying by user field as path reference");
    const userRefSnapshot = await getDocs(userRefQuery);
    console.log(`Found ${userRefSnapshot.size} bookings with user path reference match`);
    userRefSnapshot.forEach(doc => bookingDocs.set(doc.id, doc));
    
    // 6. Try travelerInfo.email if it matches the userId (email)
    if (userId.includes('@')) {
      const emailQuery = query(
        bookingsCollection,
        where("travelerInfo.email", "==", userId),
        orderBy("created_at", "desc")
      );
      
      console.log("Querying by travelerInfo.email field");
      const emailSnapshot = await getDocs(emailQuery);
      console.log(`Found ${emailSnapshot.size} bookings with travelerInfo.email match`);
      emailSnapshot.forEach(doc => bookingDocs.set(doc.id, doc));
    }
    
    // If we haven't found any bookings, and the userId starts with 'embedded-',
    // try again with the ID portion after removing the 'embedded-' prefix
    if (bookingDocs.size === 0 && userId.startsWith('embedded-')) {
      const actualUserId = userId.replace('embedded-', '');
      console.log("Trying again with actual userId (without embedded- prefix):", actualUserId);
      return getUserBookings(actualUserId);
    }
    
    // Combine all results and convert to Booking objects
    const bookings = Array.from(bookingDocs.values()).map(doc => convertToBooking(doc));
    console.log(`Returning ${bookings.length} total bookings`);
    
    return bookings;
  } catch (error) {
    console.error("Error getting user bookings:", error);
    throw error;
  }
};
