import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../services/firebaseConfig"; 
import {CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET} from '@env';

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
//For development purposes only
export const uploadToCloudinary = async (
  fileUri: string, 
  folder: string = "uploads"
) => {
  const cloudName = CLOUDINARY_CLOUD_NAME;
  const uploadPreset = CLOUDINARY_UPLOAD_PRESET;

  try {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const filename = fileUri.split('/').pop() || Date.now().toString();
    const fileExtension = filename.split('.').pop() || 'jpg';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const formData = new FormData();
    formData.append("file", {
  uri: fileUri,
  type: `image/${fileExtension}`,
  name: `${uniqueName}.${fileExtension}`,
} as any);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", folder);
    formData.append("public_id", uniqueName);
    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await cloudinaryResponse.json();

    if (!cloudinaryResponse.ok) {
      throw new Error(data.error?.message || "Cloudinary upload failed");
    }
    return data.secure_url;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw error;
  }
};