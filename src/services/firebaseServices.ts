import firestore from '@react-native-firebase/firestore';
import { User } from '../types/firebase'; // assuming you store interfaces in types.ts

export const saveUserToFirestore = async (user: User) => {
  try {
    await firestore().collection('users').doc(user.uid).set({
      ...user,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error saving user:', error);
  }
};
