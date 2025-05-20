import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export async function GET(request: NextRequest) {
  // Parse agent_id from query string
  const searchParams = request.nextUrl.searchParams;
  const agentId = searchParams.get('agent_id');
  
  if (!agentId) {
    return NextResponse.json({
      error: "Missing agent_id parameter"
    }, { status: 400 });
  }
  
  try {
    const bookingsRef = collection(db, "bookings");
    const bookingDocs = new Map();
    
    // 1. Try agent_id field
    const agentIdQuery = query(bookingsRef, where("agent_id", "==", agentId));
    const agentIdSnapshot = await getDocs(agentIdQuery);
    agentIdSnapshot.forEach(doc => bookingDocs.set(doc.id, doc));
    
    // 2. Try agentId field
    const agentIdCamelQuery = query(bookingsRef, where("agentId", "==", agentId));
    const agentIdCamelSnapshot = await getDocs(agentIdCamelQuery);
    agentIdCamelSnapshot.forEach(doc => bookingDocs.set(doc.id, doc));
    
    // 3. Try packageDetails.agent.id field
    const packageAgentQuery = query(bookingsRef, where("packageDetails.agent.id", "==", agentId));
    const packageAgentSnapshot = await getDocs(packageAgentQuery);
    packageAgentSnapshot.forEach(doc => bookingDocs.set(doc.id, doc));
    
    // 4. Try agent.id field
    const agentObjectQuery = query(bookingsRef, where("agent.id", "==", agentId));
    const agentObjectSnapshot = await getDocs(agentObjectQuery);
    agentObjectSnapshot.forEach(doc => bookingDocs.set(doc.id, doc));
    
    // Process all bookings
    const snapshot = Array.from(bookingDocs.values());
    const revenueDetails = [];
    let totalRevenue = 0;
    let confirmedRevenue = 0;
    let pendingRevenue = 0;
    let cancelledRevenue = 0;
    
    // Detailed breakdown of each booking
    for (const doc of snapshot) {
      const data = doc.data();
      const priceFromMain = parseFloat(data.price) || 0;
      const priceFromPayment = parseFloat(data.payment?.amount) || 0;
      const priceFromPackageDetails = parseFloat(data.packageDetails?.price) || 0;
      const totalPaid = parseFloat(data.total_paid || data.totalPaid) || 0;
      
      // Use the first non-zero price
      const price = priceFromMain || priceFromPayment || priceFromPackageDetails || 0;
      totalRevenue += price;
      
      // Track revenue by status
      const status = (data.status || '').toLowerCase();
      if (status === 'confirmed' || status === 'completed' || status === 'complete') {
        confirmedRevenue += price;
      } else if (status === 'pending' || status === '') {
        pendingRevenue += price;
      } else if (status === 'cancelled' || status === 'canceled') {
        cancelledRevenue += price;
      } else {
        // Default unknown statuses to pending
        pendingRevenue += price;
      }
      
      // Record details for debugging
      revenueDetails.push({
        id: doc.id,
        clientName: data.client_name || data.clientName || "Unknown",
        packageName: data.package_name || data.packageName || "Unknown Package",
        status: data.status || "unknown",
        price: price,
        priceSource: priceFromMain ? "price" : priceFromPayment ? "payment.amount" : "packageDetails.price",
        priceSources: {
          main: priceFromMain,
          payment: priceFromPayment,
          packageDetails: priceFromPackageDetails
        },
        totalPaid: totalPaid,
        balance: parseFloat(data.balance) || (price - totalPaid),
        createdAt: data.created_at || data.createdAt,
      });
    }
    
    // Sort by price (descending)
    revenueDetails.sort((a, b) => b.price - a.price);
    
    return NextResponse.json({
      success: true,
      agentId,
      revenueBreakdown: {
        total: totalRevenue,
        confirmed: confirmedRevenue,
        pending: pendingRevenue,
        cancelled: cancelledRevenue
      },
      bookingCount: snapshot.length,
      bookings: revenueDetails
    });
  } catch (error: any) {
    console.error("Error in debug-revenue route:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 