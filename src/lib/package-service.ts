import { Package } from "@/types/package";
import { db } from "./firebase/config";
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
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

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

// Safe date creation for Firestore
const safeCreateDate = (date: any): Date | null => {
  try {
    if (!date) return null;
    const parsedDate = safeToDate(date);
    if (parsedDate) return parsedDate;
    return null;
  } catch (error) {
    console.error("Error creating date for Firestore:", error);
    return null;
  }
};

export const createPackage = async (
  packageData: Package,
  agentId: string,
  imageFile?: File
) => {
  try {
    console.log("Starting package creation for agent:", agentId);

    // First verify if the user is an agent
    const agentRef = doc(db, "agents", agentId);
    const agentDoc = await getDoc(agentRef);

    if (!agentDoc.exists()) {
      console.error("Agent not found:", agentId);
      throw new Error("Agent not found");
    }

    const agentData = agentDoc.data();
    console.log("Agent data found:", agentData);

    // Handle image upload
    let imageUrl = "";
    if (imageFile) {
      console.log("Uploading image...");
      const storage = getStorage();
      const imageRef = ref(
        storage,
        `package_images/${agentId}/${Date.now()}_${imageFile.name}`
      );
      await uploadBytes(imageRef, imageFile);
      imageUrl = await getDownloadURL(imageRef);
      console.log("Image uploaded successfully:", imageUrl);
    }

    // Create the package document
    const now = new Date();
    const newPackage = {
      name: packageData.name,
      description: packageData.description || "",
      price: Number(packageData.price) || 0,
      type: packageData.type || "Hotel",
      banner_image: imageUrl,
      rating: Number(packageData.rating) || 0,
      agentId: agentId,
      agent: {
        id: agentId,
        name: agentData.name,
        avatar: agentData.avatar,
      },
      is_all_inclusive: packageData.allinclusive || false,
      room_type: packageData.roomType || "Standard Room",
      amenities: packageData.amenities || [],
      is_featured_package: false,
      baths: Number(packageData.bathrooms) || 0,
      beds: Number(packageData.bedrooms) || 0,
      sleeps: Number(packageData.bedrooms) || 0,
      guest_amount: Number(packageData.guestAmount) || 1,
      sales_count: 0,
      check_in_date: safeCreateDate(packageData.checkInDate) || now,
      check_out_date: safeCreateDate(packageData.checkOutDate) || now,
      check_in_time: safeCreateDate(packageData.checkInTime) || now,
      check_out_time: safeCreateDate(packageData.checkOutTime) || now,
      flight_info: {
        departing_from: packageData.flightInfo?.departingFrom || "",
        arriving_to: packageData.flightInfo?.arrivingTo || "",
        returning_from: packageData.flightInfo?.returningFrom || "",
        returning_to: packageData.flightInfo?.returningTo || "",
        departing_time: safeCreateDate(packageData.flightInfo?.departingTime),
        arriving_to_time: safeCreateDate(
          packageData.flightInfo?.arrivingToTime
        ),
        returning_from_time: safeCreateDate(
          packageData.flightInfo?.returningFromTime
        ),
        returning_to_time: safeCreateDate(
          packageData.flightInfo?.returningToTime
        ),
        departure_date: safeCreateDate(packageData.flightInfo?.departureDate),
        return_date: safeCreateDate(packageData.flightInfo?.returnDate),
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    console.log("Saving package to Firestore:", newPackage);
    const packageRef = collection(db, "package_info");
    const packageDoc = await addDoc(packageRef, newPackage);
    console.log("Package created with ID:", packageDoc.id);

    // Return the package in the format expected by the frontend
    return {
      id: packageDoc.id,
      name: newPackage.name,
      description: newPackage.description,
      price: newPackage.price,
      type: newPackage.type,
      image: newPackage.banner_image,
      rating: newPackage.rating,
      allinclusive: newPackage.is_all_inclusive,
      roomType: newPackage.room_type,
      amenities: newPackage.amenities,
      isFeatured: newPackage.is_featured_package,
      bathrooms: newPackage.baths,
      bedrooms: newPackage.beds,
      guestAmount: newPackage.guest_amount,
      salesCount: newPackage.sales_count,
      checkInDate: newPackage.check_in_date ? newPackage.check_in_date.toISOString() : new Date().toISOString(),
      checkOutDate: newPackage.check_out_date ? newPackage.check_out_date.toISOString() : new Date().toISOString(),
      checkInTime: newPackage.check_in_time ? newPackage.check_in_time.toISOString() : new Date().toISOString(),
      checkOutTime: newPackage.check_out_time ? newPackage.check_out_time.toISOString() : new Date().toISOString(),
      agent: newPackage.agent,
      flightInfo: {
        id: packageDoc.id,
        departingFrom: packageData.flightInfo?.departingFrom,
        arrivingTo: packageData.flightInfo?.arrivingTo,
        returningFrom: packageData.flightInfo?.returningFrom,
        returningTo: packageData.flightInfo?.returningTo,
        departingTime: packageData.flightInfo?.departingTime,
        arrivingToTime: packageData.flightInfo?.arrivingToTime,
        returningFromTime: packageData.flightInfo?.returningFromTime,
        returningToTime: packageData.flightInfo?.returningToTime,
        departureDate: packageData.flightInfo?.departureDate,
        returnDate: packageData.flightInfo?.returnDate,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Package;
  } catch (error) {
    console.error("Error creating package:", error);
    throw error;
  }
};

export const updatePackage = async (
  id: string,
  packageData: Partial<Package>,
  imageFile?: File
) => {
  try {
    let imageUrl = packageData.image;
    if (imageFile) {
      const storage = getStorage();
      const imageRef = ref(
        storage,
        `package_images/${packageData.agent?.id}/${Date.now()}_${imageFile.name}`
      );
      await uploadBytes(imageRef, imageFile);
      imageUrl = await getDownloadURL(imageRef);
    }

    const packageWithImage = {
      ...packageData,
      banner_image: imageUrl,
      updatedAt: serverTimestamp(),
    };

    const packageRef = doc(db, "package_info", id);
    await updateDoc(packageRef, packageWithImage);
    return { 
      id, 
      ...packageWithImage,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Package;
  } catch (error) {
    console.error("Error updating package:", error);
    throw error;
  }
};

export const getPackageById = async (id: string): Promise<Package | null> => {
  try {
    const packageRef = doc(db, "package_info", id);
    const packageDoc = await getDoc(packageRef);
    if (packageDoc.exists()) {
      const data = packageDoc.data();
      
      // Extract and convert all date fields
      const checkInDate = safeToDate(data.check_in_date);
      const checkOutDate = safeToDate(data.check_out_date);
      const checkInTime = safeToDate(data.check_in_time);
      const checkOutTime = safeToDate(data.check_out_time);
      const createdAt = safeToDate(data.createdAt);
      const updatedAt = safeToDate(data.updatedAt);
      
      // Convert dates to ISO strings
      const checkInDateISO = checkInDate?.toISOString() || new Date().toISOString();
      const checkOutDateISO = checkOutDate?.toISOString() || new Date().toISOString();
      const checkInTimeISO = checkInTime?.toISOString() || new Date().toISOString();
      const checkOutTimeISO = checkOutTime?.toISOString() || new Date().toISOString();
      const createdAtISO = createdAt?.toISOString() || new Date().toISOString();
      const updatedAtISO = updatedAt?.toISOString() || new Date().toISOString();
      
      // Flight info dates
      let flightInfoData = undefined;
      if (data.flight_info) {
        const departingTime = safeToDate(data.flight_info?.departing_time);
        const arrivingToTime = safeToDate(data.flight_info?.arriving_to_time);
        const returningFromTime = safeToDate(data.flight_info?.returning_from_time);
        const returningToTime = safeToDate(data.flight_info?.returning_to_time);
        const departureDate = safeToDate(data.flight_info?.departure_date);
        const returnDate = safeToDate(data.flight_info?.return_date);
        
        flightInfoData = {
          id: packageDoc.id,
          departingFrom: data.flight_info?.departing_from,
          arrivingTo: data.flight_info?.arriving_to,
          returningFrom: data.flight_info?.returning_from,
          returningTo: data.flight_info?.returning_to,
          departingTime: departingTime?.toISOString() || new Date().toISOString(),
          arrivingToTime: arrivingToTime?.toISOString() || new Date().toISOString(),
          returningFromTime: returningFromTime?.toISOString() || new Date().toISOString(),
          returningToTime: returningToTime?.toISOString() || new Date().toISOString(),
          departureDate: departureDate?.toISOString() || new Date().toISOString(),
          returnDate: returnDate?.toISOString() || new Date().toISOString(),
        };
      }
      
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
        salesCount: data.sales_count || 0,
        checkInDate: checkInDateISO,
        checkOutDate: checkOutDateISO,
        checkInTime: checkInTimeISO,
        checkOutTime: checkOutTimeISO,
        flightInfo: flightInfoData,
        agent: data.agent,
        createdAt: createdAtISO,
        updatedAt: updatedAtISO,
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting package:", error);
    throw error;
  }
};

export const getPackagesByAgent = async (
  agentId: string
): Promise<Package[]> => {
  try {
    const packagesQuery = query(
      collection(db, "packages"),
      where("agent.id", "==", agentId)
    );
    const querySnapshot = await getDocs(packagesQuery);
    return querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as Package)
    );
  } catch (error) {
    console.error("Error getting packages:", error);
    throw error;
  }
};

export const getAgentPackages = async (
  agentId: string,
  lastVisible?: { id: string } | null
): Promise<{ packages: Package[]; lastVisible: { id: string } | null }> => {
  try {
    console.log("Fetching packages for agent:", agentId);
    const PACKAGES_PER_PAGE = 10;
    let packagesQuery = query(
      collection(db, "package_info"),
      where("agentId", "==", agentId),
      orderBy("createdAt", "desc"),
      limit(PACKAGES_PER_PAGE)
    );

    if (lastVisible && lastVisible.id) {
      // Get the document reference to use for pagination
      const lastDoc = await getDoc(doc(db, "package_info", lastVisible.id));
      if (lastDoc.exists()) {
        packagesQuery = query(
          collection(db, "package_info"),
          where("agentId", "==", agentId),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(PACKAGES_PER_PAGE)
        );
      }
    }

    console.log("Executing query...");
    const querySnapshot = await getDocs(packagesQuery);
    console.log("Query returned", querySnapshot.size, "documents");

    const lastVisibleDoc =
      querySnapshot.docs[querySnapshot.docs.length - 1] || null;
    
    // Create a serializable version with just the ID
    const serializableLastVisible = lastVisibleDoc ? { id: lastVisibleDoc.id } : null;

    const packages = await Promise.all(
      querySnapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        console.log("Package data:", { id: docSnapshot.id, ...data });

        // Handle both old and new flight info structures
        let flightInfoData = undefined;
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
                departingTime: departingTime?.toISOString() || new Date().toISOString(),
                arrivingToTime: arrivingToTime?.toISOString() || new Date().toISOString(),
                returningFromTime: returningFromTime?.toISOString() || new Date().toISOString(),
                returningToTime: returningToTime?.toISOString() || new Date().toISOString(),
                departureDate: departureDate?.toISOString() || new Date().toISOString(),
                returnDate: returnDate?.toISOString() || new Date().toISOString(),
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
              departingTime: departingTime?.toISOString() || new Date().toISOString(),
              arrivingToTime: arrivingToTime?.toISOString() || new Date().toISOString(),
              returningFromTime: returningFromTime?.toISOString() || new Date().toISOString(),
              returningToTime: returningToTime?.toISOString() || new Date().toISOString(),
              departureDate: departureDate?.toISOString() || new Date().toISOString(),
              returnDate: returnDate?.toISOString() || new Date().toISOString(),
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
          salesCount: data.sales_count || 0,
          checkInDate: checkInDate?.toISOString() || new Date().toISOString(),
          checkOutDate: checkOutDate?.toISOString() || new Date().toISOString(),
          checkInTime: checkInTime?.toISOString() || new Date().toISOString(),
          checkOutTime: checkOutTime?.toISOString() || new Date().toISOString(),
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
      lastVisible: serializableLastVisible,
    };
  } catch (error) {
    console.error("Error getting agent packages:", error);
    throw error;
  }
};

export const deletePackage = async (id: string) => {
  try {
    const packageRef = doc(db, "package_info", id);
    await deleteDoc(packageRef);
    return true;
  } catch (error) {
    console.error("Error deleting package:", error);
    throw new Error("Failed to delete package. Please check your permissions.");
  }
};

// Add a function to check if a user is an agent
export const getCurrentUserAgent = async (userId: string) => {
  try {
    const agentRef = doc(db, "agents", userId);
    const agentDoc = await getDoc(agentRef);

    if (agentDoc.exists()) {
      return {
        id: agentDoc.id,
        ...agentDoc.data(),
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting agent:", error);
    throw error;
  }
};
