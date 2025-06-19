"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  fetchBookingByIdAsync,
  updateBookingAsync,
} from "@/lib/redux/slices/bookingSlice";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Booking } from "@/types/booking";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

type BookingFormData = {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  packageId: string;
  packageName: string;
  startDate: Date;
  endDate: Date;
  price: string;
  travelers: string;
  notes: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
};

export default function EditBookingPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  const bookingId = params?.id as string;
  const { packages } = useAppSelector((state) => state.packages);

  const { agent } = useAppSelector((state) => state.auth);
  const { selectedBooking, loading, error } = useAppSelector(
    (state) => state.bookings
  );

  const [formData, setFormData] = useState<BookingFormData>({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    packageId: "",
    packageName: "",
    startDate: new Date(),
    endDate: new Date(new Date().setDate(new Date().getDate() + 7)),
    price: "",
    travelers: "1",
    notes: "",
    status: "pending",
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);

  // Fetch booking details
  useEffect(() => {
    if (bookingId) {
      dispatch(fetchBookingByIdAsync(bookingId));
    }
  }, [bookingId, dispatch]);

  // Populate form with booking data
  useEffect(() => {
    if (selectedBooking) {
      const validStatuses = ["pending", "confirmed", "cancelled", "completed"];
      const status = validStatuses.includes(selectedBooking.status)
        ? (selectedBooking.status as "pending" | "confirmed" | "cancelled" | "completed")
        : "pending";
      
      setFormData({
        clientName: selectedBooking.clientName,
        clientEmail: selectedBooking.clientEmail,
        clientPhone: selectedBooking.clientPhone || "",
        packageId: selectedBooking.packageId,
        packageName: selectedBooking.packageName,
        startDate: selectedBooking.startDate
          ? new Date(selectedBooking.startDate)
          : new Date(),
        endDate: selectedBooking.endDate
          ? new Date(selectedBooking.endDate)
          : new Date(),
        price: selectedBooking.price.toString(),
        travelers: selectedBooking.travelers.toString(),
        notes: selectedBooking.notes || "",
        status: status,
      });
    }
  }, [selectedBooking]);

  // Handle input change
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Handle date change
  const handleDateChange = (date: Date | null, field: string) => {
    if (date) {
      setFormData({
        ...formData,
        [field]: date,
      });
    }
  };

  // Handle package selection
  const handlePackageSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const packageId = e.target.value;
    const selectedPkg = packages.find((pkg) => pkg.id === packageId);

    if (selectedPkg) {
      setFormData({
        ...formData,
        packageId,
        packageName: selectedPkg.name,
        price: selectedPkg.price.toString(),
      });
    } else {
      setFormData({
        ...formData,
        packageId: "",
        packageName: "",
        price: "",
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agent || !bookingId) {
      setFormError("Authentication or booking ID error. Please try again.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");

      const price = parseFloat(formData.price);
      const travelers = parseInt(formData.travelers, 10);

      if (isNaN(price) || price <= 0) {
        setFormError("Please enter a valid price.");
        setSubmitting(false);
        return;
      }

      if (isNaN(travelers) || travelers <= 0) {
        setFormError("Please enter a valid number of travelers.");
        setSubmitting(false);
        return;
      }

      const bookingData: Partial<Booking> = {
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        clientPhone: formData.clientPhone || undefined,
        packageId: formData.packageId,
        packageName: formData.packageName,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        price,
        balance: price - (selectedBooking?.totalPaid || 0),
        status: formData.status,
        travelers,
        notes: formData.notes || undefined,
        updatedAt: new Date().toISOString(),
      };

      await dispatch(updateBookingAsync({ id: bookingId, bookingData })).unwrap();

      setSuccess(true);
      setTimeout(() => {
        router.push(`/bookings/${bookingId}`);
      }, 1500);
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !selectedBooking) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Booking updated successfully!
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>Redirecting to booking details...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link
          href={`/bookings/${bookingId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Booking
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Edit Booking
        </h1>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {formError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{formError}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="clientName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Client Name *
                </label>
                <input
                  type="text"
                  id="clientName"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleInputChange}
                  required
                  className="mt-1 focus:ring-cyan-500 focus:border-cyan-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label
                  htmlFor="clientEmail"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Client Email *
                </label>
                <input
                  type="email"
                  id="clientEmail"
                  name="clientEmail"
                  value={formData.clientEmail}
                  onChange={handleInputChange}
                  required
                  className="mt-1 focus:ring-cyan-500 focus:border-cyan-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label
                  htmlFor="clientPhone"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Client Phone
                </label>
                <input
                  type="tel"
                  id="clientPhone"
                  name="clientPhone"
                  value={formData.clientPhone}
                  onChange={handleInputChange}
                  className="mt-1 focus:ring-cyan-500 focus:border-cyan-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label
                  htmlFor="packageId"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Package *
                </label>
                <select
                  id="packageId"
                  name="packageId"
                  value={formData.packageId}
                  onChange={handlePackageSelect}
                  required
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm rounded-md"
                >
                  <option value="">Select a package</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} - ${pkg.price.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="startDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Start Date *
                </label>
                <DatePicker
                  selected={formData.startDate}
                  onChange={(date) => handleDateChange(date, "startDate")}
                  className="mt-1 focus:ring-cyan-500 focus:border-cyan-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  dateFormat="MM/dd/yyyy"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="endDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  End Date *
                </label>
                <DatePicker
                  selected={formData.endDate}
                  onChange={(date) => handleDateChange(date, "endDate")}
                  className="mt-1 focus:ring-cyan-500 focus:border-cyan-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  dateFormat="MM/dd/yyyy"
                  minDate={formData.startDate}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="price"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Price *
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    required
                    className="focus:ring-cyan-500 focus:border-cyan-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="travelers"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Number of Travelers *
                </label>
                <input
                  type="number"
                  id="travelers"
                  name="travelers"
                  value={formData.travelers}
                  onChange={handleInputChange}
                  min="1"
                  required
                  className="mt-1 focus:ring-cyan-500 focus:border-cyan-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Status *
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm rounded-md"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="mt-1 focus:ring-cyan-500 focus:border-cyan-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                placeholder="Additional notes about this booking..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Link
                href={`/bookings/${bookingId}`}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block"
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
                    Updating...
                  </>
                ) : (
                  "Update Booking"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 