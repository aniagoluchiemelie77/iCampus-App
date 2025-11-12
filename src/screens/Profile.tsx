import React, { useState, useRef, useMemo } from 'react';
import {
  Dimensions,
  FlatList,
  Text,
  View,
  TouchableOpacity,
  Image,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { selectImage } from '../components/SelectImage';
import Icon from 'react-native-vector-icons/Ionicons';

import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSelector } from '../components/hooks';
import type { User, Course } from '../types/firebase';
import {
  HomeScreenComponentStyles,
  NotificationPageStyles,
  homeStyles,
  ProfileComponentStyles,
} from '../assets/styles/colors';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import toastConfig from '../components/ToastConfig';
import { useDispatch } from 'react-redux';
import { updateUserImage } from '../components/UserSlice';
const { width } = Dimensions.get('window');
import { useUploadCourseFormWithProgress } from '../components/FileAndImageUpload';
import { CLOUDINARY_APICLOUDNAME } from '@env';
import Logo from '../assets/images/Logo.tsx';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  pick,
  errorCodes,
  isErrorWithCode,
  types,
} from '@react-native-documents/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import * as Progress from 'react-native-progress';
import ActionSheet from 'react-native-action-sheet';
import RNFS from 'react-native-fs';
export const baseUrl = 'http://192.168.1.98:5000/';
interface ProfileSwiperProps {
  images: string[];
  handleImageUpdate: () => void;
  uploading: boolean;
  homeStyles: any;
  HomeScreenComponentStyles: any;
  styles: any;
}

