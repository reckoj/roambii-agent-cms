import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "./config";

export const storage = getStorage(app);

/**
 * Upload an image to Firebase Storage and get the download URL
 * @param path Path in storage to save the file (e.g., "agents/123456")
 * @param file File to upload
 * @returns Download URL of the uploaded file
 */
export const uploadImage = async (path: string, file: File): Promise<string | null> => {
  try {
    // Create a unique filename to avoid collisions
    const timestamp = new Date().getTime();
    const uniqueName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const fullPath = `${path}/${uniqueName}`;
    
    // Create a reference to the file location
    const storageRef = ref(storage, fullPath);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error("Error uploading image:", error);
    return null;
  }
};

/**
 * Upload a profile image for a user or agent
 * @param userId User or agent ID
 * @param file File to upload
 * @returns Download URL of the uploaded profile image
 */
export const uploadProfileImage = async (userId: string, file: File): Promise<string | null> => {
  return uploadImage(`profiles/${userId}`, file);
}; 