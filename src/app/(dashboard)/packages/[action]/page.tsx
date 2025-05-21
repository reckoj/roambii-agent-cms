"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  createPackage,
  updatePackage,
  getPackageById,
} from "@/lib/package-service";
import { Package } from "@/types/package";
import { ArrowLeft, Upload, X } from "lucide-react";
import Link from "next/link";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const PACKAGE_TYPES = [
  "Villa",
  "Resort",
  "Hotel",
  "Motel",
  "BnB",
];

const ROOM_TYPES = [
  "Standard Room",
  "Deluxe Room",
  "Suite",
  "Superior Room",
  "Double Room",
  "Presidential Suite",
  "Junior Suite",
];

const AMENITIES = [
  "WiFi",
  "Pool",
  "Spa",
  "Gym",
  "Restaurant",
  "Bar",
  "Room Service",
  "Air Conditioning",
  "TV",
  "Mini Bar",
  "Safe",
  "Parking",
  "Beach Access",
  "Business Center",
  "Laundry Service",
];

// Update the PackageFormData type to include all required fields
type PackageFormData = {
  name: string;
  description: string;
  price: number | '';
  type: string;
  amenities: string[];
  allinclusive: boolean;
  roomType: string;
  bedrooms: number | '';
  bathrooms: number | '';
  guestAmount: number | '';
  rating: number | '';
  isFeatured: boolean;
  checkInDate: Date;
  checkOutDate: Date;
  checkInTime: Date;
  checkOutTime: Date;
  agent?: {
    id: string;
    name: string;
    avatar?: string;
  };
  id?: string;
};

