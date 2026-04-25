import axios from 'axios';
import { CLOUDINARY_APICLOUDNAME, CLOUDINARY_UPLOAD_PRESET} from '@env';

export const uploadToCloudinary = async (imageUri: string) => {
  const data = new FormData();
  data.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'profile.jpg',
  } as any);
  data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET); 

  try {
    const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUDINARY_APICLOUDNAME}/image/upload`, data);
    return res.data.secure_url;
  } catch (err) {
    console.error("Upload error", err);
    throw err;
  }
};