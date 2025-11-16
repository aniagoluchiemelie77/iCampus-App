declare module 'react-native-camera-kit' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';

  export interface CameraKitCameraScreenProps {
    style?: ViewStyle;
    scanBarcode?: boolean;
    onReadCode?: (event: { nativeEvent: { codeStringValue: string } }) => void;
    showFrame?: boolean;
    laserColor?: string;
    frameColor?: string;
  }

  export class CameraKitCameraScreen extends Component<CameraKitCameraScreenProps> {}
}
