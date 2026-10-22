import { useCallback, useMemo, useRef } from 'react';
import Toast from 'react-native-toast-message';

type AlertType = 'success' | 'error' | 'warning' | 'info';

const TITLES: Record<AlertType, string> = {
  success: 'Success',
  error: 'Something went wrong',
  warning: 'Check this',
  info: 'Notice',
};

/**
 * Drop-in replacement for the old SweetAlert modal state
 * (setAlertType → setAlertMessage → setAlertVisible(true)); shows a toast
 * instead of a blocking modal.
 */
export const useToastAlert = () => {
  const typeRef = useRef<AlertType>('info');
  const messageRef = useRef('');

  const setAlertType = useCallback((type: AlertType) => {
    typeRef.current = type;
  }, []);
  const setAlertMessage = useCallback((message: string) => {
    messageRef.current = message;
  }, []);
  const setAlertVisible = useCallback((visible: boolean) => {
    if (!visible) {
      Toast.hide();
      return;
    }
    const type = typeRef.current;
    Toast.show({
      type,
      text1: TITLES[type],
      text2: messageRef.current,
      visibilityTime: type === 'error' ? 4500 : 3500,
    });
  }, []);

  return useMemo(
    () => ({ setAlertType, setAlertMessage, setAlertVisible }),
    [setAlertType, setAlertMessage, setAlertVisible],
  );
};
