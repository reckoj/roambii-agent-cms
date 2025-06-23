"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { RootState } from "@/lib/redux/store";
import {
  fetchAgentProfileAsync,
  updateAgentProfileAsync,
} from "@/lib/redux/slices/agentProfileSlice";
import {
  UserCircleIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

// Language and specialty options for dropdown selection
const LANGUAGE_OPTIONS = [
  "English",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Italian",
  "Mandarin",
  "Japanese",
  "Korean",
  "Russian",
  "Arabic",
  "Hindi",
];

const SPECIALTY_OPTIONS = [
  "Luxury Travel",
  "Adventure Travel",
  "Family Vacations",
  "Honeymoons",
  "Cruises",
  "Solo Travel",
  "Group Travel",
  "Eco Tourism",
  "Cultural Tours",
  "Beach Resorts",
  "City Breaks",
  "Backpacking",
];

const REGION_OPTIONS = [
  "North America",
  "South America",
  "Caribbean",
  "Europe",
  "Africa",
  "Middle East",
  "Asia",
  "Oceania",
  "Antarctica",
];

// Find this class for text inputs
const inputClass =
  "shadow-sm focus:ring-cyan-500 focus:border-cyan-500 block w-full sm:text-sm border-gray-300 rounded-md";
// Add text color and placeholder color to all text inputs
const inputClassWithDarkText =
  "shadow-sm focus:ring-cyan-500 focus:border-cyan-500 block w-full sm:text-sm border-gray-300 rounded-md text-gray-900 placeholder-gray-800";

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const { agent } = useAppSelector((state: RootState) => state.auth);
  const { profile, loading, error } = useAppSelector(
    (state: RootState) => state.agentProfile
  );

  const [isEditing, setIsEditing] = useState(false);
  const [editableFields, setEditableFields] = useState({
    name: "",
    bio: "",
    yearsOfExperience: 0,
    region: "",
    languages: [] as string[],
    specialties: [] as string[],
    phoneNumber: "",
    website: "",
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Fetch profile on component mount
  useEffect(() => {
    if (agent?.id) {
      dispatch(fetchAgentProfileAsync(agent.id));
    }
  }, [dispatch, agent]);

  // Set editable fields when profile loads
  useEffect(() => {
    if (profile) {
      setEditableFields({
        name: profile.name || "",
        bio: profile.bio || "",
        yearsOfExperience: profile.yearsOfExperience || 0,
        region: profile.region || "",
        languages: profile.languages || [],
        specialties: profile.specialties || [],
        phoneNumber: profile.phoneNumber || "",
        website: profile.website || "",
      });
    }
  }, [profile]);

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form field changes
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setEditableFields((prev) => ({ ...prev, [name]: value }));
  };

  // Handle checkbox arrays (languages, specialties)
  const handleCheckboxArrayChange = (
    name: "languages" | "specialties",
    value: string,
    checked: boolean
  ) => {
    if (checked) {
      // Add to array if checked
      setEditableFields((prev) => ({
        ...prev,
        [name]: [...prev[name], value],
      }));
    } else {
      // Remove from array if unchecked
      setEditableFields((prev) => ({
        ...prev,
        [name]: prev[name].filter((item) => item !== value),
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setUpdateError(null);

    try {
      if (!profile) {
        throw new Error("Profile not found");
      }

      // Convert yearsOfExperience to number
      const yearsOfExperience = parseInt(
        editableFields.yearsOfExperience.toString()
      );

      await dispatch(
        updateAgentProfileAsync({
          agentId: profile.id,
          profileData: {
            ...editableFields,
            yearsOfExperience,
          },
          avatarFile: avatarFile || undefined,
        })
      ).unwrap();

      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      setUpdateSuccess(true);

      // Reset success message after a delay
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 3000);
    } catch (error: any) {
      setUpdateError(error.message || "Failed to update profile");
    } finally {
      setIsUploading(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    if (profile) {
      // Reset form to original values
      setEditableFields({
        name: profile.name || "",
        bio: profile.bio || "",
        yearsOfExperience: profile.yearsOfExperience || 0,
        region: profile.region || "",
        languages: profile.languages || [],
        specialties: profile.specialties || [],
        phoneNumber: profile.phoneNumber || "",
        website: profile.website || "",
      });
    }
    setIsEditing(false);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  if (loading && !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">Error loading profile</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Agent Profile</h1>
        <Link
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
        >
          Back to Dashboard
        </Link>
      </div>

      {updateSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">Profile updated successfully!</span>
        </div>
      )}

      {updateError && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{updateError}</span>
        </div>
      )}

      {!isEditing ? (
        // Profile View
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-8 border-b border-gray-200 flex justify-between items-start">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-24 w-24 rounded-full overflow-hidden bg-gray-100">
                {profile?.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <UserCircleIcon className="h-20 w-20 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="ml-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {profile?.name}
                </h2>
                <p className="text-sm text-gray-500">{profile?.email || ""}</p>
                {/* {profile?.isProfileComplete ? (
                  <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckIcon className="mr-1 h-3 w-3" />
                    Profile Complete
                  </span>
                ) : (
                  <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <XMarkIcon className="mr-1 h-3 w-3" />
                    Profile Incomplete
                  </span>
                )} */}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
            >
              <PencilIcon className="h-4 w-4 mr-1" />
              Edit Profile
            </button>
          </div>

          <div className="px-6 py-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Profile Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Bio</h4>
                <p className="text-gray-900 whitespace-pre-line">
                  {profile?.bio || "No bio provided"}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">
                  Experience
                </h4>
                <p className="text-gray-900">
                  {profile?.yearsOfExperience || 0}{" "}
                  {profile?.yearsOfExperience === 1 ? "year" : "years"} of
                  experience
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">
                  Region Specialization
                </h4>
                <p className="text-gray-900">
                  {profile?.region || "Not specified"}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">
                  Languages
                </h4>
                <div className="flex flex-wrap gap-2">
                  {profile?.languages && profile.languages.length > 0 ? (
                    profile.languages.map((lang) => (
                      <span
                        key={lang}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {lang}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500">No languages specified</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">
                  Specialties
                </h4>
                <div className="flex flex-wrap gap-2">
                  {profile?.specialties && profile.specialties.length > 0 ? (
                    profile.specialties.map((specialty) => (
                      <span
                        key={specialty}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                      >
                        {specialty}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500">No specialties specified</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">
                  Contact Information
                </h4>
                <div className="space-y-2">
                  <p className="text-gray-900">
                    <span className="font-medium">Email:</span>{" "}
                    {profile?.email || "Not provided"}
                  </p>
                  <p className="text-gray-900">
                    <span className="font-medium">Phone:</span>{" "}
                    {profile?.phoneNumber || "Not provided"}
                  </p>
                  {/* {profile?.website && profile.website.trim() && (
                    <p className="text-gray-900">
                      <span className="font-medium">Website:</span>{' '}
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:text-cyan-500">
                        {profile.website}
                      </a>
                    </p>
                  )} */}
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Management Section */}
          <div className="px-6 py-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Subscription Management
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Premium Plan</h4>
                  <p className="text-sm text-gray-500">$19.99 per month</p>
                </div>
                <div className="space-x-3">
                  <Link
                    href="/cancel-subscription"
                    className="inline-flex items-center px-3 py-2 border border-red-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Manage Subscription
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Edit Form
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow rounded-lg overflow-hidden"
        >
          <div className="px-6 py-8 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="flex-shrink-0 h-32 w-32 rounded-full overflow-hidden bg-gray-100 mb-4 sm:mb-0">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Profile Preview"
                    className="h-full w-full object-cover"
                  />
                ) : profile?.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <UserCircleIcon className="h-24 w-24 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="ml-0 sm:ml-6 text-center sm:text-left">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Picture
                </label>
                <input
                  type="file"
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                  id="avatar-upload"
                />
                <label
                  htmlFor="avatar-upload"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 cursor-pointer"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Change Photo
                </label>
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Edit Profile Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={editableFields.name}
                  onChange={handleInputChange}
                  className="shadow-sm focus:ring-cyan-500 focus:border-cyan-500 block w-full sm:text-sm border-gray-300 rounded-md text-gray-900 placeholder-gray-800"
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="bio"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Bio
                </label>
                <textarea
                  name="bio"
                  id="bio"
                  rows={4}
                  value={editableFields.bio}
                  onChange={handleInputChange}
                  className="shadow-sm focus:ring-cyan-500 focus:border-cyan-500 block w-full sm:text-sm border-gray-300 rounded-md text-gray-900 placeholder-gray-800"
                  placeholder="Tell travelers about yourself and your expertise"
                />
              </div>

              <div>
                <label
                  htmlFor="yearsOfExperience"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Years of Experience
                </label>
                <input
                  type="number"
                  name="yearsOfExperience"
                  id="yearsOfExperience"
                  min="0"
                  max="99"
                  value={editableFields.yearsOfExperience}
                  onChange={handleInputChange}
                  className="shadow-sm focus:ring-cyan-500 focus:border-cyan-500 block w-full sm:text-sm border-gray-300 rounded-md text-gray-900 placeholder-gray-800"
                />
              </div>

              <div>
                <label
                  htmlFor="region"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Region Specialization
                </label>
                <select
                  name="region"
                  id="region"
                  value={editableFields.region}
                  onChange={handleInputChange}
                  className="shadow-sm focus:ring-cyan-500 focus:border-cyan-500 block w-full sm:text-sm border-gray-300 rounded-md text-gray-900 placeholder-gray-800"
                >
                  <option value="">Select a region</option>
                  {REGION_OPTIONS.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Languages
                </label>
                <div className="mt-1 space-y-2 max-h-48 overflow-y-auto p-2 border border-gray-300 rounded-md">
                  {LANGUAGE_OPTIONS.map((language) => (
                    <div key={language} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`language-${language}`}
                        checked={editableFields.languages.includes(language)}
                        onChange={(e) =>
                          handleCheckboxArrayChange(
                            "languages",
                            language,
                            e.target.checked
                          )
                        }
                        className="h-4 w-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                      />
                      <label
                        htmlFor={`language-${language}`}
                        className="ml-2 block text-sm text-gray-900"
                      >
                        {language}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specialties
                </label>
                <div className="mt-1 space-y-2 max-h-48 overflow-y-auto p-2 border border-gray-300 rounded-md">
                  {SPECIALTY_OPTIONS.map((specialty) => (
                    <div key={specialty} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`specialty-${specialty}`}
                        checked={editableFields.specialties.includes(specialty)}
                        onChange={(e) =>
                          handleCheckboxArrayChange(
                            "specialties",
                            specialty,
                            e.target.checked
                          )
                        }
                        className="h-4 w-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                      />
                      <label
                        htmlFor={`specialty-${specialty}`}
                        className="ml-2 block text-sm text-gray-900"
                      >
                        {specialty}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="phoneNumber"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  id="phoneNumber"
                  value={editableFields.phoneNumber}
                  onChange={handleInputChange}
                  className="shadow-sm focus:ring-cyan-500 focus:border-cyan-500 block w-full sm:text-sm border-gray-300 rounded-md text-gray-900 placeholder-gray-800"
                  placeholder="+1 (123) 456-7890"
                />
              </div>

              <div>
                <label
                  htmlFor="website"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Website
                </label>
                <input
                  type="text"
                  name="website"
                  id="website"
                  value={editableFields.website}
                  onChange={handleInputChange}
                  className="shadow-sm focus:ring-cyan-500 focus:border-cyan-500 block w-full sm:text-sm border-gray-300 rounded-md text-gray-900 placeholder-gray-800"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isUploading}
                className="mr-3 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading || !editableFields.name.trim()}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
