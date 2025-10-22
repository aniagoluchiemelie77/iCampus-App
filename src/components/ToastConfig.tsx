
import { BaseToast, ErrorToast } from 'react-native-toast-message';
import { ToastPopupStyles } from '../assets/styles/colors';

const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={ToastPopupStyles.successToastDiv}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={ToastPopupStyles.successToastText}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={ToastPopupStyles.errorToastDiv}
      text1Style={ToastPopupStyles.errorToastText}
    />
  ),
};

export default toastConfig;
