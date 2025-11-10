import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {} from '../assets/styles/colors';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import {
  HomeScreenComponentStyles,
  homeStyles,
  ProfileComponentStyles,
} from '../assets/styles/colors';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector } from '../components/hooks';

type NavigationProp = StackNavigationProp<RootStackParamList>;
const screenWidth = Dimensions.get('window').width;

const PointsPage = () => {
  const navigation2 = useNavigation<NavigationProp>();
  const user = useAppSelector(state => state.user);
  const [showPoints, setShowPoints] = useState(true);
  return (
    <ScrollView contentContainerStyle={PointsPageStyles.container}>
      <View
        style={[
          PointsPageStyles.balanceContainer,
          { height: 350, marginBottom: 25 },
        ]}
      >
        <View style={HomeScreenComponentStyles.searchContainer}>
          <TouchableOpacity onPress={() => navigation2.navigate('Profile')}>
            <Image
              source={{
                uri:
                  user.profilePic?.[user.profilePic.length - 1] ??
                  'https://example.com/default-profile.png',
              }}
              style={PointsPageStyles.profileImage}
            />
          </TouchableOpacity>
          <View style={HomeScreenComponentStyles.iconSubdiv2}>
            <TouchableOpacity
              //onPress={openFavoritesPopup}
              style={[
                homeStyles.iconItem,
                HomeScreenComponentStyles.activityIcons,
                HomeScreenComponentStyles.activityIcons2b,
              ]}
            >
              <MaterialCommunityIcons
                name="bell-outline"
                size={26}
                color="#fff"
              />
              {/*favoriteProducts.length > 0 && (
                <View style={HomeScreenComponentStyles.badge}>
                  <Text style={HomeScreenComponentStyles.badgeText}>
                    {favoriteProducts.length}
                  </Text>
                </View>
              )*/}
            </TouchableOpacity>
            <TouchableOpacity
              //onPress={openCartItemsPopup}
              style={[
                homeStyles.iconItem,
                HomeScreenComponentStyles.activityIcons,
                HomeScreenComponentStyles.activityIcons2b,
              ]}
            >
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={26}
                color="#fff"
              />
              {/*cartProducts.length > 0 && (
                <View style={HomeScreenComponentStyles.badge}>
                  <Text style={HomeScreenComponentStyles.badgeText}>
                    {cartProducts.length}
                  </Text>
                </View>
              )*/}
            </TouchableOpacity>
          </View>
        </View>
        <View style={PointsPageStyles.pointsBox}>
          <View style={ProfileComponentStyles.rowBox3}>
            <View style={ProfileComponentStyles.row}>
              <Icon
                name="diamond"
                size={18}
                color="#fff"
                style={ProfileComponentStyles.icon}
              />
              {showPoints ? (
                <Text style={ProfileComponentStyles.baseText}>
                  <Text style={ProfileComponentStyles.smallTextWhite}> </Text>
                  <Text style={ProfileComponentStyles.largeTextWhite}>
                    {Math.floor(user.pointsBalance).toLocaleString()}
                  </Text>
                  <Text style={ProfileComponentStyles.smallTextWhite}>
                    .{(user.pointsBalance % 1).toFixed(2).split('.')[1]}
                  </Text>
                </Text>
              ) : (
                <Text style={ProfileComponentStyles.baseText}>
                  <Text style={ProfileComponentStyles.smallTextWhite}>
                    ****
                  </Text>
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={() => setShowPoints(prev => !prev)}
              style={ProfileComponentStyles.iconMargin}
            >
              <MaterialIcons
                name={showPoints ? 'visibility' : 'visibility-off'}
                size={22}
                color="#fff"
                style={ProfileComponentStyles.iconMargin}
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={PointsPageStyles.balanceContainerFooter}>
          <View style={PointsPageStyles.columnDiv}>
            <TouchableOpacity
              //style={PointsPageStyles.equalDiv}
              onPress={() => navigation2.navigate('BuyPointsScreen')}
            >
              <MaterialCommunityIcons
                name="cash-plus"
                size={34}
                color="#f54b02"
              />
            </TouchableOpacity>
          </View>
          <View style={PointsPageStyles.columnDiv}>
            <TouchableOpacity
              //style={PointsPageStyles.equalDiv}
              onPress={() => navigation2.navigate('WithdrawPointsScreen')}
            >
              <MaterialIcons name="account-balance" size={25} color="#f54b02" />
            </TouchableOpacity>
          </View>
          <View style={PointsPageStyles.columnDiv}>
            <TouchableOpacity
              //style={PointsPageStyles.equalDiv}
              onPress={() => navigation2.navigate('TransferPointsScreen')}
            >
              <Icon name="send" size={25} color="#f54b02" />
            </TouchableOpacity>
          </View>
          <View style={PointsPageStyles.columnDiv}>
            <TouchableOpacity
              //style={PointsPageStyles.equalDiv}
              onPress={() => navigation2.navigate('ReceivePointsScreen')}
            >
              <MaterialIcons
                name="send-and-archive"
                size={25}
                color="#f54b02"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <Text>PointsPage</Text>
    </ScrollView>
  );
};

export default PointsPage;
const PointsPageStyles = StyleSheet.create({
  container: {
    flexGrow: 1,
    maxWidth: screenWidth,
    alignItems: 'center',
  },
  balanceContainer: {
    width: '100%',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    backgroundColor: '#f54b02',
    position: 'relative',
  },
  profileImage: {
    width: 44,
    height: 44,
    borderRadius: 22, // half of width/height for perfect circle
    borderWidth: 2,
    borderColor: '#fff',
  },
  pointsBox: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    width: '100%',
    justifyContent: 'flex-start',
  },
  balanceContainerFooter: {
    alignSelf: 'center',
    position: 'absolute',
    bottom: -25,
    width: '80%',
    justifyContent: 'space-evenly',
    flexDirection: 'row',
    alignItems: 'center',
  },
  columnDiv: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eee',
    height: 60,
    width: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#f54b02',
  },
});
