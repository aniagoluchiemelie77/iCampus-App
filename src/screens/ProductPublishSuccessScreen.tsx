import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR } from '../assets/styles/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App.tsx';
import { useTheme } from '../context/ThemeContext';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'ProductPublishSuccess'
>;

export const ProductPublishSuccess = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { productName, isEditing } = route.params;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.subContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <MaterialIcons
          name="check-circle-outlined"
          size={60}
          color={colors.primary}
        />
        <Text style={[styles.congrats, { color: colors.textDarker }]}>
          {isEditing ? 'Changes Saved!' : 'Product Live!'}
        </Text>
        <Text style={[styles.productTitle, { color: colors.text }]}>
          {productName} {isEditing ? 'added' : 'saved'}
        </Text>

        <Text style={[styles.infoText, { color: colors.text }]}>
          {isEditing
            ? 'Your store updates have synchronized across all client network channels.'
            : 'Your product has been deployed to the global network catalog and marketplace.'}
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('SalesHub')}
        >
          <Text style={styles.buttonText}>Product Management Screen</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Home', { activeTab: 'store' })}
        >
          <Text style={styles.backHome}>Back to Store</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, alignContent: 'center' },
  subContainer: { padding: 20, alignContent: 'center', borderRadius: 15 },
  congrats: { fontSize: 18, fontWeight: 'bold', marginVertical: 15 },
  productTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 15 },
  infoText: { marginBottom: 15, fontSize: 14 },
  button: {
    backgroundColor: PRIMARY_COLOR,
    width: '100%',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 15,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  backHome: {
    color: PRIMARY_COLOR,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 10,
  },
});