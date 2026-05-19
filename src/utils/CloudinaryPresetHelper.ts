import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../services/firebaseConfig"; 

export const uploadToFirebase = async (fileUri: string, folder: string = "uploads") => {
  try {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const filename = fileUri.split('/').pop() || Date.now().toString();
    const fileExtension = filename.split('.').pop();
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const storageRef = ref(storage, `${folder}/${uniqueName}`);
    const snapshot = await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Firebase Upload Error:", error);
    throw error;
  }
};
export const uploadFileToFirebaseClient = async (fileUri: string, folder: string = "digital-products") => {
  try {
    const filename = fileUri.split('/').pop() || `${Date.now()}.mp4`;
    const fileExtension = filename.split('.').pop() || 'dat';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    
    const storageRef = ref(storage, `${folder}/${uniqueName}`);

    const response = await fetch(fileUri);
    const fileBlob = await response.blob();

    const snapshot = await uploadBytes(storageRef, fileBlob);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    // Standardize your return payload structure
    return {
      success: true,
      message: 'Asset uploaded successfully.',
      data: { permanentUrl: downloadURL },
    };

  } catch (error: any) {
    console.error("Firebase Web SDK Client Upload Error:", error);
    return {
      success: false,
      message: error?.message || 'Network exception encountered during client upload.',
      data: null,
    };
  }
};