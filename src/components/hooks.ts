// hooks.ts
import { TypedUseSelectorHook, useSelector } from 'react-redux';
import { RootState } from './store'; // adjust path based on location

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
