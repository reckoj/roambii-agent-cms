import { Package } from '@/types/package';
import { db } from './firebase/config';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const createPackage = async (packageData: Package, agentId: string, imageFile?: File) => => {
  try {
    let imageUrl = '';
    if (imageFile) {
      const storage = getStorage();
      const imageRef = ref(storage, `packages/${Date.now()}_${imageFile.name}`);
      await uploadBytes(imageRef, imageFile);
      imageUrl = await getDownloadURL(imageRef);
    }

    const packageWithImage = {
      ...packageData,
      image: imageUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'packages'), packageWithImage);
    return { id: docRef.id, ...packageWithImage };
  } catch (error) {
    console.error('Error creating package:', error);
    throw error;
  }
};

export const updatePackage = async (id: string, packageData: Package, imageFile?: File) => {
  try {
    let imageUrl = packageData.image;
    if (imageFile) {
      const storage = getStorage();
      const imageRef = ref(storage, `packages/${Date.now()}_${imageFile.name}`);
      await uploadBytes(imageRef, imageFile);
      imageUrl = await getDownloadURL(imageRef);
    }

    const packageWithImage = {
      ...packageData,
      image: imageUrl,
      updatedAt: new Date().toISOString(),
    };

    const packageRef = doc(db, 'packages', id);
    await updateDoc(packageRef, packageWithImage);
    return { id, ...packageWithImage };
  } catch (error) {
    console.error('Error updating package:', error);
    throw error;
  }
};

export const getPackageById = async (id: string): Promise<Package | null> => {
  try {
    const packageRef = doc(db, 'packages', id);
    const packageDoc = await getDoc(packageRef);
    if (packageDoc.exists()) {
      return { id: packageDoc.id, ...packageDoc.data() } as Package;
    }
    return null;
  } catch (error) {
    console.error('Error getting package:', error);
    throw error;
  }
};

export const getPackagesByAgent = async (agentId: string): Promise<Package[]> => {
  try {
    const packagesQuery = query(collection(db, 'packages'), where('agent.id', '==', agentId));
    const querySnapshot = await getDocs(packagesQuery);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Package));
  } catch (error) {
    console.error('Error getting packages:', error);
    throw error;
  }
};

export const deletePackage = async (id: string) => {
  try {
    const packageRef = doc(db, 'packages', id);
    await deleteDoc(packageRef);
  } catch (error) {
    console.error('Error deleting package:', error);
    throw error;
  }
};

export const getAgentPackages = async (agentId: string): Promise<Package[]> => {
  try {
    const packagesQuery = query(
      collection(db, 'packages'),
      where('agent.id', '==', agentId)
    );
    const querySnapshot = await getDocs(packagesQuery);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      checkInDate: doc.data().checkInDate?.toDate(),
      checkOutDate: doc.data().checkOutDate?.toDate(),
      checkInTime: doc.data().checkInTime?.toDate(),
      checkOutTime: doc.data().checkOutTime?.toDate(),
    } as Package));
  } catch (error) {
    console.error('Error getting agent packages:', error);
    throw error;
  }
}; 