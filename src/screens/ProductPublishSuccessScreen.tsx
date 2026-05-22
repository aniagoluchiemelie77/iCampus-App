import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App.tsx';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductPublishSuccess'>;

export const ProductPublishSuccess = ({ route, navigation }: Props) => {
  const { productName, productType, isEditing } = route.params;

  return (
    <View style={styles.container}>
      <MaterialIcons
        name="check-circle-outlined"
        size={60}
        color={PRIMARY_COLOR}
      />
      
      <Text style={styles.congrats}>
        {isEditing ? 'Changes Saved!' : 'Product Live!'}
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Listing Cataloged</Text>
        <Text style={styles.productTitle} numberOfLines={2}>
          {productName}
        </Text>
        
        <View style={styles.divider} />
        
        <Text style={styles.details}>
          Type: <Text style={styles.typeValue}>{productType}</Text>
        </Text>
      </View>

      <Text style={styles.infoText}>
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
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 20 },
  congrats: { fontSize: 22, fontWeight: 'bold', color: PRIMARY_COLOR, marginVertical: 20 },
  card: { width: '100%', backgroundColor: '#fadccc', borderRadius: 15, padding: 25, alignItems: 'center', marginBottom: 20 },
  label: { fontSize: 12, color: PRIMARY_COLOR_TINT, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10, fontWeight: '600' },
  productTitle: { fontSize: 18, fontWeight: 'bold', color: PRIMARY_COLOR, textAlign: 'center' },
  divider: { height: 1, width: '80%', backgroundColor: PRIMARY_COLOR_TINT, marginVertical: 15, opacity: 0.5 },
  details: { fontSize: 14, color:  PRIMARY_COLOR_TINT, fontWeight: '500' },
  typeValue: { textTransform: 'capitalize', fontWeight: 'bold', color: PRIMARY_COLOR },
  infoText: { textAlign: 'center', color: PRIMARY_COLOR_TINT, paddingHorizontal: 20, marginBottom: 30, lineHeight: 20 },
  button: { backgroundColor: PRIMARY_COLOR, width: '100%', borderRadius: 10, alignItems: 'center', paddingVertical: 14, marginBottom: 15 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  backHome: { color: PRIMARY_COLOR, fontSize: 14, fontWeight: '600', paddingVertical: 10 }
});