import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../types/firebase'; // adjust path

const initialState: User = {
  uid: '',
  firstname: '',
  lastname: '',
  isFirstLogin: true,
  schoolName: '',
  email: '',
  recoveryEmails: [],
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
  coursesEnrolled: [],
  coursesTeaching: [],
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
    updateCoursesEnrolled(state, action: PayloadAction<string[]>) {
      state.coursesEnrolled = action.payload;
    },
    updateCoursesTeaching(state, action: PayloadAction<string[]>) {
      state.coursesTeaching = action.payload;
    },

  },
});
export const { setUser, clearUser, updateUserImage, updateCoursesEnrolled, updateEmailData, updateCoursesTeaching, updateUserSessions, updateBlockedUsers} = userSlice.actions;
export default userSlice.reducer;
