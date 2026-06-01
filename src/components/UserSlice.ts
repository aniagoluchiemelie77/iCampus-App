import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../types/firebase'; 
export type ThemeType = 'light' | 'dark' | 'system';
const initialState: User = {
  uid: '',
  theme: 'system',
  firstname: '',
  lastname: '',
  isFirstLogin: true,
  schoolName: '',
  email: '',
  recoveryEmails: [],
  phoneNumbers: [],
  pointsBalance: 0,
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
    updateBlockedUsers(state, action: PayloadAction<{ targetUid: string; action: 'blocked' | 'unblocked' }>) {
      if (!state.blockedUsers) {
        state.blockedUsers = [];
      }   
      if (action.payload.action === 'blocked') {
        if (!state.blockedUsers.includes(action.payload.targetUid)) {
          state.blockedUsers.push(action.payload.targetUid);
        }
      } else {
        state.blockedUsers = state.blockedUsers.filter(uid => uid !== action.payload.targetUid);
      }
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
  updateThemeState, setUser, clearUser, updateUserImage, updatePhoneNumbersData, updateEmailData, updateUserSessions, updateBlockedUsers} = userSlice.actions;
export default userSlice.reducer;
