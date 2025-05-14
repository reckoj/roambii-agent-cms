"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  PencilIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { Client } from "@/types/client";
import { getClientById, updateClientNotes, updateClientStatus, formatDate } from "@/lib/client-service";
import { useAppSelector } from "@/lib/redux/hooks";
import Modal from "@/components/shared/Modal";
import { Booking } from "@/types/booking";
import { getUserBookings } from "@/lib/booking-service";

// Format currency utility function
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

// Display date for UI
const displayDate = (date?: Date | any): string => {
  const formattedDate = formatDate(date);
  return formattedDate ? formattedDate.toLocaleDateString() : "N/A";
};

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { agent } = useAppSelector((state) => state.auth);
  const clientId = params?.id as string;
  
  // State
  const [client, setClient] = useState<Client | null>(null);
  const [clientBookings, setClientBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [clientNotes, setClientNotes] = useState("");
  const [notesLoading, setNotesLoading] = useState(false);
  
  // Load client data
  const loadClientData = async () => {
    if (!clientId || !agent) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("Loading client details:", JSON.stringify({
        clientId,
        agent: {
          id: agent.id,
          type: typeof agent.id,
          name: agent.name
        }
      }, null, 2));
      
      // Get client details
      const clientData = await getClientById(clientId);
      
      if (!clientData) {
        console.log("Client not found with ID:", clientId);
        setError("Client not found.");
        setLoading(false);
        return;
      }
      
      console.log("Client data retrieved:", JSON.stringify({
        id: clientData.id,
        agentId: clientData.agentId,
        userId: clientData.userId,
        match: clientData.agentId === agent.id ? "matches agent ID" : "DOES NOT MATCH agent ID"
      }, null, 2));
      
      // Security check: verify this agent can access this client
      if (clientData.agentId !== agent.id) {
        console.log("Security check failed: Agent IDs don't match", {
          clientAgentId: clientData.agentId,
          currentAgentId: agent.id
        });
        setError("You don't have permission to view this client's information.");
        setLoading(false);
        return;
      }
      
      setClient(clientData);
      setClientNotes(clientData.notes || "");
      
      // Load client's bookings
      if (clientData.userId) {
        try {
          console.log("Loading bookings for user ID:", clientData.userId);
          const bookings = await getUserBookings(clientData.userId);
          console.log(`Found ${bookings.length} bookings for this user`);
          
          const agentBookings = bookings.filter(
            (booking) => booking.agentId === agent.id
          );
          console.log(`After filtering for agent: ${agentBookings.length} bookings remain`);
          
          setClientBookings(agentBookings);
        } catch (bookingError) {
          console.error("Error loading bookings:", bookingError);
          // Don't set error, as client data was loaded successfully
        }
      }
    } catch (err) {
      console.error("Error loading client:", err);
      setError("Failed to load client data. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Handle notes update
  const handleSaveNotes = async () => {
    if (!client) return;
    
    setNotesLoading(true);
    try {
      await updateClientNotes(client.id, clientNotes);
      setClient({
        ...client,
        notes: clientNotes,
      });
      setNotesDialogOpen(false);
    } catch (err) {
      console.error("Error updating notes:", err);
      setError("Failed to update client notes. Please try again.");
    } finally {
      setNotesLoading(false);
    }
  };
  
  // Handle status toggle
  const handleToggleStatus = async () => {
    if (!client) return;
    
    try {
      const newStatus = client.status === "active" ? "inactive" : "active";
      await updateClientStatus(client.id, newStatus);
      setClient({
        ...client,
        status: newStatus,
      });
    } catch (err) {
      console.error("Error updating status:", err);
      setError("Failed to update client status. Please try again.");
    }
  };
  
  // Load data on mount
  useEffect(() => {
    if (agent) {
      loadClientData();
    }
  }, [agent, clientId]);
  
  // If not authenticated, show access denied
  if (!agent) {
    return (
      <div className="px-4 py-5 sm:p-6 bg-white shadow sm:rounded-lg text-center">
        <h3 className="text-lg font-medium text-gray-900">Unauthorized Access</h3>
        <div className="mt-2 text-sm text-gray-500">
          <p>Only agents can access client details.</p>
        </div>
        <div className="mt-5">
          <Link href="/dashboard" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }
  
  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/clients"
            className="inline-flex items-center text-cyan-600 hover:text-cyan-800"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Clients
          </Link>
        </div>
        
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-red-800">Error</h3>
            <div className="mt-2 max-w-xl text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => loadClientData()}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Client not found
  if (!client) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/clients"
            className="inline-flex items-center text-cyan-600 hover:text-cyan-800"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Clients
          </Link>
        </div>
        
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6 text-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Client Not Found</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500 mx-auto">
              <p>The client you're looking for could not be found.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/clients"
          className="inline-flex items-center text-cyan-600 hover:text-cyan-800"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Clients
        </Link>
      </div>
      
      {/* Client Header */}
      <div className="bg-white shadow sm:rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <div className="h-16 w-16 rounded-full bg-cyan-600 flex items-center justify-center mr-4">
                <span className="text-2xl font-bold text-white">
                  {client.contactInfo?.name?.charAt(0) || "C"}
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{client.contactInfo?.name || "Unknown"}</h3>
                <p className="text-sm text-gray-500">{client.contactInfo?.email || "No email"}</p>
                <p className="text-sm text-gray-500">{client.contactInfo?.phone || "No phone number"}</p>
              </div>
            </div>
            <div>
              <button
                onClick={handleToggleStatus}
                className={`inline-flex items-center px-3 py-1.5 border rounded-md text-sm font-medium ${
                  client.status === "active"
                    ? "border-green-300 bg-green-50 text-green-800"
                    : "border-gray-300 bg-gray-50 text-gray-800"
                }`}
              >
                {client.status === "active" ? (
                  <>
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    Active
                  </>
                ) : (
                  <>
                    <XCircleIcon className="h-4 w-4 mr-1" />
                    Inactive
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Client Stats */}
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Total Bookings</dt>
              <dd className="mt-1 text-xl font-semibold text-gray-900">{client.totalBookings}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Total Spent</dt>
              <dd className="mt-1 text-xl font-semibold text-gray-900">{formatCurrency(client.totalSpent)}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Last Booking</dt>
              <dd className="mt-1 text-xl font-semibold text-gray-900">{displayDate(client.lastBookingDate)}</dd>
            </div>
          </dl>
        </div>
      </div>
      
      {/* Client Notes */}
      <div className="bg-white shadow sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Notes</h3>
            <button
              type="button"
              onClick={() => setNotesDialogOpen(true)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
            >
              <PencilIcon className="h-4 w-4 mr-1" />
              Edit Notes
            </button>
          </div>
          <div className="mt-2 text-gray-600 prose max-w-none">
            {client.notes ? (
              <p>{client.notes}</p>
            ) : (
              <p className="text-gray-400 italic">No notes added yet.</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Bookings History */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Booking History</h3>
            <Link
              href={`/bookings?clientId=${client.userId}`}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
            >
              <CalendarIcon className="h-4 w-4 mr-1" />
              View All Bookings
            </Link>
          </div>
          
          {clientBookings.length === 0 ? (
            <div className="py-10 text-center border-t border-gray-200 mt-4">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings</h3>
              <p className="mt-1 text-sm text-gray-500">This client has no bookings yet.</p>
            </div>
          ) : (
            <div className="mt-4 border-t border-gray-200">
              <div className="flow-root">
                <ul className="divide-y divide-gray-200">
                  {clientBookings.map((booking) => (
                    <li key={booking.id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <span className={`inline-flex items-center justify-center h-10 w-10 rounded-md ${
                            booking.status === "confirmed" 
                              ? "bg-green-100 text-green-700" 
                              : booking.status === "cancelled"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}>
                            <CalendarIcon className="h-6 w-6" />
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/bookings/${booking.id}`}
                            className="text-sm font-medium text-cyan-600 hover:text-cyan-900 hover:underline truncate"
                          >
                            {booking.packageName}
                          </Link>
                          <p className="text-sm text-gray-500 truncate">
                            {displayDate(booking.startDate)} - {displayDate(booking.endDate)}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              booking.status === "confirmed"
                                ? "bg-green-100 text-green-800"
                                : booking.status === "cancelled"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </span>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(booking.price)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Notes dialog */}
      <Modal
        isOpen={notesDialogOpen}
        onClose={() => setNotesDialogOpen(false)}
        title="Client Notes"
      >
        <div className="mt-2">
          <textarea
            rows={6}
            className="shadow-sm focus:ring-cyan-500 focus:border-cyan-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="Add notes about this client..."
            value={clientNotes}
            onChange={(e) => setClientNotes(e.target.value)}
          />
        </div>
        <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-cyan-600 text-base font-medium text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 sm:col-start-2 sm:text-sm"
            onClick={handleSaveNotes}
            disabled={notesLoading}
          >
            {notesLoading ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 sm:mt-0 sm:col-start-1 sm:text-sm"
            onClick={() => setNotesDialogOpen(false)}
            disabled={notesLoading}
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}