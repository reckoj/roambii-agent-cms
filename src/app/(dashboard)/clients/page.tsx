"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  ChatBubbleLeftIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  UsersIcon,
  TagIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { Client, ClientFilter } from "@/types/client";
import {
  getAgentClients,
  getAgentClientsFromBookings,
  formatDate,
  updateClientNotes,
} from "@/lib/client-service";
import { useAppSelector } from "@/lib/redux/hooks";
import Modal from "@/components/shared/Modal";
import { getBookingStats } from "@/lib/booking-service";
import { getAgentPackages } from "@/lib/booking-service";

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

export default function ClientsPage() {
  const router = useRouter();
  const { agent } = useAppSelector((state) => state.auth);

  // State
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientNotes, setClientNotes] = useState("");
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [sortBy, setSortBy] = useState<
    "lastBookingDate" | "totalSpent" | "totalBookings"
  >("lastBookingDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [dashboardStats, setDashboardStats] = useState({
    packageCount: 0,
    clientCount: 0,
    totalRevenue: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Load dashboard stats
  const loadDashboardStats = async () => {
    if (!agent) return;

    setStatsLoading(true);

    try {
      // Get booking stats (revenue)
      const bookingStats = await getBookingStats(agent.id);

      // Get package count
      const packageData = await getAgentPackages(agent.id);

      // Keep existing client count when updating stats
      setDashboardStats(prev => ({
        packageCount: packageData.packages.length,
        clientCount: prev.clientCount, // Preserve the existing client count
        totalRevenue: bookingStats.revenue,
      }));
      
      return {
        packageCount: packageData.packages.length,
        totalRevenue: bookingStats.revenue
      };
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
      return null;
    } finally {
      setStatsLoading(false);
    }
  };

  // Load clients
  const loadClients = async () => {
    if (!agent) return;

    setLoading(true);
    setError(null);

    try {
      console.log(
        "Loading clients for agent:",
        JSON.stringify(
          {
            id: agent.id,
            type: typeof agent.id,
            name: agent.name,
            email: agent.email,
            fullAgent: agent,
          },
          null,
          2
        )
      );

      let clientsData: Client[] = [];
      let errorMessage = "";

      // First try to get clients from the dedicated clients collection
      try {
        clientsData = await getAgentClients(agent.id, {
          sortBy,
          sortDirection,
        });
        console.log(
          `Found ${clientsData.length} clients in dedicated collection`
        );
      } catch (error) {
        console.error("Error fetching from clients collection:", error);
        errorMessage += "Failed to query clients collection. ";
      }

      // If no clients found, try the embedded approach
      if (clientsData.length === 0) {
        console.log(
          "No clients found in clients collection, trying embedded approach"
        );

        try {
          // Force agent ID to string if somehow not a string
          const agentIdToUse =
            typeof agent.id === "string" ? agent.id : String(agent.id);
          clientsData = await getAgentClientsFromBookings(agentIdToUse, {
            sortBy,
            sortDirection,
          });
          console.log(
            `Found ${clientsData.length} clients using embedded approach`
          );
        } catch (error) {
          console.error("Error with embedded approach:", error);
          errorMessage += "Failed to query embedded client relationships. ";
        }
      }

      // Security check: filter to only include clients where this agent is the agent
      clientsData = clientsData.filter((client) => client.agentId === agent.id);
      console.log(
        `After security filter: ${clientsData.length} clients remain`
      );

      setClients(clientsData);

      // Update client count in dashboard stats - directly set the client count
      setDashboardStats((prev) => ({
        ...prev,
        clientCount: clientsData.length
      }));
      
      console.log(`Setting dashboardStats.clientCount to ${clientsData.length}`);

      // Show error if all methods failed and no clients were found
      if (clientsData.length === 0 && errorMessage) {
        setError(
          "Some methods to fetch client relationships failed. Results may be incomplete."
        );
      }
      
      return clientsData; // Return the client data
    } catch (error) {
      console.error("Error loading clients:", error);
      setError("Failed to load clients. Please try again.");
      return []; // Return empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Handle sort change
  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (newSortBy === sortBy) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field and default to descending
      setSortBy(newSortBy);
      setSortDirection("desc");
    }
    setFilterMenuOpen(false);
  };

  // Handle client note updates
  const handleOpenNotesDialog = (client: Client) => {
    setSelectedClient(client);
    setClientNotes(client.notes || "");
    setNotesDialogOpen(true);
  };

  const handleSaveNotes = async () => {
    if (!selectedClient) return;

    setNotesLoading(true);
    try {
      await updateClientNotes(selectedClient.id, clientNotes);

      // Update local state
      setClients(
        clients.map((client) =>
          client.id === selectedClient.id
            ? { ...client, notes: clientNotes }
            : client
        )
      );

      setNotesDialogOpen(false);
    } catch (error) {
      console.error("Error updating client notes:", error);
      setError("Failed to update client notes. Please try again.");
    } finally {
      setNotesLoading(false);
    }
  };

  // Filter clients based on search text
  const filteredClients = clients.filter((client) => {
    if (!searchText) return true;

    const searchLower = searchText.toLowerCase();
    return (
      client.contactInfo?.name?.toLowerCase().includes(searchLower) ||
      client.contactInfo?.email?.toLowerCase().includes(searchLower) ||
      client.contactInfo?.phone?.toLowerCase().includes(searchLower)
    );
  });

  // Load clients and stats on initial render
  useEffect(() => {
    const loadData = async () => {
      if (agent) {
        await loadClients();
        await loadDashboardStats();
      }
    };
    
    loadData();
  }, [agent, sortBy, sortDirection]);

  // If not authenticated, show access denied
  if (!agent) {
    return (
      <div className="px-4 py-5 sm:p-6 bg-white shadow sm:rounded-lg text-center">
        <h3 className="text-lg font-medium text-gray-900">
          Unauthorized Access
        </h3>
        <div className="mt-2 text-sm text-gray-500">
          <p>Only agents can access the clients page.</p>
        </div>
        <div className="mt-5">
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your client relationships and view booking history
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center">
          <button
            onClick={() => {
              loadClients();
              loadDashboardStats();
            }}
            className="mr-3 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Refresh
          </button>

          <div className="relative inline-block text-left">
            <button
              type="button"
              className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
              onClick={() => setFilterMenuOpen(!filterMenuOpen)}
            >
              Sort by
              <ChevronDownIcon
                className="ml-2 -mr-1 h-5 w-5"
                aria-hidden="true"
              />
            </button>

            {filterMenuOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                <div className="py-1" role="menu" aria-orientation="vertical">
                  <button
                    className={`block px-4 py-2 text-sm w-full text-left ${
                      sortBy === "lastBookingDate"
                        ? "text-cyan-700 bg-gray-100"
                        : "text-gray-700"
                    }`}
                    onClick={() => handleSortChange("lastBookingDate")}
                  >
                    Last Booking Date{" "}
                    {sortBy === "lastBookingDate" &&
                      (sortDirection === "asc"
                        ? "(Oldest First)"
                        : "(Newest First)")}
                  </button>
                  <button
                    className={`block px-4 py-2 text-sm w-full text-left ${
                      sortBy === "totalSpent"
                        ? "text-cyan-700 bg-gray-100"
                        : "text-gray-700"
                    }`}
                    onClick={() => handleSortChange("totalSpent")}
                  >
                    Total Spent{" "}
                    {sortBy === "totalSpent" &&
                      (sortDirection === "asc"
                        ? "(Low to High)"
                        : "(High to Low)")}
                  </button>
                  <button
                    className={`block px-4 py-2 text-sm w-full text-left ${
                      sortBy === "totalBookings"
                        ? "text-cyan-700 bg-gray-100"
                        : "text-gray-700"
                    }`}
                    onClick={() => handleSortChange("totalBookings")}
                  >
                    Number of Bookings{" "}
                    {sortBy === "totalBookings" &&
                      (sortDirection === "asc"
                        ? "(Low to High)"
                        : "(High to Low)")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="mt-6 mb-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {/* Clients stat */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon
                    className="h-6 w-6 text-cyan-600"
                    aria-hidden="true"
                  />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Clients
                    </dt>
                    <dd>
                      {statsLoading ? (
                        <div className="h-7 w-16 bg-gray-200 animate-pulse rounded"></div>
                      ) : (
                        <div className="text-lg font-medium text-gray-900">
                          {dashboardStats.clientCount}
                        </div>
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Packages stat */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TagIcon
                    className="h-6 w-6 text-cyan-600"
                    aria-hidden="true"
                  />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Packages
                    </dt>
                    <dd>
                      {statsLoading ? (
                        <div className="h-7 w-16 bg-gray-200 animate-pulse rounded"></div>
                      ) : (
                        <div className="text-lg font-medium text-gray-900">
                          {dashboardStats.packageCount}
                        </div>
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue stat */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon
                    className="h-6 w-6 text-cyan-600"
                    aria-hidden="true"
                  />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Revenue
                    </dt>
                    <dd>
                      {statsLoading ? (
                        <div className="h-7 w-28 bg-gray-200 animate-pulse rounded"></div>
                      ) : (
                        <div className="text-lg font-medium text-gray-900">
                          {formatCurrency(dashboardStats.totalRevenue)}
                        </div>
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="mt-6 mb-6">
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </div>
          <input
            type="text"
            className="focus:ring-cyan-500 focus:border-cyan-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
            placeholder="Search clients by name or email"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 my-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredClients.length === 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md py-10 px-4 text-center">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            No clients found
          </h3>
          <p className="mt-1 text-gray-500">
            {searchText
              ? "No clients match your search criteria."
              : "When travelers book your packages, they'll appear here as client relationships."}
          </p>
        </div>
      )}

      {/* Client cards */}
      {!loading && filteredClients.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className={`relative rounded-lg border border-gray-200 bg-white px-6 py-5 shadow-sm hover:shadow-md transition-shadow duration-200 ${
                client.status === "inactive" ? "opacity-70" : ""
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-cyan-600 flex items-center justify-center">
                  <span className="text-white font-medium">
                    {client.contactInfo?.name?.charAt(0) || "C"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/clients/${client.id}`}
                    className="focus:outline-none"
                  >
                    <span className="absolute inset-0" aria-hidden="true" />
                    <p className="text-lg font-medium text-gray-900 truncate">
                      {client.contactInfo?.name || "Unknown"}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {client.contactInfo?.email || "No email"}
                    </p>
                  </Link>
                </div>
                <div className="flex-shrink-0">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      client.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {client.status.charAt(0).toUpperCase() +
                      client.status.slice(1)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="border-r border-gray-200">
                  <p className="text-lg font-semibold text-gray-900">
                    {client.totalBookings}
                  </p>
                  <p className="text-xs text-gray-500">Bookings</p>
                </div>
                <div className="border-r border-gray-200">
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(client.totalSpent)}
                  </p>
                  <p className="text-xs text-gray-500">Total Spent</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {displayDate(client.lastBookingDate)}
                  </p>
                  <p className="text-xs text-gray-500">Last Booking</p>
                </div>
              </div>

              {/* <div className="mt-4 flex justify-around border-t border-gray-200 pt-4">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleOpenNotesDialog(client);
                  }}
                  className="text-cyan-600 hover:text-cyan-900 flex items-center"
                >
                  <PencilIcon className="h-4 w-4 mr-1" />
                  <span className="text-sm">Notes</span>
                </button>
                
                <Link
                  href={`/bookings?clientId=${client.userId}`}
                  className="text-cyan-600 hover:text-cyan-900 flex items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  <span className="text-sm">Bookings</span>
                </Link>
                
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    // Navigate to chat with this client
                    // This functionality can be implemented later
                    alert("Chat functionality coming soon");
                  }}
                  className="text-cyan-600 hover:text-cyan-900 flex items-center"
                >
                  <ChatBubbleLeftIcon className="h-4 w-4 mr-1" />
                  <span className="text-sm">Chat</span>
                </button>
              </div> */}
            </div>
          ))}
        </div>
      )}

      {/* Notes dialog */}
      <Modal
        isOpen={notesDialogOpen}
        onClose={() => setNotesDialogOpen(false)}
        title="Client Notes"
      >
        <div className="mt-2">
          <textarea
            rows={4}
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
