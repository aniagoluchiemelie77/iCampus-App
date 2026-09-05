import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App.tsx';
import { useTheme } from '../context/ThemeContext';
import { CommonActions } from '@react-navigation/native';
import { CustomButton } from '../assets/components/AppUIComponents';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'ProductPublishSuccess'
>;

export const ProductPublishSuccess = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { productName, isEditing } = route.params;
  useEffect(() => {
    const onBackPress = () => true;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );
    return () => subscription.remove();
  }, []);
  const navigateToManagement = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'SalesHub' }],
      }),
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MaterialIcons
        name="check-circle-outline"
        size={100}
        color={colors.primary}
      />
      <Text style={[styles.congrats, { color: colors.textDarker }]}>
        {isEditing ? 'Changes Saved!' : 'Uploaded Listing!'}
      </Text>
      <Text style={[styles.productTitle, { color: colors.text }]}>
        {productName} {isEditing ? 'added' : 'saved'}
      </Text>

      <Text style={[styles.infoText, { color: colors.text }]}>
        {isEditing
          ? 'Your store updates have synchronized across all client network channels.'
          : 'Your product has been deployed to the global network catalog and marketplace.'}
      </Text>
      <CustomButton
        title="Product Management Screen"
        style={styles.button}
        onPress={navigateToManagement}
      />
      <TouchableOpacity
        onPress={() => navigation.navigate('Home', { activeTab: 'store' })}
      >
        <Text style={[styles.backHome, { color: colors.primary }]}>
          Back to Store
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    justifyContent: 'center',
    alignContent: 'center',
  },
  congrats: { fontSize: 18, fontWeight: 'bold', marginVertical: 20 },
  productTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 20 },
  infoText: { marginBottom: 20, fontSize: 14, lineHeight: 20 },
  button: {
    paddingHorizontal: 15,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { fontWeight: 'bold', fontSize: 14 },
  backHome: {
    fontSize: 14,
    fontWeight: '600',
  },
});
