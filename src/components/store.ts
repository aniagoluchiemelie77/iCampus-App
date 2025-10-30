import { configureStore } from '@reduxjs/toolkit';
import userReducer from './UserSlice';
import notificationReducer from './NotificationSplice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    notifications: notificationReducer,
  },
});

// ✅ Export RootState type
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
