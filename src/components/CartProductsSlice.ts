import { createSlice, PayloadAction, createSelector  } from '@reduxjs/toolkit';
import { Product } from '../types/firebase'; // adjust path as needed
import { RootState, AppDispatch } from './store'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
interface CartItem extends Product {
  selectedSize?: string;
  selectedColor?: string;
  selectedQuantity?: string;
  quantity: number;
  stock?: number;
}
interface CartState {
  items: CartItem[];
  totalCount: number;
}

const initialState: CartState = {
  items: [],
  totalCount: 0,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<CartItem>) => {
  const { productId } = action.payload;

  // Remove any existing item with the same productId
  state.items = state.items.filter(item => item.productId !== productId);

  // Add the new item
  state.items.push(action.payload);

  // Recalculate total count
  state.totalCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
}
,
    removeFromCart: (state, action: PayloadAction<{ productId: string; selectedSize?: string; selectedColor?: string; selectedQuantity?: string }>) => {
      state.items = state.items.filter(
        item =>
          !(
            item.productId === action.payload.productId &&
            item.selectedSize === action.payload.selectedSize &&
            item.selectedColor === action.payload.selectedColor &&
            item.selectedQuantity === action.payload.selectedQuantity
          )
      );
      state.totalCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
    },
    clearCart: (state) => {
      state.items = [];
      state.totalCount = 0;
    },
    setCartItems: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload;
      state.totalCount = action.payload.reduce((sum, item) => sum + item.quantity, 0);
    }
  },
});
export const {
  addToCart,
  removeFromCart,
  clearCart,
  setCartItems 
} = cartSlice.actions;
export default cartSlice.reducer;
export const isProductInCart = (state: RootState, productId: string): boolean => {
  return state.cart.items.some(item => item.productId === productId);
};
export const selectCartItems = (state: RootState) => state.cart.items;
export const selectCartProductIds = createSelector(
  [selectCartItems],
  items => items.map(item => item.productId)
);
export const selectCartQuantities = createSelector(
  [(state: RootState) => state.user.cart ?? []], // ✅ fallback to empty array
  (cartIds) =>
    cartIds.reduce((acc: Record<string, number>, id: string) => {
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {})
);
export const selectTotalPoints = createSelector(
  [selectCartItems],
  (items) =>
    items.reduce((sum, item) => {
      const price = Number(item.priceInPoints) || 0;
      const quantity = Number(item.selectedQuantity) || 1;
      return sum + price * quantity;
    }, 0)
);
export const clearCartAndStorage = () => async (dispatch: AppDispatch) => {
  try {
    await AsyncStorage.removeItem('selectedSize');
    await AsyncStorage.removeItem('selectedColor');
    await AsyncStorage.removeItem('selectedQuantity');
    dispatch(clearCart());
  } catch (error) {
    console.error('Failed to clear AsyncStorage:', error);
  }
};
