import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../types/firebase'; 
export type ThemeType = 'light' | 'dark' | 'system';

export const initialState: User = {
  uid: '',
  theme: 'system',
  firstname: 'Masta',
  lastname: 'Kraft',
  isFirstLogin: true,
  schoolName: '',
  email: 'chiboyaniagolu3@gmail.com',
  recoveryEmails: [],
  phoneNumbers: [],
  accessToken: '',
  sessions: [],
  blockedUsers: [],
  password: '',
  department: '',
  hasSubscribed: false,
  createdAt: '',
  country: '',
  userToken: '',
  tokenCreatedAt: '',
  profilePic: [],
  isSuspended: false,
  isInstitutionAdmin: false,
  usertype: 'student',
  subaccountId: ''
};
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    updateThemeState(state, action: PayloadAction<ThemeType>) {
      state.theme = action.payload;
    },
    setUser(state, action: PayloadAction<User>) {
      return { ...state, ...action.payload };
    },
    /** Merge a few server-confirmed fields (e.g. after a payment). */
    patchUser(state, action: PayloadAction<Partial<User>>) {
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
    },
    updateUserSessions(state, action: PayloadAction<any[]>) {
      state.sessions = action.payload;
    },
    updatePhoneNumbersData: (state, action: PayloadAction<{ phoneNumbers: any[] }>) => {
      state.phoneNumbers = action.payload.phoneNumbers;
    },
    updateEmailData(state, action: PayloadAction<{ 
      email?: string; 
      recoveryEmails?: { email: string; isVerified: boolean; addedAt: string }[] 
    }>) {
      if (action.payload.email) {
        state.email = action.payload.email;
      }
      if (action.payload.recoveryEmails) {
        state.recoveryEmails = action.payload.recoveryEmails;
      }
    },

  },
});
export const { 
  updateThemeState, setUser, clearUser, updateUserImage, updatePhoneNumbersData, updateEmailData, updateUserSessions, patchUser} = userSlice.actions;
export default userSlice.reducer;
