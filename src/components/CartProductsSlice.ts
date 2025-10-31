import { createSlice, PayloadAction, createSelector  } from '@reduxjs/toolkit';
import { Product } from '../types/firebase'; // adjust path as needed
import { RootState } from './store'; 

interface CartItem extends Product {
  selectedSize?: string;
  selectedColor?: string;
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
      const { productId, selectedSize, selectedColor } = action.payload;
      const existing = state.items.find(
        item =>
          item.productId === productId &&
          item.selectedSize === selectedSize &&
          item.selectedColor === selectedColor
      );
      if (existing) {
        existing.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }
      state.totalCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
    },
    removeFromCart: (state, action: PayloadAction<{ productId: string; selectedSize?: string; selectedColor?: string }>) => {
      state.items = state.items.filter(
        item =>
          !(
            item.productId === action.payload.productId &&
            item.selectedSize === action.payload.selectedSize &&
            item.selectedColor === action.payload.selectedColor
          )
      );
      state.totalCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
    },
    incrementQuantity: (state, action: PayloadAction<{ productId: string; selectedSize?: string; selectedColor?: string }>) => {
      console.log('Incrementing quantity for:', action.payload);
       const item = state.items.find(
    i =>
      i.productId === action.payload.productId &&
      i.selectedSize === action.payload.selectedSize &&
      i.selectedColor === action.payload.selectedColor
  );
  if (item) {
    item.quantity += 1;
    state.totalCount += 1;
  }
    },
    decrementQuantity: (state, action: PayloadAction<{ productId: string; selectedSize?: string; selectedColor?: string }>) => {
      const item = state.items.find(
        i =>
          i.productId === action.payload.productId &&
          i.selectedSize === action.payload.selectedSize &&
          i.selectedColor === action.payload.selectedColor
      );
      if (item && item.quantity > 1) {
        item.quantity -= 1;
        state.totalCount -= 1;
      }
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
  incrementQuantity,
  decrementQuantity,
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
  [selectCartItems, selectCartQuantities],
  (items, quantities) =>
    items.reduce((sum, item) => {
      const price = Number(item.priceInPoints) || 0;
      const quantity = quantities[item.productId] || 1;
      return sum + price * quantity;
    }, 0)
);

