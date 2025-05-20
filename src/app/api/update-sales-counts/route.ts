import { NextResponse } from "next/server";
import { collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export async function GET() {
  try {
    // Get all bookings
    const bookingsRef = collection(db, "bookings");
    const bookingsSnapshot = await getDocs(bookingsRef);
    
    // Create a map to count bookings per package
    const packageCounts: Record<string, number> = {};
    
    // Count bookings for each package
    bookingsSnapshot.forEach(doc => {
      const data = doc.data();
      const packageId = data.package_id || data.packageId;
      
      if (packageId) {
        packageCounts[packageId] = (packageCounts[packageId] || 0) + 1;
      }
    });
    
    const results = [];
    
    // Update each package's sales count
    for (const [packageId, count] of Object.entries(packageCounts)) {
      try {
        const packageRef = doc(db, "package_info", packageId);
        const packageDoc = await getDoc(packageRef);
        
        if (packageDoc.exists()) {
          await updateDoc(packageRef, { 
            sales_count: count,
            updated_at: new Date()
          });
          results.push({
            packageId,
            name: packageDoc.data().name,
            count,
            success: true
          });
        } else {
          results.push({
            packageId,
            count,
            success: false,
            error: "Package not found"
          });
        }
      } catch (err: any) {
        results.push({
          packageId,
          count,
          success: false,
          error: err.message
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      totalBookings: bookingsSnapshot.size,
      uniquePackages: Object.keys(packageCounts).length,
      results
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 