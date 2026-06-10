import React, { useMemo } from 'react';
import { View, StyleSheet, FlatList, Dimensions } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAppDataContext } from '../components/EventContext';
import { PageHeader } from '../components/PageHeader';
import { ProductCard } from '../components/ProductCard';
import { UserAvatar } from '../components/UserAvatar';
import { UserIdentity } from '../components/UserIdentity';
import { EmptyState } from '../components/EmptyFlatlistComponent';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; 

export const SellerProductsScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { sellerId, seller } = route.params || {};
  const { allProducts } = useAppDataContext();

  const sellerProducts = useMemo(() => {
    if (!allProducts || !sellerId) return [];
    return allProducts.filter((product: any) => product.sellerId === sellerId);
  }, [allProducts, sellerId]);

  const sellerName = `${seller?.organizationName || seller?.firstname || 'Merchant'}'s Product List`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader 
        title={sellerName} 
        subtitle={`${sellerProducts.length} ${sellerProducts.length === 1 ? 'Product' : 'Products'} available`}
      />

      <FlatList
        data={sellerProducts}
        keyExtractor={(item) => item.productId}
        numColumns={2}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        ListHeaderComponent={
          <View style={[styles.sellerCard, { backgroundColor: colors.backgroundSecondary }]}>
              <UserAvatar
                profilePic={seller?.profilePic}
                firstName={seller?.firstname || 'Merchant'}
                lastName={seller?.lastname}
                organizationName={seller?.organizationName}
                style={styles.sellerAvatar}
              />
              <View style={styles.identityWrapper}>
                <UserIdentity
                  firstname={seller?.firstname || 'Merchant'}
                  lastname={seller?.lastname}
                  username={seller?.username}
                  tier={seller?.tier}
                  isVerified={seller?.isVerified}
                  isOrganization={seller?.usertype === 'enterprise'}
                  organizationName={seller?.organizationName}
                  size="medium"
                />
              </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <ProductCard
              product={item}
              onPress={() =>
                navigation.navigate('ProductDetails', {
                  productId: item.productId,
                })
              }
            />
          </View>
        )}
        ListEmptyComponent={
            <EmptyState
                iconName="search-off"
                title="Assessment start time not set"
                subtitle='This seller has no other products listed.'
            />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15
  },
  scrollContainer: {
    paddingBottom: 24,
  },
  sellerCard: {
    padding: 15,
    marginBottom: 15,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center'
  },
  sellerAvatar: {
    marginRight: 12,
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  identityWrapper: {
    flex: 1,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginBottom: 15,
  },
});