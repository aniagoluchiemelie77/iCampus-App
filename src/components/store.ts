import { configureStore } from '@reduxjs/toolkit';
import userReducer from './UserSlice';
import notificationReducer from './NotificationSplice';
import cartReducer from './CartProductsSlice'; // 👈 Import your cart slice

export const store = configureStore({
  reducer: {
    user: userReducer,
    notifications: notificationReducer,
    cart: cartReducer,
  },
});

// ✅ Export RootState and AppDispatch types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

