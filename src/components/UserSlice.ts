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
  tokenCreatedAt: ''
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
  },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
