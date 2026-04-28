import axios from 'axios';
import { CLOUDINARY_APICLOUDNAME, CLOUDINARY_UPLOAD_PRESET} from '@env';
import {
  Platform
} from 'react-native';

export const uploadToCloudinary = async (fileUri: string) => {
  const data = new FormData();
  
  // In Vanilla RN, we often need to ensure the URI is formatted correctly
  const cleanUri = Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri;

  data.append('file', {
    uri: cleanUri,
    type: 'application/octet-stream', // 'auto' on Cloudinary handles this
    name: fileUri.split('/').pop(), // Extracts filename from URI
  } as any);

  data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  try {
    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_APICLOUDNAME}/auto/upload`, // Use /auto/ for docs
      data,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data.secure_url;
  } catch (err) {
    console.error("Cloudinary Upload Error:", err);
    throw err;
  }
};