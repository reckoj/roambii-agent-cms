// app/(dashboard)/packages/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/redux/hooks";
import Link from "next/link";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  StarIcon as StarIconSolid,
} from "@heroicons/react/24/solid";
import { StarIcon as StarIconOutline } from "@heroicons/react/24/outline";
import { DocumentSnapshot } from "firebase/firestore";
import {
  getAgentPackages,
  deletePackage,
  updatePackage,
  canFeatureMorePackages,
} from "@/lib/package-service";
import { Package } from "@/types/package";

export default function PackagesPage() {
  const router = useRouter();
  const { agent } = useAppSelector((state) => state.auth);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<{id: string} | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggleFeaturedLoading, setToggleFeaturedLoading] = useState<
    string | null
  >(null);

  // Load agent packages
  useEffect(() => {
    const loadPackages = async () => {
      if (!agent) {
        console.log('No agent found, skipping package load');
        return;
      }

      try {
        setLoading(true);
        console.log('Loading packages for agent:', agent);
        const result = await getAgentPackages(agent.id);
        console.log('Packages loaded:', result);
        setPackages(result.packages);
        setLastVisible(result.lastVisible);
        setHasMore(!!result.lastVisible);
      } catch (error) {
        console.error("Error loading packages:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPackages();
  }, [agent]);

  // Load more packages
  const handleLoadMore = async () => {
    if (!agent || !lastVisible || !hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      const result = await getAgentPackages(agent.id, lastVisible);
      setPackages([...packages, ...result.packages]);
      setLastVisible(result.lastVisible);
      setHasMore(!!result.lastVisible);
    } catch (error) {
      console.error("Error loading more packages:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Handle delete package
  const handleDeletePackage = async (packageId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this package? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setDeleting(packageId);
      await deletePackage(packageId);
      setPackages(packages.filter((pkg) => pkg.id !== packageId));
    } catch (error) {
      console.error("Error deleting package:", error);
      alert("Failed to delete package. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  // Toggle featured status
  const toggleFeatured = async (packageId: string, currentStatus: boolean) => {
    try {
      setToggleFeaturedLoading(packageId);

      // If trying to feature (currentStatus is false, so we're setting to true), check the limit
      if (!currentStatus && agent?.id) {
        const limitCheck = await canFeatureMorePackages(agent.id, packageId);
        if (!limitCheck.canFeature) {
          alert(limitCheck.message);
          return;
        }
      }

      await updatePackage(packageId, { isFeatured: !currentStatus });

      // Update the local state
      setPackages(
        packages.map((pkg) =>
          pkg.id === packageId ? { ...pkg, isFeatured: !currentStatus } : pkg
        )
      );
    } catch (error) {
      console.error("Error toggling featured status:", error);
      alert("Failed to update package. Please try again.");
    } finally {
      setToggleFeaturedLoading(null);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Packages</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all your travel packages that are available for booking.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:flex-none">
          <Link
            href="/packages/create"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Add Package
          </Link>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              {loading ? (
                <div className="bg-white p-6">
                  <div className="animate-pulse">
                    <div className="h-6 bg-slate-200 rounded w-1/4 mb-8"></div>
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="mb-6">
                        <div className="h-5 bg-slate-200 rounded w-3/4 mb-2"></div>
                        <div className="h-5 bg-slate-200 rounded w-1/2 mb-2"></div>
                        <div className="h-5 bg-slate-200 rounded w-1/3"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : packages.length === 0 ? (
                <div className="text-center py-12 bg-white">
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
                      strokeWidth={2}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No packages
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating a new package.
                  </p>
                  <div className="mt-6">
                    <Link
                      href="/packages/create"
                      className="inline-flex items-center rounded-md border border-transparent bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
                    >
                      <PlusIcon
                        className="-ml-1 mr-2 h-5 w-5"
                        aria-hidden="true"
                      />
                      Add Package
                    </Link>
                  </div>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                      >
                        Name
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Type
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Price
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Featured
                      </th>
                      <th
                        scope="col"
                        className="relative py-3.5 pl-3 pr-4 sm:pr-6"
                      >
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {packages.map((pkg) => (
                      <tr key={pkg.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {pkg.name}
                          <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                            {pkg.description
                              ? pkg.description.substring(0, 80) +
                                (pkg.description.length > 80 ? "..." : "")
                              : ""}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {pkg.type}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {formatCurrency(pkg.price)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <button
                            onClick={() =>
                              toggleFeatured(pkg.id, !!pkg.isFeatured)
                            }
                            disabled={toggleFeaturedLoading === pkg.id}
                            className="text-yellow-400 hover:text-yellow-500 focus:outline-none"
                          >
                            {toggleFeaturedLoading === pkg.id ? (
                              <svg
                                className="animate-spin h-5 w-5 text-yellow-400"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                            ) : pkg.isFeatured ? (
                              <StarIconSolid
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            ) : (
                              <StarIconOutline
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <div className="flex items-center justify-end space-x-3">
                            {/* <Link
                              href={`/packages/${pkg.id}`}
                              className="text-cyan-600 hover:text-cyan-900"
                            >
                              View <span className="sr-only">, {pkg.name}</span>
                            </Link> */}
                            <Link
                              href={`/packages/edit/${pkg.id}`}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <PencilIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                              <span className="sr-only">Edit, {pkg.name}</span>
                            </Link>
                            <button
                              onClick={() => handleDeletePackage(pkg.id)}
                              disabled={deleting === pkg.id}
                              className="text-red-600 hover:text-red-900"
                            >
                              {deleting === pkg.id ? (
                                <svg
                                  className="animate-spin h-5 w-5 text-red-600"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  ></path>
                                </svg>
                              ) : (
                                <TrashIcon
                                  className="h-5 w-5"
                                  aria-hidden="true"
                                />
                              )}
                              <span className="sr-only">
                                Delete, {pkg.name}
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Load more button */}
      {!loading && packages.length > 0 && hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
          >
            {loadingMore ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
