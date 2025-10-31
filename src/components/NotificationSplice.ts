import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { Notification } from '../types/firebase'; // adjust path
import { RootState } from './store'; 

interface NotificationState {
  list: Notification[];
  unreadCount: number;
}
const initialState: NotificationState = {
  list: [],
  unreadCount: 0,
};
const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications2: (state, action: PayloadAction<Notification[]>) => {
      state.list = action.payload;
      state.unreadCount = action.payload.filter(n => !n.isRead).length;
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.list = state.list.map(n =>
        n.notificationId === id ? { ...n, isRead: true } : n
      );
      state.unreadCount = state.list.filter(n => !n.isRead).length;
    },
    clearUnread: (state) => {
      state.list = state.list.map(n => ({ ...n, isRead: true }));
      state.unreadCount = 0;
    },
  },
});
export const { setNotifications2, markAsRead, clearUnread } = notificationSlice.actions;
export default notificationSlice.reducer;
export const selectNotifications = (state: RootState) => state.notifications.list;
export const selectUnreadCount = createSelector(
  [selectNotifications],
  (list) => list.filter(n => !n.isRead).length
);
