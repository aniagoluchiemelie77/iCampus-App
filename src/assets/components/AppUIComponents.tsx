import React, {ComponentProps} from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR } from '../styles/colors';


interface CustomButtonProps {
  title?: string;
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  iconName?: ComponentProps<typeof MaterialIcons>['name'];
  iconColor?: string;
  iconSize?: number;
  iconStyle?: StyleProp<TextStyle>;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  disabled = false,
  isLoading = false,
  style,
  textStyle,
  iconName,
  iconColor = '#fff',
  iconSize = 20,
  iconStyle,
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || isLoading}
      style={({ pressed }) => [
        styles.btn,
        style,
        {
          transform: [{ scale: pressed && !disabled ? 0.96 : 1 }],
          opacity: disabled ? 0.7 : 1, 
        },
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <>
          {iconName && (
            <MaterialIcons
              name={iconName}
              size={iconSize}
              color={iconColor}
              style={[styles.defaultIconStyle, iconStyle]}
            />
          )}
          {title && <Text style={[styles.toggleBtnsText, textStyle]}>{title}</Text>}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: {
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: '100%',
    backgroundColor: PRIMARY_COLOR,
  },
  toggleBtnsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  defaultIconStyle: {
    marginRight: 7,
  },
});