import {
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import {
  DELIVERY_FEES
} from '../constants/inAppConstants';
import {CartItem, Product} from '../types/firebase';

interface CheckoutScreenParams {
  productId?: string;
  quantity?: number;
  selectedColor?: string;
  selectedSize?: string;
}

export const useCheckout = (params: CheckoutScreenParams, currentUser: any, allProducts: any[]) => {
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phoneNumbers?.[0]?.number || '');
  const [formattedValue, setFormattedValue] = useState(
      currentUser?.phoneNumbers?.[0]?.number || '',
    );
  const [isPhoneValid, setIsPhoneValid] = useState(
      !!currentUser?.phoneNumbers?.[0]?.number,
    );
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [itemDeliveryMethods, setItemDeliveryMethods] = useState<Record<string, string>>({});
  const [selectedStations, setSelectedStations] = useState<Record<string, any>>({});
  
  const isDirectPurchase = !!params?.productId;
  
  const checkoutItems = useMemo(() => {
  const rawItems: { 
    productId: string; 
    quantity: number; 
    selectedColor?: string; 
    selectedSize?: string 
  }[] = isDirectPurchase
    ? [
        {
          productId: params.productId!,
          quantity: params.quantity || 1,
          selectedColor: params.selectedColor,
          selectedSize: params.selectedSize,
        },
      ]
    : currentUser?.cart ?? [];
  return rawItems
    .map((item) => ({
      ...item,
      product: allProducts?.find((p) => p.productId === item.productId),
    }))
    .filter((item): item is CartItem & { product: Product } => item.product !== undefined);
}, [isDirectPurchase, params, currentUser?.cart, allProducts]);
    const { homeItems, dropOffItems } = useMemo(() => {
        const home: typeof checkoutItems = [];
        const dropOff: typeof checkoutItems = [];
        checkoutItems.forEach(item => {
          if (itemDeliveryMethods[item.productId] === 'home_delivery') {
            home.push(item);
          } else {
            dropOff.push(item);
          }
        });
        return { homeItems: home, dropOffItems: dropOff };
      }, [checkoutItems, itemDeliveryMethods]);

   // Inside useCheckout hook
const transactionalFinances = useMemo(() => {
  const tier = (currentUser?.tier as 'free' | 'pro' | 'premium') || 'free';
  
  const subtotal = checkoutItems.reduce((acc, item) => {
    return acc + (item.product?.priceInPoints || 0) * item.quantity;
  }, 0);

  const totalDeliveryFee = checkoutItems.reduce((acc, item) => {
    if (item.product?.type !== 'physical') return acc;
    
    const method = itemDeliveryMethods[item.productId] || 'drop_off';
    const rate = DELIVERY_FEES[tier][method as 'home_delivery' | 'drop_off'];
    
    return acc + (item.product.priceInPoints || 0) * item.quantity * rate;
  }, 0);

  const grandTotal = subtotal  + totalDeliveryFee;
  const userBalance = currentUser?.pointsBalance || 0;

  return { subtotal, totalDeliveryFee, grandTotal, canAfford: userBalance >= grandTotal, userBalance };
}, [checkoutItems, itemDeliveryMethods, currentUser?.pointsBalance, currentUser?.tier]);

  const formValidation = useMemo(() => {
      const missingStation = dropOffItems.find(
        item =>
          item.product?.type === 'physical' && !selectedStations[item.productId],
      );
  
      if (missingStation)
        return {
          valid: false,
          reason: `Select a drop-off location for ${missingStation.product?.title}`,
        };
  
      if (homeItems.length > 0) {
        if (!isPhoneValid)
          return {
            valid: false,
            reason: 'Provide a valid phone contact configuration.',
          };
        if (!deliveryAddress.trim())
          return {
            valid: false,
            reason: 'Provide a delivery target address destination.',
          };
      }
  
      return { valid: true, reason: '' };
    }, [
      dropOffItems,
      homeItems,
      selectedStations,
      isPhoneValid,
      deliveryAddress,
    ]);
    const handlePhoneChange = useCallback(
        (text: string) => {
          setPhoneNumber(text);
          const country = currentUser?.country || 'NG';
          const phoneNumberObj = parsePhoneNumberFromString(text, country as any);
          if (phoneNumberObj) {
            const isValid = phoneNumberObj.isValid();
            setIsPhoneValid(isValid);
            if (isValid) setFormattedValue(phoneNumberObj.formatInternational());
          } else {
            setIsPhoneValid(false);
          }
        },
        [currentUser?.country],

      );
      const handleStationSelect = useCallback((productId: string, station: any) => {
          setSelectedStations(prev => ({ ...prev, [productId]: station }));
        }, []);

  useEffect(() => {
      const initialMethods = checkoutItems.reduce<Record<string, string>>(
        (acc, item) => {
          acc[item.productId] = 'drop_off';
          return acc;
        },
        {},
      );
      setItemDeliveryMethods(initialMethods);
    }, [checkoutItems]);
  
    const toggleDelivery = useCallback((productId: string, method: string) => {
      setItemDeliveryMethods(prev => ({ ...prev, [productId]: method }));
    }, []);
  return {
    checkoutItems,
    transactionalFinances,
    formValidation,
    phoneNumber,
    setPhoneNumber,
    deliveryAddress,
    setDeliveryAddress,
    itemDeliveryMethods,
    setItemDeliveryMethods,
    selectedStations,
    handleStationSelect,
    handlePhoneChange,
    formattedValue,
    setFormattedValue,
    toggleDelivery,
    isPhoneValid,
    setIsPhoneValid,
    dropOffItems,
    homeItems
  };
};