// Migration script to update package sales counts from existing bookings
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
if (!getApps().length) {
  // Use service account if provided, otherwise use standard auth
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString()
    );
    initializeApp({
      credential: cert(serviceAccount)
    });
  } else {
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    });
  }
}

const db = getFirestore();

const updateSalesCounts = async () => {
  try {
    console.log("Starting sales count migration...");
    
    // Get all bookings
    const bookingsSnapshot = await db.collection("bookings").get();
    
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
      const packageRef = db.collection("package_info").doc(packageId);
      const packageDoc = await packageRef.get();
      
      if (packageDoc.exists) {
        await packageRef.update({ 
          sales_count: count,
          updated_at: new Date()
        });
        console.log(`Updated package ${packageId} with sales count: ${count}`);
      } else {
        console.log(`Package ${packageId} not found`);
      }
    }
    
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Error during migration:", error);
  }
};

// Execute the migration
updateSalesCounts().then(() => process.exit(0)); 