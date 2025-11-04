import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../types/firebase'; // adjust path

const initialState: User = {
  uid: '',
  usertype: '', // or 'lecturer' depending on your enum
  firstname: '',
  lastname: '',
  isFirstLogin: true,
  schoolName: '',
  email: '',
  pointsBalance: 0,
  accessToken: '',
  ipAddress: [],
  deviceType: [],
  password: '',
  department: '',
  hasSubscribed: false,
  createdAt: '',
  country: '',
  userToken: '',
  tokenCreatedAt: '',
  profilePic: [],
};
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User>) {
      return { ...state, ...action.payload };
    },
    clearUser() {
      return initialState;
    },
    updateUserImage(state, action: PayloadAction<string>) {
  if (state.profilePic) {
    state.profilePic.push(action.payload);
  } else {
    state.profilePic = [action.payload];
  }
}

  },
});
export const { setUser, clearUser, updateUserImage } = userSlice.actions;
export default userSlice.reducer;