export default function PackageFormPage() {
  const router = useRouter();
  const params = useParams();
  const { agent } = useAppSelector((state) => state.auth);
  const isEdit = params?.action === "edit";
  const packageId = params?.id as string;

  const [formData, setFormData] = useState<PackageFormData>({
    name: "",
    description: "",
    price: "",
    type: "Hotel",
    amenities: [],
    allinclusive: false,
    roomType: "Standard Room",
    bedrooms: "",
    bathrooms: "",
    guestAmount: "",
    rating: "",
    isFeatured: false,
    checkInDate: new Date(),
    checkOutDate: new Date(new Date().setDate(new Date().getDate() + 1)),
    checkInTime: new Date(new Date().setHours(15, 0, 0, 0)),
    checkOutTime: new Date(new Date().setHours(11, 0, 0, 0)),
  });

  const [flightInfo, setFlightInfo] = useState<Package["flightInfo"]>({
    id: "",
    departingFrom: "",
    arrivingTo: "",
    returningFrom: "",
    returningTo: "",
    departingTime: new Date(),
    arrivingToTime: new Date(),
    returningFromTime: new Date(),
    returningToTime: new Date(),
    departureDate: new Date(),
    returnDate: new Date(),
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [showCheckInTime, setShowCheckInTime] = useState(false);
  const [showCheckOutTime, setShowCheckOutTime] = useState(false);

  useEffect(() => {
    if (isEdit && packageId) {
      loadPackage();
    }
  }, [isEdit, packageId]);

  const loadPackage = async () => {
    try {
      setLoading(true);
      const pkg = await getPackageById(packageId);
      if (pkg) {
        const formData: PackageFormData = {
          name: pkg.name ?? "",
          description: pkg.description ?? "",
          price: pkg.price ?? "",
          type: pkg.type ?? "Hotel",
          amenities: pkg.amenities ?? [],
          allinclusive: pkg.allinclusive ?? false,
          roomType: pkg.roomType ?? "Standard Room",
          bedrooms: pkg.bedrooms ?? "",
          bathrooms: pkg.bathrooms ?? "",
          guestAmount: pkg.guestAmount ?? "",
          rating: pkg.rating ?? "",
          isFeatured: pkg.isFeatured ?? false,
          checkInDate: pkg.checkInDate ? new Date(pkg.checkInDate) : new Date(),
          checkOutDate: pkg.checkOutDate ? new Date(pkg.checkOutDate) : new Date(),
          checkInTime: pkg.checkInTime ? new Date(pkg.checkInTime) : new Date(),
          checkOutTime: pkg.checkOutTime ? new Date(pkg.checkOutTime) : new Date(),
          agent: pkg.agent,
          id: pkg.id,
        };
        setFormData(formData);
        if (pkg.flightInfo) {
          setFlightInfo(pkg.flightInfo);
        }
        if (pkg.image) {
          setImagePreview(pkg.image);
        }
      }
    } catch (err) {
      setError("Failed to load package details");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    // Handle empty values
    if (value === "") {
      setFormData((prev) => ({
        ...prev,
        [name]: "",
      }));
      return;
    }

    // Handle number inputs
    if (type === "number") {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        setFormData((prev) => ({
          ...prev,
          [name]: numValue,
        }));
      }
      return;
    }

    // Handle all other inputs
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleAmenityChange = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities?.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...(prev.amenities || []), amenity],
    }));
  };

  const handleFlightInfoChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFlightInfo((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const handleDateChange = (date: Date | null, name: string) => {
    if (date) {
      setFormData((prev) => ({
        ...prev,
        [name]: date,
      }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    // Reset the input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    setImagePreview("");
    setImageFile(null);
    // Reset the file input
    const fileInput = document.getElementById('image') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Check if flight info is populated
  const hasFlightInfo = () => {
    return flightInfo && (
      flightInfo.departingFrom || 
      flightInfo.arrivingTo || 
      flightInfo.returningFrom || 
      flightInfo.returningTo
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agent) return;

    try {
      setLoading(true);
      setError("");
      setSuccess(false);

      const packageData: Package = {
        ...formData,
        id: isEdit ? packageId : crypto.randomUUID(),
        price: formData.price === "" ? 0 : formData.price,
        bathrooms: formData.bathrooms === "" ? 0 : formData.bathrooms,
        bedrooms: formData.bedrooms === "" ? 0 : formData.bedrooms,
        guestAmount: formData.guestAmount === "" ? 0 : formData.guestAmount,
        rating: formData.rating === "" ? 0 : formData.rating,
        agent: agent
          ? {
              id: agent.id,
              name: agent.name,
              avatar: agent.avatar,
            }
          : { id: "", name: "" },
        flightInfo: hasFlightInfo() ? flightInfo : undefined,
        salesCount: isEdit && formData.id ? (await getPackageById(formData.id))?.salesCount || 0 : 0,
      };

      console.log('Submitting package data:', packageData);
      console.log('Current agent:', agent);

      if (isEdit) {
        await updatePackage(packageId, packageData, imageFile || undefined);
      } else {
        await createPackage(packageData, agent.id, imageFile || undefined);
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/packages");
      }, 2000);
    } catch (err) {
      console.error('Error saving package:', err);
      setError("Failed to save package. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading && isEdit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/packages"
            className="inline-flex items-center text-teal-600 hover:text-teal-700 text-lg"
          >
            <ArrowLeft className="h-6 w-6 mr-2" />
            Back to Packages
          </Link>
        </div>

        <div className="bg-white shadow-xl rounded-lg">
          <div className="px-6 py-8 sm:p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              {isEdit ? "Edit Package" : "Create New Package"}
            </h1>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-base text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
                <p className="text-base text-teal-600">
                  Package {isEdit ? "updated" : "created"} successfully!
                  Redirecting...
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Property Information Section */}
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Property Information
                </h2>

                {/* Image Upload */}
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Banner Image
                  </label>
                  <div className="flex items-center space-x-6">
                    {imagePreview && (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Package preview"
                          className="h-48 w-48 object-cover rounded-lg shadow-md"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
                          title="Remove image"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    )}

                    <div className="flex-1">
                      <label
                        htmlFor="image"
                        className={`flex items-center justify-center px-6 py-4 border-2 border-gray-300 rounded-lg shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors ${
                          imagePreview ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      >
                        <Upload className="h-6 w-6 mr-3" />
                        {imagePreview ? 'Image Uploaded' : 'Upload Image'}
                      </label>
                      <input
                        type="file"
                        id="image"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        disabled={!!imagePreview}
                      />
                      {imagePreview && (
                        <p className="mt-2 text-sm text-gray-500">
                          Remove the current image to upload a new one
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Property Type */}
                <div>
                  <label
                    htmlFor="type"
                    className="block text-base font-medium text-gray-700 mb-2"
                  >
                    Property Type
                  </label>
                  <select
                    name="type"
                    id="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-base py-3 px-4 text-gray-900 placeholder-gray-800"
                  >
                    {PACKAGE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name and Price */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-base font-medium text-gray-700 mb-2"
                    >
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter package name"
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-base py-3 px-4 text-gray-900 placeholder-gray-800"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="price"
                      className="block text-base font-medium text-gray-700 mb-2"
                    >
                      Price
                    </label>
                    <div className="mt-1 relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-lg">$</span>
                      </div>
                      <input
                        type="number"
                        name="price"
                        id="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        required
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="block w-full pl-8 rounded-lg border-gray-300 focus:border-teal-500 focus:ring-teal-500 text-base py-3 px-4 text-gray-900 placeholder-gray-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Bedrooms, Bathrooms, Rating */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div>
                    <label
                      htmlFor="bedrooms"
                      className="block text-base font-medium text-gray-700 mb-2"
                    >
                      Bedrooms
                    </label>
                    <input
                      type="number"
                      name="bedrooms"
                      id="bedrooms"
                      value={formData.bedrooms}
                      onChange={handleInputChange}
                      min="0"
                      placeholder="Enter number of bedrooms"
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-base py-3 px-4 text-gray-900 placeholder-gray-800"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="bathrooms"
                      className="block text-base font-medium text-gray-700 mb-2"
                    >
                      Bathrooms
                    </label>
                    <input
                      type="number"
                      name="bathrooms"
                      id="bathrooms"
                      value={formData.bathrooms}
                      onChange={handleInputChange}
                      min="0"
                      placeholder="Enter number of bathrooms"
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-base py-3 px-4 text-gray-900 placeholder-gray-800"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="rating"
                      className="block text-base font-medium text-gray-700 mb-2"
                    >
                      Rating
                    </label>
                    <input
                      type="number"
                      name="rating"
                      id="rating"
                      value={formData.rating}
                      onChange={handleInputChange}
                      min="0"
                      max="5"
                      step="0.1"
                      placeholder="Enter rating (0-5)"
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-base py-3 px-4 text-gray-900 placeholder-gray-800"
                    />
                  </div>
                </div>

                {/* Check-in/Check-out Dates and Times */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="checkInDate"
                      className="block text-base font-medium text-gray-700 mb-2"
                    >
                      Check-in Date
                    </label>
                    <DatePicker
                      selected={formData.checkInDate ? new Date(formData.checkInDate) : null}
                      onChange={(date) => handleDateChange(date, "checkInDate")}
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-base py-3 px-4 text-gray-900 placeholder-gray-800"
                      dateFormat="MM/dd/yyyy"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="checkOutDate"
                      className="block text-base font-medium text-gray-700 mb-2"
                    >
                      Check-out Date
                    </label>
                    <DatePicker
                      selected={formData.checkOutDate ? new Date(formData.checkOutDate) : null}
                      onChange={(date) => handleDateChange(date, "checkOutDate")}
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-base py-3 px-4 text-gray-900 placeholder-gray-800"
                      dateFormat="MM/dd/yyyy"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="checkInTime"
                      className="block text-base font-medium text-gray-700 mb-2"
                    >
                      Check-in Time
                    </label>
                    <DatePicker
                      selected={formData.checkInTime ? new Date(formData.checkInTime) : null}
                      onChange={(date) => handleDateChange(date, "checkInTime")}
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={15}
                      timeCaption="Time"
                      dateFormat="h:mm aa"
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-base py-3 px-4 text-gray-900 placeholder-gray-800"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="checkOutTime"
                      className="block text-base font-medium text-gray-700 mb-2"
                    >
                      Check-out Time
                    </label>
                    <DatePicker
                      selected={formData.checkOutTime ? new Date(formData.checkOutTime) : null}
                      onChange={(date) => handleDateChange(date, "checkOutTime")}
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={15}
                      timeCaption="Time"
                      dateFormat="h:mm aa"
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-base py-3 px-4 text-gray-900 placeholder-gray-800"
                    />
                  </div>
                </div>

                {/* Guest Amount */}
                <div>
                  <label
                    htmlFor="guestAmount"
                    className="block text-base font-medium text-gray-700 mb-2"
                  >
                    Travelers
                  </label>
                  <input
                    type="number"
                    name="guestAmount"
                    id="guestAmount"
                    value={formData.guestAmount}
                    onChange={handleInputChange}
                    min="1"
                    placeholder="Enter number of guests"
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-base py-3 px-4 text-gray-900 placeholder-gray-800"
                  />
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="description"
                    className="block text-base font-medium text-gray-700 mb-2"
                  >
                    Package Description
                  </label>
                  <textarea
                    name="description"
                    id="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter package description"
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-base py-3 px-4 text-gray-900 placeholder-gray-800"
                  />
                </div>

                {/* Room Type */}
                <div>
                  <label
                    htmlFor="roomType"
                    className="block text-base font-medium text-gray-700 mb-2"
                  >
                    Room Type
                  </label>
                  <select
                    name="roomType"
                    id="roomType"
                    value={formData.roomType}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-base py-3 px-4 text-gray-900 placeholder-gray-800"
                  >
                    {ROOM_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* All Inclusive */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="allinclusive"
                    id="allinclusive"
                    checked={formData.allinclusive}
                    onChange={handleCheckboxChange}
                    className="h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <label
                    htmlFor="allinclusive"
                    className="ml-3 block text-base text-gray-700"
                  >
                    All Inclusive
                  </label>
                </div>
              </div>

              {/* Amenities */}
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900">Amenities</h2>

                <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
                  {AMENITIES.map((amenity) => (
                    <div key={amenity} className="flex items-center">
                      <input
                        type="checkbox"
                        id={amenity}
                        checked={formData.amenities?.includes(amenity)}
                        onChange={() => handleAmenityChange(amenity)}
                        className="h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <label
                        htmlFor={amenity}
                        className="ml-3 block text-base text-gray-700"
                      >
                        {amenity}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flight Information */}
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Flight Information
                </h2>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="departingFrom"
                      className="block text-base font-medium text-gray-700 mb-2"
                    >
                      Departing From
                    </label>
                    <input
                      type="text"
                      name="departingFrom"
                      id="departingFrom"
                      value={flightInfo?.departingFrom || ""}
                      onChange={handleFlightInfoChange}
                      placeholder="Enter departure location"
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-base py-3 px-4 text-gray-900 placeholder-gray-800"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="arrivingTo"
                      className="block text-base font-medium text-gray-700 mb-2"
                    >
                      Arriving To
                    </label>
                    <input
                      type="text"
                      name="arrivingTo"
                      id="arrivingTo"
                      value={flightInfo?.arrivingTo || ""}
                      onChange={handleFlightInfoChange}
                      placeholder="Enter arrival location"
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-base py-3 px-4 text-gray-900 placeholder-gray-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="departureDate"
                      className="block text-base font-medium text-gray-700 mb-2"
                    >
                      Departure Date
                    </label>
                    <DatePicker
                      selected={flightInfo?.departureDate ? new Date(flightInfo.departureDate) : null}
                      onChange={(date) =>
                        setFlightInfo((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            departureDate: date || undefined,
                          };
                        })
                      }
                      placeholderText="Select departure date"
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-base py-3 px-4 text-gray-900 placeholder-gray-800"
                      dateFormat="MM/dd/yyyy"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="returnDate"
                      className="block text-base font-medium text-gray-700 mb-2"
                    >
                      Return Date
                    </label>
                    <DatePicker
                      selected={flightInfo?.returnDate ? new Date(flightInfo.returnDate) : null}
                      onChange={(date) =>
                        setFlightInfo((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            returnDate: date || undefined,
                          };
                        })
                      }
                      placeholderText="Select return date"
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-base py-3 px-4 text-gray-900 placeholder-gray-800"
                      dateFormat="MM/dd/yyyy"
                    />
                  </div>
                </div>
              </div>

              {/* Featured Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isFeatured"
                  id="isFeatured"
                  checked={formData.isFeatured}
                  onChange={handleCheckboxChange}
                  className="h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <label
                  htmlFor="isFeatured"
                  className="ml-3 block text-base text-gray-700"
                >
                  Feature this package
                </label>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-8 py-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-6 w-6 text-white"
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
                      Saving...
                    </>
                  ) : (
                    "Save Package"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 