export const uploadImageToCloudinary = async (
  imageUri: string,
): Promise<string | null> => {
  const data = new FormData();
  data.append('file', {
    uri: imageUri,
    name: 'profile.jpg',
    type: 'image/jpeg',
  });
  data.append('upload_preset', 'profileImgs');

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_APICLOUDNAME}/image/upload`,
      {
        method: 'POST',
        body: data,
      },
    );

    const result = await res.json();
    return result.secure_url;
  } catch (err) {
    console.error('Cloudinary upload failed:', err);
    return null;
  }
};

type NavigationPropProductDetails = StackNavigationProp<
  RootStackParamList,
  'Profile'
>;
//import Icon from 'react-native-vector-icons/Ionicons';
const ProfileSwiper: React.FC<ProfileSwiperProps> = ({
  images,
  handleImageUpdate,
  uploading,
}) => {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    setCurrentIndex(index);
  };

  return (
    <View style={ProfileComponentStyles.imageDiv}>
      <FlatList
        ref={flatListRef}
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => index.toString()}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={{ resizeMode: 'cover', height: 350, width }}
          />
        )}
      />

      <TouchableOpacity
        style={ProfileComponentStyles.button}
        onPress={handleImageUpdate}
      >
        <MaterialIcons
          name="add-a-photo"
          size={uploading ? 37 : 39}
          color="#fff"
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          homeStyles.iconItem,
          HomeScreenComponentStyles.activityIconsb,
          HomeScreenComponentStyles.activityIcons2,
        ]}
      >
        <Icon name="settings-outline" size={28} color="#f54b02" />
      </TouchableOpacity>
      <View style={ProfileComponentStyles.progressBar}>
        <View
          style={[
            ProfileComponentStyles.progressFill,
            { width: `${((currentIndex + 1) / images.length) * 100}%` },
          ]}
        />
      </View>
    </View>
  );
};

export function Profile() {
  const user = useAppSelector(state => state.user);
  const dispatch = useDispatch();
  const navigation = useNavigation<NavigationPropProductDetails>();
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showPoints, setShowPoints] = useState(false);
  const [showTopBar, setShowTopBar] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [courseData, setCourseData] = useState<Course[]>([]);
  const [studentData, setStudentData] = useState<User | null>(null);
  const uploadCourseForm = useUploadCourseFormWithProgress();
  const prepareFileForUpload = async (uri: string, extension: string) => {
    const destPath = `${RNFS.TemporaryDirectoryPath}/upload.${extension}`;
    const exists = await RNFS.exists(destPath);
    console.log('File exists:', exists);
    await RNFS.copyFile(uri, destPath);
    console.log(destPath);
    return `file://${destPath}`;
  };

  const pickImage = async () => {
    const imageResult = await launchImageLibrary({ mediaType: 'photo' });
    const image = imageResult.assets?.[0];
    if (image?.uri && image?.type) {
      console.log(image.uri, image.type);
      setModalVisible(true);
      uploadCourseForm(
        image.uri,
        image.type,
        percent => setUploadProgress(percent),
        data => {
          setCourseData(data.courses);
          setStudentData(data.student);
          setModalVisible(false);
        },
        error => {
          console.error(error);
          Toast.show({
            type: 'error',
            text1: 'Upload failed',
            position: 'bottom',
            bottomOffset: 10,
          });
          setModalVisible(false);
        },
      );
    }
  };

  const pickDocument = async () => {
    console.log('Documents');
    const result = await pick({ type: [types.pdf, types.docx] });
    const file = result?.[0];
    if (file?.uri && file?.type) {
      console.log(file.uri, file.type);
      setModalVisible(true);
      const extension = file.name?.split('.').pop() ?? 'pdf';
      const filePath = await prepareFileForUpload(file.uri, extension);

      uploadCourseForm(
        filePath,
        file.type,
        percent => setUploadProgress(percent),
        data => {
          setCourseData(data.courses);
          setStudentData(data.student);
          setModalVisible(false);
        },
        error => {
          console.error(error);
          Toast.show({
            type: 'error',
            text1: 'Upload failed',
            position: 'bottom',
            bottomOffset: 10,
          });
          setModalVisible(false);
        },
      );
    } else {
      console.warn('Missing file URI or type');
      setModalVisible(false);
    }
  };

  const handleUploadCourseForm = async () => {
    try {
      ActionSheet.showActionSheetWithOptions(
        {
          options: ['Pick Image', 'Pick Document', 'Cancel'],
          cancelButtonIndex: 2,
        },
        buttonIndex => {
          if (buttonIndex === 0) pickImage();
          else if (buttonIndex === 1) pickDocument();
        },
      );
    } catch (err) {
      setModalVisible(false);
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        console.log('User canceled upload');
        Toast.show({
          type: 'error',
          text1: 'Unable to select file',
          position: 'bottom',
          bottomOffset: 10,
        });
      } else {
        console.error('Unexpected error:', err);
      }
    }
  };

  const handleImageUpdate = async () => {
    const imageUri = await selectImage();

    if (imageUri) {
      const imageUrl = await uploadImageToCloudinary(imageUri);

      if (imageUrl) {
        console.log('Uploaded to Cloudinary:', imageUrl);
        setSelectedImage(imageUrl); // ✅ Store Cloudinary URL
        setShowModal(true);
      }
    }
  };

  const confirmUpload = async () => {
    if (!selectedImage) return;

    try {
      setUploading(true);
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${baseUrl}users/upload-profile-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ imageUrl: selectedImage }), // ✅ Send Cloudinary URL
      });

      const result = await response.json();
      if (response.ok && result.imageUrl) {
        dispatch(updateUserImage(result.imageUrl));
      } else {
        Toast.show({
          type: 'error',
          text1: result.message,
          position: 'bottom',
          bottomOffset: 10,
        });
      }
    } catch (err) {
      if (err instanceof Error) {
        Toast.show({
          type: 'error',
          text1: err.message,
          position: 'bottom',
          bottomOffset: 10,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'An unexpected error occurred',
          position: 'bottom',
          bottomOffset: 10,
        });
      }
    } finally {
      setUploading(false);
      setShowModal(false);
      setSelectedImage(null);
    }
  };
  const reversedPics = useMemo(
    () => [...(user.profilePic ?? [])].reverse(),
    [user.profilePic],
  );

  return (
    <LinearGradient
      style={ProfileComponentStyles.container}
      colors={['#eee', '#edccbdff']}
    >
      <ScrollView
        contentContainerStyle={{ alignItems: 'center', position: 'relative' }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: false,
            listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
              const offsetY = event.nativeEvent.contentOffset.y;
              setShowTopBar(offsetY > 120);
            },
          },
        )}
        scrollEventThrottle={16}
      >
        {showTopBar && (
          <View style={ProfileComponentStyles.topBar}>
            <Text style={ProfileComponentStyles.topBarText}>
              {user.firstname} {user.lastname}
            </Text>
            <Logo />
          </View>
        )}
        {Array.isArray(user.profilePic) && user.profilePic.length > 0 && (
          <ProfileSwiper
            images={reversedPics}
            handleImageUpdate={handleImageUpdate}
            uploading={uploading}
            styles={ProfileComponentStyles}
            homeStyles={homeStyles}
            HomeScreenComponentStyles={HomeScreenComponentStyles}
          />
        )}
        <View style={ProfileComponentStyles.nameBoxb}>
          <Text style={ProfileComponentStyles.name}>
            {user.firstname} {user.lastname}
          </Text>
          <View style={ProfileComponentStyles.rowBox2c}>
            {user.staffId ? (
              <MaterialCommunityIcons name="teach" size={17} color="#f54b02" />
            ) : (
              Array.from({
                length: Math.min(
                  parseInt(user.current_level ?? '100', 10) / 100,
                  5,
                ),
              }).map((_, index) => (
                <MaterialIcons
                  key={index}
                  name="star"
                  size={15}
                  color="#f54b02"
                  style={ProfileComponentStyles.iconMargin2}
                />
              ))
            )}
          </View>
        </View>
        <View style={ProfileComponentStyles.nameBox2}>
          <View style={ProfileComponentStyles.rowBox2}>
            <Icon name="mail-outline" size={15} color="#f54b02" />
            <Text style={ProfileComponentStyles.textRight}>{user.email}</Text>
          </View>
          <View style={ProfileComponentStyles.rowBox2}>
            <Icon name="call-outline" size={15} color="#f54b02" />
            <Text style={ProfileComponentStyles.textRight}>
              {user.phone_number}
            </Text>
          </View>
        </View>
        <View style={ProfileComponentStyles.nameBox2}>
          <View style={ProfileComponentStyles.rowBox2b}>
            <Icon name="school-outline" size={15} color="#f54b02" />
            <Text style={ProfileComponentStyles.textRight}>
              {user.schoolName}
            </Text>
          </View>
          <View style={ProfileComponentStyles.rowBox2}>
            <Icon name="school-outline" size={15} color="#f54b02" />
            <Text style={ProfileComponentStyles.textRight}>
              {user.department}
            </Text>
          </View>

          <View style={ProfileComponentStyles.rowBox2}>
            <Icon name="bookmarks-outline" size={14} color="#f54b02" />
            <Text style={ProfileComponentStyles.textRight}>
              {user.staffId ? user.staffId : user.matricNumber}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={ProfileComponentStyles.nameBox3}
          onPress={() => navigation.navigate('PointsPage')}
        >
          <View style={ProfileComponentStyles.rowBox2a}>
            <View style={ProfileComponentStyles.rowBox3}>
              <View style={ProfileComponentStyles.row}>
                <Icon
                  name="diamond"
                  size={18}
                  color="#f54b02"
                  style={ProfileComponentStyles.icon}
                />
                {showPoints ? (
                  <Text style={ProfileComponentStyles.baseText}>
                    <Text style={ProfileComponentStyles.smallText}> </Text>
                    <Text style={ProfileComponentStyles.largeText}>
                      {Math.floor(user.pointsBalance).toLocaleString()}
                    </Text>
                    <Text style={ProfileComponentStyles.smallText}>
                      .{(user.pointsBalance % 1).toFixed(2).split('.')[1]}
                    </Text>
                  </Text>
                ) : (
                  <Text style={ProfileComponentStyles.baseText}>
                    <Text style={ProfileComponentStyles.smallText}>****</Text>
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
                  color="#000"
                  style={ProfileComponentStyles.iconMargin}
                />
              </TouchableOpacity>
            </View>
            <Icon name="chevron-forward" size={24} color="#838282ff" />
          </View>

          <View style={ProfileComponentStyles.rowBox2}>
            <TouchableOpacity
              style={ProfileComponentStyles.equalDiv}
              onPress={() => navigation.navigate('BuyPointsScreen')}
            >
              <MaterialCommunityIcons
                name="cash-plus"
                size={25}
                color="#f54b02"
              />
              <Text style={ProfileComponentStyles.textColored}>Top Up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={ProfileComponentStyles.equalDiv}
              onPress={() => navigation.navigate('WithdrawPointsScreen')}
            >
              <MaterialIcons name="account-balance" size={23} color="#f54b02" />
              <Text style={ProfileComponentStyles.textColored}>Withdraw</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={ProfileComponentStyles.equalDiv}
              onPress={() => navigation.navigate('TransferPointsScreen')}
            >
              <Icon name="send" size={23} color="#f54b02" />
              <Text style={ProfileComponentStyles.textColored}>Transfer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={ProfileComponentStyles.equalDiv}
              onPress={() => navigation.navigate('ReceivePointsScreen')}
            >
              <MaterialIcons
                name="send-and-archive"
                size={23}
                color="#f54b02"
              />
              <Text style={ProfileComponentStyles.textColored}>Recieve</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
        <View style={ProfileComponentStyles.courseBox}>
          {user.staffId ? (
            <>
              <Text style={ProfileComponentStyles.sectionTitle}>
                Courses Teaching
              </Text>
              <View style={ProfileComponentStyles.courseCardDiv}>
                {Array.isArray(user.coursesTeaching) &&
                user.coursesTeaching.length > 0 ? (
                  user.coursesTeaching.map((courseId, index) => (
                    <View key={index} style={ProfileComponentStyles.courseCard}>
                      <Text>Course ID: {courseId}</Text>
                      {/* You can later replace this with full course info */}
                    </View>
                  ))
                ) : (
                  <View style={ProfileComponentStyles.emptyTextDiv}>
                    <MaterialCommunityIcons
                      name="books-off"
                      size={20}
                      color="#807f7fff"
                    />
                    <Text style={NotificationPageStyles.emptyNotificationsText}>
                      No records of courses you teach.
                    </Text>
                  </View>
                )}
              </View>
            </>
          ) : (
            <>
              <Text style={ProfileComponentStyles.sectionTitle}>
                Courses Enrolled
              </Text>
              {Array.isArray(courseData) && courseData.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={ProfileComponentStyles.courseCardDiv}
                >
                  <FlatList
                    data={[...courseData].sort((a, b) =>
                      a.courseCode > b.courseCode ? -1 : 1,
                    )}
                    keyExtractor={(item, index) => `${item.courseId}-${index}`}
                    horizontal
                    contentContainerStyle={{ paddingHorizontal: 6 }}
                    renderItem={({ item }) => (
                      <View style={ProfileComponentStyles.courseCard}>
                        <Text style={ProfileComponentStyles.courseDetailMain}>
                          {item.courseCode}
                        </Text>
                        <Text style={ProfileComponentStyles.courseDetail2}>
                          Credits: {item.credits}
                        </Text>
                        {studentData && (
                          <>
                            {studentData.secondSemesterUnits !== undefined && (
                              <Text
                                style={ProfileComponentStyles.courseDetail3}
                              >
                                2nd Semester Units:{' '}
                                {studentData.secondSemesterUnits}
                              </Text>
                            )}
                            {studentData.firstSemesterUnits !== undefined && (
                              <Text
                                style={ProfileComponentStyles.courseDetail3}
                              >
                                2nd Semester Units:{' '}
                                {studentData.firstSemesterUnits}
                              </Text>
                            )}
                          </>
                        )}
                      </View>
                    )}
                  />
                </ScrollView>
              ) : (
                <View style={ProfileComponentStyles.emptyTextDiv}>
                  <Text style={ProfileComponentStyles.emptyText}>
                    No records of your registered courses
                  </Text>
                  <TouchableOpacity
                    style={ProfileComponentStyles.uploadButton}
                    onPress={handleUploadCourseForm}
                  >
                    <MaterialIcons
                      name="camera-alt"
                      size={20}
                      color="#fff"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={ProfileComponentStyles.uploadText}>
                      Upload course registration form
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
      <Modal visible={showModal} transparent animationType="slide">
        <View style={HomeScreenComponentStyles.overlayCenter}>
          <TouchableWithoutFeedback onPress={() => setShowModal(false)}>
            <View style={HomeScreenComponentStyles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={HomeScreenComponentStyles.popupCenter}>
            <View style={HomeScreenComponentStyles.topHeader2}>
              <Text style={HomeScreenComponentStyles.welcomeText2}>
                Confirm Profile Photo
              </Text>
            </View>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={ProfileComponentStyles.modalImage}
              />
            )}
            <View style={ProfileComponentStyles.modalButtons}>
              <TouchableOpacity
                style={ProfileComponentStyles.confirmButton}
                onPress={confirmUpload}
              >
                <Text style={ProfileComponentStyles.buttonText}>
                  {uploading ? 'Uploading...' : 'Confirm'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={ProfileComponentStyles.cancelButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={ProfileComponentStyles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={HomeScreenComponentStyles.overlayCenter}>
          <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
            <View style={HomeScreenComponentStyles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={HomeScreenComponentStyles.popupCenterSmall}>
            <Progress.Circle
              progress={uploadProgress / 100}
              size={80}
              showsText={true}
              color="#f54b02"
              borderWidth={2}
            />
          </View>
        </View>
      </Modal>

      <Toast config={toastConfig} />
    </LinearGradient>
  );
}

export default Profile;
