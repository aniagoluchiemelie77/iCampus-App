import React, { useRef, useState } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  Text,
  type ViewToken,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { uploadToCloudinary } from '../utils/CloudinaryPresetHelper';
import { PRIMARY_COLOR } from '../assets/styles/colors';
import { patchUserProfile } from '../api/localPatchApis';
import { updateUserImage } from '../context/UserSlice';
import { useDispatch } from 'react-redux';
import Toast from 'react-native-toast-message';
import { useMediaPicker } from '../hooks/useMediaPicker';
import { ImageConfirmationModal } from './ImageConfirmationModal';
import { useTheme } from '../context/ThemeContext';
import { LazyImage } from './LazyImage';

interface ProfileImageCarouselProps {
  images: string | string[] | null | undefined;
  user?: {
    firstname?: string;
    lastname?: string;
    username?: string;
    organizationName?: string;
  };
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_WIDTH = SCREEN_WIDTH - 32;
const CAROUSEL_HEIGHT = 220;

const getInitials = (user?: {
  firstName?: string;
  lastName?: string;
  username?: string;
  organizationName?: string;
}) => {
  if (!user) return 'U';
  if (user.organizationName && user.organizationName.trim().length > 0) {
    const parts = user.organizationName.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return user.organizationName.substring(0, 2).toUpperCase();
  }
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  const identifier = user.firstName || user.username;
  if (identifier && identifier.trim().length > 0) {
    const cleanId = identifier.trim();
    return cleanId.length >= 2
      ? cleanId.substring(0, 2).toUpperCase()
      : cleanId[0].toUpperCase();
  }

  return 'U';
};
export const ProfileImageCarousel = ({
  images: profileImages,
  user,
}: ProfileImageCarouselProps) => {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const { pickImage } = useMediaPicker();

  const [activeIndex, setActiveIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [localImages, setLocalImages] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  // Slides that have entered the viewport; only those are allowed to fetch
  // their image. The first slide starts visible so the header never flashes.
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(
    () => new Set([0]),
  );
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const next = new Set<number>();
      viewableItems.forEach(token => {
        if (token.isViewable && typeof token.index === 'number') {
          next.add(token.index);
        }
      });
      setVisibleIndices(prev => {
        if (prev.size === next.size && [...next].every(i => prev.has(i))) {
          return prev;
        }
        return next;
      });
    },
  ).current;

  const normalizedImages: string[] = React.useMemo(() => {
    let raw: string[] = [];
    if (Array.isArray(profileImages)) {
      raw = profileImages.filter(
        img => typeof img === 'string' && img.trim().length > 0,
      );
    } else if (
      typeof profileImages === 'string' &&
      profileImages.trim().length > 0
    ) {
      raw = [profileImages];
    }
    return Array.from(new Set([...raw, ...localImages]));
  }, [profileImages, localImages]);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / CAROUSEL_WIDTH);
    setActiveIndex(index);
  };
  const handleTriggerPick = async () => {
    const fileData = await pickImage();
    if (!fileData || !fileData.uri) return;

    setSelectedUri(fileData.uri);
    setIsModalVisible(true);
  };
  const handleConfirmUpload = async () => {
    if (!selectedUri) return;

    try {
      setIsUploading(true);
      Toast.show({
        type: 'info',
        text1: 'Uploading image...',
        position: 'bottom',
      });
      const imageUrl = await uploadToCloudinary(selectedUri, 'profile-images');

      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new Error('Failed to retrieve secure URL from storage.');
      }
      const updatedList = [...normalizedImages, imageUrl];
      const apiResponse = await patchUserProfile({ profilePic: updatedList });

      if (apiResponse && apiResponse.success) {
        setLocalImages(prev => [...prev, imageUrl]);
        dispatch(updateUserImage(imageUrl));
        Toast.show({
          type: 'success',
          text1: 'Profile photo updated successfully!',
        });
        setIsModalVisible(false);
        setSelectedUri(null);
      } else {
        throw new Error(
          apiResponse?.error || 'Failed to update profile on server.',
        );
      }
    } catch (error: any) {
      console.error('Image upload error:', error);
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: error?.message || 'Could not process image attachment.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (normalizedImages.length === 0) {
    const initials = getInitials(user);

    return (
      <View style={CarouselStyles.wrapper}>
        <View
          style={[
            CarouselStyles.container,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <View
            style={[
              CarouselStyles.emptyContainer,
              { backgroundColor: PRIMARY_COLOR + '15' },
            ]}
          >
            <View
              style={[
                CarouselStyles.initialsCircle,
                { backgroundColor: PRIMARY_COLOR },
              ]}
            >
              <Text style={CarouselStyles.initialsText}>{initials}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              CarouselStyles.cameraButton,
              { backgroundColor: PRIMARY_COLOR },
            ]}
            onPress={handleTriggerPick}
            disabled={isUploading}
            activeOpacity={0.8}
          >
            <MaterialIcons name="camera-alt" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={CarouselStyles.wrapper}>
      <View
        style={[
          CarouselStyles.container,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <FlatList
          data={normalizedImages}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          keyExtractor={(item, index) => `${item}-${index}`}
          renderItem={({ item, index }) => (
            <View style={CarouselStyles.imageContainer}>
              <LazyImage
                uri={item}
                style={CarouselStyles.image}
                visible={visibleIndices.has(index)}
              />
            </View>
          )}
        />

        {/* Dynamic Pagination Pill Dots */}
        {normalizedImages.length > 1 && (
          <View style={CarouselStyles.paginationContainer}>
            {normalizedImages.map((_, index) => (
              <View
                key={index}
                style={[
                  CarouselStyles.dot,
                  {
                    backgroundColor:
                      index === activeIndex
                        ? '#fff'
                        : 'rgba(255, 255, 255, 0.4)',
                    width: index === activeIndex ? 22 : 6,
                  },
                ]}
              />
            ))}
          </View>
        )}
        <TouchableOpacity
          style={[
            CarouselStyles.cameraButton,
            { backgroundColor: PRIMARY_COLOR, opacity: isUploading ? 0.7 : 1 },
          ]}
          onPress={handleTriggerPick}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name={isUploading ? 'hourglass-empty' : 'camera-alt'}
            size={18}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
      <ImageConfirmationModal
        isVisible={isModalVisible}
        imageUri={selectedUri}
        onClose={() => {
          if (!isUploading) {
            setIsModalVisible(false);
            setSelectedUri(null);
          }
        }}
        onConfirm={handleConfirmUpload}
        isUploading={isUploading}
      />
    </View>
  );
};

const CarouselStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginVertical: 12,
  },
  container: {
    width: CAROUSEL_WIDTH,
    height: CAROUSEL_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  imageContainer: {
    width: CAROUSEL_WIDTH,
    height: CAROUSEL_HEIGHT,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  emptyContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  initialsCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  initialsText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
});
