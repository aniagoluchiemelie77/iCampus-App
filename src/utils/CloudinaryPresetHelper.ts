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