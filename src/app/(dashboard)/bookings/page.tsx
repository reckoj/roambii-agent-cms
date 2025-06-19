"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BookingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the bookings list page
    router.replace("/bookings/list");
  }, [router]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to bookings...</p>
      </div>
    </div>
  );
}
