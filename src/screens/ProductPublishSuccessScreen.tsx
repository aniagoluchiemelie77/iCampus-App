import React, { useEffect } from 'react';
import {
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App.tsx';
import { useTheme } from '../context/ThemeContext';
import { CommonActions } from '@react-navigation/native';
import { CustomButton } from '../assets/components/AppUIComponents';
import { FloatingSuccessIcon } from '../components/EmptyFlatlistComponent';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'ProductPublishSuccess'
>;

export const ProductPublishSuccess = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { productName, isEditing } = route.params;

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true,
    );
    return () => subscription.remove();
  }, []);

  const navigateToStore = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Home', params: { activeTab: 'store' } }],
      }),
    );
  };

  const navigateToManagement = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'SalesHub' }],
      }),
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <FloatingSuccessIcon size={44} />
          <Text style={[styles.eyebrow, { color: colors.primary }]}>
            {isEditing ? 'LISTING UPDATED' : 'SUCCESSFULLY PUBLISHED'}
          </Text>
          <Text style={[styles.title, { color: colors.textDarker }]}>
            {isEditing ? 'Changes saved' : 'Your listing is live'}
          </Text>
          <Text style={[styles.productName, { color: colors.text }]}>
            {productName}
          </Text>
          <Text style={[styles.infoText, { color: colors.text }]}>
            {isEditing
              ? 'Your latest product details are now saved and reflected across your store.'
              : 'Your product has been added to the store and is ready for shoppers to discover.'}
          </Text>

          <CustomButton
            title="View Store"
            style={styles.primaryButton}
            onPress={navigateToStore}
          />
          <TouchableOpacity
            onPress={navigateToManagement}
            style={styles.secondaryButton}
            accessibilityRole="button"
          >
            <Text style={[styles.secondaryText, { color: colors.primary }]}>
              Manage listings
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 24,
    paddingVertical: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginTop: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 21,
    opacity: 0.78,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  primaryButton: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButton: {
    padding: 14,
    marginTop: 5,
  },
  secondaryText: { fontSize: 14, fontWeight: '700' },
});
