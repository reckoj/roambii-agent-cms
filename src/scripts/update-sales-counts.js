// Migration script to update package sales counts from existing bookings
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc 
} from "firebase/firestore";

// Initialize Firebase with your web config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const updateSalesCounts = async () => {
  try {
    console.log("Starting sales count migration...");
    
    // Get all bookings
    const bookingsRef = collection(db, "bookings");
    const bookingsSnapshot = await getDocs(bookingsRef);
    
    console.log(`Found ${bookingsSnapshot.size} total bookings`);
    
    // Create a map to count bookings per package
    const packageCounts = {};
    
    // Count bookings for each package
    bookingsSnapshot.forEach(doc => {
      const data = doc.data();
      const packageId = data.package_id || data.packageId;
      
      if (packageId) {
        packageCounts[packageId] = (packageCounts[packageId] || 0) + 1;
      } else {
        console.log(`Booking ${doc.id} has no packageId`);
      }
    });
    
    console.log(`Found bookings for ${Object.keys(packageCounts).length} unique packages`);
    
    // Update each package's sales count
    for (const [packageId, count] of Object.entries(packageCounts)) {
      try {
        const packageRef = doc(db, "package_info", packageId);
        const packageDoc = await getDoc(packageRef);
        
        if (packageDoc.exists()) {
          await updateDoc(packageRef, { 
            sales_count: count,
            updatedAt: new Date()
          });
          console.log(`Updated package ${packageId} with sales count: ${count}`);
        } else {
          console.log(`Package ${packageId} not found`);
        }
      } catch (err) {
        console.error(`Error updating package ${packageId}:`, err);
      }
    }
    
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Error during migration:", error);
  }
};

// Execute the migration
updateSalesCounts().then(() => {
  console.log("Migration script execution finished");
  // Allow time for Firebase operations to complete before exiting
  setTimeout(() => process.exit(0), 5000);
}); 