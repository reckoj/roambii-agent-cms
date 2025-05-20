"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  fetchBookingByIdAsync,
  createBookingAsync,
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

export default function BookingFormPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  const { packages } = useAppSelector((state) => state.packages);

  const { agent } = useAppSelector((state) => state.auth);
  const { selectedBooking, loading, error } = useAppSelector(
    (state) => state.bookings
  );

  const isEdit = params?.action === "edit";
  const bookingId = params?.id as string;

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

  // Fetch booking details if editing
  useEffect(() => {
    if (isEdit && bookingId) {
      dispatch(fetchBookingByIdAsync(bookingId));
    }
  }, [isEdit, bookingId, dispatch]);

  // Populate form with booking data if editing
  useEffect(() => {
    if (isEdit && selectedBooking) {
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
        status: ['pending', 'confirmed', 'cancelled', 'completed'].includes(selectedBooking.status) 
          ? (selectedBooking.status as "pending" | "confirmed" | "cancelled" | "completed") 
          : "pending",
      });
    }
  }, [isEdit, selectedBooking]);

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

    if (!agent) {
      setFormError("User authentication error. Please sign in again.");
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

      const bookingData: Omit<Booking, "id"> = {
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        clientPhone: formData.clientPhone || undefined,
        packageId: formData.packageId,
        packageName: formData.packageName,
        agentId: agent.id,
        startDate: formData.startDate,
        endDate: formData.endDate,
        price,
        totalPaid: 0,
        balance: price,
        status: formData.status,
        travelers,
        notes: formData.notes || undefined,
        paymentStatus: "unpaid",
        clientId: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (isEdit) {
        await dispatch(
          updateBookingAsync({ id: bookingId, bookingData })
        ).unwrap();
      } else {
        await dispatch(createBookingAsync(bookingData)).unwrap();
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/bookings");
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

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link
          href="/bookings"
          className="inline-flex items-center text-cyan-600 hover:text-cyan-700"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Bookings
        </Link>
      </div>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-6 py-8 sm:p-10">
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? "Edit Booking" : "Create New Booking"}
          </h1>

          {/* Error message */}
          {(error || formError) && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
              {error || formError}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="mt-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
              Booking {isEdit ? "updated" : "created"} successfully!
              Redirecting...
            </div>
          )}

          {/* Loading state */}
          {loading && !success ? (
            <div className="mt-6 flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="mt-8 space-y-8">
              {/* Client Information Section */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Client Information
                </h2>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
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
                </div>
              </div>

              {/* Booking Details Section */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Booking Details
                </h2>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
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
                          {pkg.name} -{" "}
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(pkg.price)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!formData.packageId && (
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="packageName"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Package Name *
                      </label>
                      <input
                        type="text"
                        id="packageName"
                        name="packageName"
                        value={formData.packageName}
                        onChange={handleInputChange}
                        required
                        className="mt-1 focus:ring-cyan-500 focus:border-cyan-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  )}

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
                      selectsStart
                      startDate={formData.startDate}
                      endDate={formData.endDate}
                      className="mt-1 focus:ring-cyan-500 focus:border-cyan-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      dateFormat="MM/dd/yyyy"
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
                      selectsEnd
                      startDate={formData.startDate}
                      endDate={formData.endDate}
                      minDate={formData.startDate}
                      className="mt-1 focus:ring-cyan-500 focus:border-cyan-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      dateFormat="MM/dd/yyyy"
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
                        type="text"
                        id="price"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        required
                        className="focus:ring-cyan-500 focus:border-cyan-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                        placeholder="0.00"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span
                          className="text-gray-500 sm:text-sm"
                          id="price-currency"
                        >
                          USD
                        </span>
                      </div>
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

                  {isEdit && (
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
                  )}

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="notes"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={4}
                      value={formData.notes}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-cyan-500 focus:border-cyan-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="Special requirements, additional information, etc."
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => router.push("/bookings")}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 mr-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || success}
                  className="bg-cyan-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      {isEdit ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>{isEdit ? "Update Booking" : "Create Booking"}</>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
