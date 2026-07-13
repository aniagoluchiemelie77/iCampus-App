import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Admin } from '../types/firebase'; 

const initialState: Admin = {
  uid: '',
  firstname: '',
  lastname: '',
  email: '',
  adminType: 'support',
  profilePic: [],
  country: '',
  lastAccessed: '',
  sessions: [],
  createdAt: '',
  isVerified: false
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setAdmin(state, action: PayloadAction<Admin>) {
      return { ...state, ...action.payload };
    },
    updateAdminSession(state, action: PayloadAction<any[]>) {
      state.sessions = action.payload;
    },
    updateAdminProfilePic(state, action: PayloadAction<string>) {
      state.profilePic = [...state.profilePic, action.payload];
    },
    clearAdmin() {
      return initialState;
    },
  },
});

export const { setAdmin, updateAdminSession, updateAdminProfilePic, clearAdmin } = adminSlice.actions;
export default adminSlice.reducer;