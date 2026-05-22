import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
  Alert,
  Switch,
  ActivityIndicator,
  PermissionsAndroid,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import ImagePicker from 'react-native-image-crop-picker';
import DocumentPicker from 'react-native-document-picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
  PRIMARY_COLOR_TINT_MAIN,
} from '../assets/styles/colors';
import DropDownPicker from 'react-native-dropdown-picker';
import {
  Product,
  DropOffStation,
  GeolocationPosition,
  GeolocationError,
} from '../types/firebase';
import Video from 'react-native-video';
import { uploadLessonVideoAPI } from '../api/localPostApis';
import { fetchDropOffStationsAPI } from '../api/localGetApis';
import { uploadFileToFirebaseClient } from '../utils/CloudinaryPresetHelper';
import { fetchLiveRate } from '../utils/UserTransactionsHelpers';
import { useAppSelector } from '../components/hooks';
import { launchImageLibrary } from 'react-native-image-picker';

type ItemCategory = Product['type'];
interface VideoDurationExtractorProps {
  uri: string;
  onDurationExtracted: (duration: number) => void;
}
interface FormState {
  price: string;
  category: ItemCategory;
}
interface StepHeaderProps {
  number: number;
  title: string;
  currentStep: number;
  toggleStep: (step: number) => void;
}
type UIContentItem = NonNullable<
  Product['courseDetails']
>['content'][number] & {
  isUploading?: boolean;
  verificationStatus?:
    | 'Approved'
    | 'Pending Review'
    | 'Flagged/Rejected'
    | 'Failed';
};
const CATEGORY_MAX_PRICES: Record<ItemCategory, number> = {
  file: 100,
  course: 500,
  physical: 1000,
};
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
export const VideoDurationExtractor = ({
  uri,
  onDurationExtracted,
}: VideoDurationExtractorProps) => {
  return (
    <Video
      source={{ uri }}
      paused={true}
      mixWithOthers="mix"
      style={{ width: 0, height: 0, position: 'absolute' }}
      onLoad={meta => {
        if (meta && meta.duration) {
          onDurationExtracted(Math.round(meta.duration));
        }
      }}
      onError={err => console.log('Metadata extraction failed:', err)}
    />
  );
};
export default function PriceSectionComponent({ userCountry = 'Nigeria' }) {
  const [form, setForm] = useState<FormState>({ price: '', category: 'file' });
  const [exchangeDetails, setExchangeDetails] = useState<{
    rate: number;
    symbol: string;
    code: string;
    loading: boolean;
  }>({
    rate: 1,
    symbol: '₦',
    code: 'NGN',
    loading: true,
  });

  useEffect(() => {
    const getMarketRates = async () => {
      try {
        const result = await fetchLiveRate(userCountry);
        setExchangeDetails({
          rate: result.rate,
          symbol: result.symbol,
          code: result.code,
          loading: false,
        });
      } catch (err) {
        setExchangeDetails(prev => ({ ...prev, loading: false }));
      }
    };

    getMarketRates();
  }, [userCountry]);

  const ICASH_TO_USD_ANCHOR = 0.74;
  const localRatePerIcash = exchangeDetails.rate * ICASH_TO_USD_ANCHOR;
  const icashEntered = parseFloat(form.price) || 0;

  // Dynamic pricing caps validation logic
  const maxAllowedIcash = CATEGORY_MAX_PRICES[form.category];
  const isOverpriced = icashEntered > maxAllowedIcash;

  const rawConvertedAmount = icashEntered * localRatePerIcash;

  const formattedLocalCurrency = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rawConvertedAmount);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Price (iCash)</Text>
      <TextInput
        style={[styles.input, isOverpriced && styles.inputWarning]}
        placeholder="0.00"
        keyboardType="numeric"
        value={form.price}
        onChangeText={text => setForm(prev => ({ ...prev, price: text }))}
      />

      {/* Dynamic Regulator Error Text */}
      {isOverpriced && (
        <Text style={styles.warningText}>
          ⚠️ This exceeds the maximum limit of {maxAllowedIcash} iCash allowed
          for a {form.category}.
        </Text>
      )}

      {/* Secondary Local Currency Equivalent Input (Non-editable) */}
      <Text style={styles.label}>
        Estimated Local Value ({exchangeDetails.code})
      </Text>
      <View style={styles.disabledInputWrapper}>
        <Text style={styles.currencyPrefix}>{exchangeDetails.symbol}</Text>
        <TextInput
          style={[styles.input, styles.disabledInput]}
          value={form.price ? formattedLocalCurrency : '0.00'}
          editable={false}
          selectTextOnFocus={false}
        />
        {exchangeDetails.loading && (
          <ActivityIndicator
            size="small"
            color="#007AFF"
            style={styles.spinner}
          />
        )}
      </View>
      <Text style={styles.rateHint}>
        Rate anchored at 1 iCash = {exchangeDetails.symbol}
        {(exchangeDetails.rate * ICASH_TO_USD_ANCHOR).toFixed(2)}{' '}
        {exchangeDetails.code}
      </Text>
    </View>
  );
}
const StepHeader = ({
  number,
  title,
  currentStep,
  toggleStep,
}: StepHeaderProps) => (
  <TouchableOpacity
    onPress={() => toggleStep(number)}
    style={[
      styles.stepHeader,
      currentStep === number && styles.activeStepHeader,
    ]}
  >
    <View style={styles.headerLead}>
      <View
        style={[styles.stepBadge, currentStep === number && styles.activeBadge]}
      >
        <Text
          style={[
            styles.stepNumber,
            currentStep === number && styles.activeStepNumber,
          ]}
        >
          {number}
        </Text>
      </View>
      <Text
        style={[
          styles.stepTitle,
          currentStep === number && styles.activeStepTitle,
        ]}
      >
        {title}
      </Text>
    </View>
    <MaterialIcons
      name={
        currentStep === number ? 'keyboard-arrow-up' : 'keyboard-arrow-down'
      }
      size={24}
      color={PRIMARY_COLOR}
    />
  </TouchableOpacity>
);
export const CreateProductScreen = () => {
  const user = useAppSelector(state => state.user);
  const [activeStep, setActiveStep] = useState(1);
  const [nicheOpen, setNicheOpen] = useState(false);
  const [nicheValue, setNicheValue] = useState(null);
  const [nicheItems, setNicheItems] = useState([
    { label: 'Study Guides & Documents', value: 'Documents', group: 'file' },
    { label: 'Checklists & Templates', value: 'Templates', group: 'file' },
    { label: 'Code & Dev Resources', value: 'Software Assets', group: 'file' },
    {
      label: 'Premium Masterclasses & Courses',
      value: 'Courses',
      group: 'course',
    },
    {
      label: 'Audio Guides & Audiobooks',
      value: 'Audio Resources',
      group: 'course',
    },
    {
      label: ' Tech Gears & Electronics',
      value: 'Electronics',
      group: 'physical',
    },
    { label: 'Apparel & Wardrobe', value: 'Fashion', group: 'physical' },
    {
      label: 'Desk Setup & Stationery',
      value: 'Stationery',
      group: 'physical',
    },
    {
      label: 'Quick Bites & Munchies',
      value: 'Snacks and Deserts',
      group: 'physical',
    },
    { label: 'Hot Meals & Refreshments', value: 'Food', group: 'physical' },
    {
      label: 'Self-Care & Essentials',
      value: 'Health & Beauty',
      group: 'physical',
    },
    { label: 'Handcrafted & Custom Arts', value: 'Crafts', group: 'physical' },
  ]);
  const [stations, setStations] = useState<DropOffStation[]>([]);
  const [_loading, setLoading] = useState<boolean>(true);
  const [images, setImages] = useState<string[]>([]);
  const [colorInput, setColorInput] = useState('');
  const [sizeInput, setSizeInput] = useState('');
  const [courseThumbnail, setCourseThumbnail] = useState<string | null>(null);
  const [lessons, setLessons] = useState<UIContentItem[]>([]);
  const [activeExtractingUri, setActiveExtractingUri] = useState<{
    uri: string;
    index: number;
  } | null>(null);
  const nicheToTypeMap: Record<Product['niche'], Product['type']> = {
    Courses: 'course',
    Documents: 'file',
    Electronics: 'physical',
    Fashion: 'physical',
    Stationery: 'physical',
    'Snacks and Deserts': 'physical',
    Food: 'physical',
  };
  const productType: Product['type'] = nicheValue
    ? nicheToTypeMap[nicheValue as Product['niche']]
    : 'physical';
  console.log(productType);
  const [physicalDetails, setPhysicalDetails] = useState<{
    weightKg: string;
    inStock: string;
    sellerGateways: ('drop_off' | 'home_delivery')[];
    dropOffAddress: DropOffStation[];
    colors: string[];
    sizes: string[];
  }>({
    weightKg: '',
    inStock: '',
    sellerGateways: ['drop_off'],
    dropOffAddress: [],
    colors: [],
    sizes: [],
  });
  const [courseDetails, setCourseDetails] = useState<{
    additionalLecturersRaw: string;
    content: UIContentItem[];
  }>({
    additionalLecturersRaw: '',
    content: [],
  });
  const [fileDetails, setFileDetails] = useState<{
    fileName: string;
    fileSizeInMB: number;
    fileFormat: string;
    fileUrl: string;
    hasPassword?: boolean;
    passwordProtectionKey?: string;
    isUploading: boolean;
  }>({
    fileName: '',
    fileSizeInMB: 0,
    fileFormat: '',
    fileUrl: '',
    hasPassword: false,
    isUploading: false,
  });
  const toggleStep = (step: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveStep(activeStep === step ? 0 : step);
  };
  const pickProductImages = () => {
    ImagePicker.openPicker({
      multiple: true,
      maxFiles: 5,
      mediaType: 'photo',
      compressImageQuality: 0.8,
    })
      .then(selectedAssets => {
        const selectedUris = selectedAssets.map(asset => asset.path);
        setImages(prev => [...prev, ...selectedUris].slice(0, 5));
      })
      .catch(err => {
        if (err.message !== 'User cancelled image selection') {
          Alert.alert(
            'Selection Error',
            'Could not cleanly read selected images.',
          );
        }
      });
  };
  const pickLessonVideo = async (index: number) => {
    try {
      const response = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.video],
        copyTo: 'cachesDirectory',
      });
      const targetUri = response.fileCopyUri || response.uri;
      const fileName = response.name || `lesson-video-${Date.now()}.mp4`;
      const fileType = response.type || 'video/mp4';
      setLessons(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], videoUrl: targetUri };
        return updated;
      });

      // 2. Trigger off-screen structural frame duration logging locally
      setActiveExtractingUri({ uri: targetUri, index });

      // 3. Initiate background upload verification pipeline
      setLessons(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], isUploading: true }; // UI indicator
        return updated;
      });

      const uploadResult = await uploadLessonVideoAPI(
        targetUri,
        fileName,
        fileType,
      );

      setLessons(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          isUploading: false,
          videoUrl: uploadResult.success ? uploadResult.data.permanentUrl : '',
          verificationStatus: uploadResult.success
            ? uploadResult.data.status
            : 'Failed',
        };
        return updated;
      });

      if (!uploadResult.success) {
        Alert.alert('Upload Notice', uploadResult.message);
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.error('File selection handling error:', err);
      }
    }
  };
  const pickDigitalFile = async () => {
    try {
      const response = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      });

      const targetUri = response.fileCopyUri || response.uri;
      const rawName = response.name || `digital-asset-${Date.now()}`;
      const extension = rawName.split('.').pop()?.toUpperCase() || 'UNKNOWN';
      const sizeInBytes = response.size || 0;
      const sizeInMB = parseFloat((sizeInBytes / (1024 * 1024)).toFixed(2));
      setFileDetails(prev => ({
        ...prev,
        fileName: rawName,
        fileSizeInMB: sizeInMB,
        fileFormat: extension,
        isUploading: true,
      }));
      const uploadResult = await uploadFileToFirebaseClient(
        targetUri,
        'digital-products',
      );
      setFileDetails(prev => ({
        ...prev,
        isUploading: false,
        fileUrl: uploadResult.success
          ? uploadResult.data?.permanentUrl || ''
          : '',
      }));

      if (!uploadResult.success) {
        Alert.alert('Upload Failed', uploadResult.message);
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.error('Document picking execution exception:', err);
      }
    }
  };
  const pickCourseThumbnail = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 1,
      },
      response => {
        if (response.didCancel) return;
        if (response.errorCode) {
          console.log('ImagePicker Error: ', response.errorMessage);
          return;
        }

        const uri = response.assets?.[0]?.uri;
        if (uri) {
          setCourseThumbnail(uri);
        }
      },
    );
  };
  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      return true;
    }
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message:
              'This app needs access to your location to find the closest drop-off stations.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return false;
  };
  useEffect(() => {
    const getNearbyStations = async () => {
      try {
        setLoading(true);
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
          const response = await fetchDropOffStationsAPI();
          if (response.success) setStations(response.data);
          setLoading(false);
          return;
        }
        Geolocation.getCurrentPosition(
          async (position: GeolocationPosition) => {
            const { latitude, longitude } = position.coords;
            const response = await fetchDropOffStationsAPI(latitude, longitude);
            if (response.success) {
              setStations(response.data);
            }
            setLoading(false);
          },
          async (error: GeolocationError) => {
            console.log('Location error code:', error.code, error.message);
            const response = await fetchDropOffStationsAPI();
            if (response.success) setStations(response.data);
            setLoading(false);
          },
          {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 10000,
          },
        );
      } catch (error) {
        console.error('Error fetching stations:', error);
        setLoading(false);
      }
    };

    getNearbyStations();
  }, []);
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.mainTitle}>Create New Listing</Text>
      {/* --- STEP 1: GENERAL INFO --- */}
      <View style={styles.card}>
        <StepHeader
          number={1}
          title="General Information"
          currentStep={activeStep}
          toggleStep={toggleStep}
        />
        {activeStep === 1 && (
          <View style={styles.expandedContent}>
            <Text style={styles.label}>Product Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Shoes, bags, wristwatch..."
              placeholderTextColor={PRIMARY_COLOR_TINT}
            />
            <Text style={styles.label}>Product Description</Text>
            <TextInput
              style={styles.bioInput}
              multiline
              placeholder="A brief description of your listing (optional)."
              placeholderTextColor={PRIMARY_COLOR_TINT}
            />
            <Text style={styles.label}>Niche (Category)</Text>
            <View style={{ zIndex: 2000 }}>
              <DropDownPicker
                open={nicheOpen}
                value={nicheValue}
                items={nicheItems}
                setOpen={setNicheOpen}
                setValue={setNicheValue}
                setItems={setNicheItems}
                placeholder="Select a category"
                listMode="MODAL"
                modalProps={{
                  animationType: 'fade',
                }}
                style={styles.dropdownPicker}
                dropDownContainerStyle={styles.dropdownList}
                textStyle={styles.dropdownText}
                labelStyle={{ fontWeight: '600', color: PRIMARY_COLOR }}
                placeholderStyle={{ color: PRIMARY_COLOR_TINT }}
              />
            </View>
          </View>
        )}
      </View>
      {/* --- STEP 2: MEDIA UPLOAD --- */}
      <View style={styles.card}>
        <StepHeader
          number={2}
          title={
            productType === 'course'
              ? 'Course Lessons & Video Curriculum'
              : 'Media & Photos'
          }
          currentStep={activeStep}
          toggleStep={toggleStep}
        />
        {activeStep === 2 && (
          <View style={styles.expandedContent}>
            {productType !== 'course' ? (
              <View>
                <TouchableOpacity
                  style={styles.uploadPlaceholder}
                  onPress={pickProductImages}
                >
                  <MaterialIcons
                    name="cloud-upload-outlined"
                    size={40}
                    color={PRIMARY_COLOR}
                  />
                  <Text style={styles.uploadText}>
                    Tap to upload product images
                  </Text>
                </TouchableOpacity>
                {images.length > 0 && (
                  <ScrollView horizontal style={styles.thumbnailContainer}>
                    {images.map((uri, idx) => (
                      <View key={idx} style={styles.thumbnailWrapper}>
                        <Image source={{ uri }} style={styles.thumbnail} />
                        <TouchableOpacity
                          style={styles.removeBadge}
                          onPress={() =>
                            setImages(prev => prev.filter((_, i) => i !== idx))
                          }
                        >
                          <MaterialIcons
                            name="cancel-outlined"
                            size={18}
                            color={PRIMARY_COLOR}
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            ) : (
              <View>
                <Text style={styles.sectionSubtitle}>
                  Build your curriculum. Add lessons and attach video files.
                </Text>
                <Text style={styles.miniLabel}>Course Cover Thumbnail</Text>
                {courseThumbnail ? (
                  <View style={styles.courseThumbnailPreviewWrapper}>
                    <Image
                      source={{ uri: courseThumbnail }}
                      style={styles.courseThumbnailPreview}
                    />
                    <TouchableOpacity
                      style={styles.courseThumbnailRemoveBtn}
                      onPress={() => setCourseThumbnail(null)}
                    >
                      <MaterialIcons
                        name="delete-outlined"
                        size={16}
                        color={PRIMARY_COLOR}
                      />
                      <Text style={styles.courseThumbnailRemoveText}>
                        Remove Cover
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.courseThumbnailPlaceholder}
                    onPress={pickCourseThumbnail}
                  >
                    <MaterialIcons
                      name="image-search-outlined"
                      size={24}
                      color={PRIMARY_COLOR}
                    />
                    <Text style={styles.courseThumbnailPlaceholderText}>
                      Upload Course Thumbnail
                    </Text>
                  </TouchableOpacity>
                )}
                <View style={styles.divider} />
                <Text style={styles.miniLabel}>Lessons & Video Modules</Text>
                {lessons.map((lesson, index) => (
                  <View key={index} style={styles.lessonCard}>
                    <View style={styles.lessonHeaderRow}>
                      <Text style={styles.lessonNumberLabel}>
                        Lesson {index + 1}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setLessons(prev => prev.filter((_, i) => i !== index))
                        }
                      >
                        <MaterialIcons
                          name="delete-outlined"
                          size={20}
                          color={PRIMARY_COLOR}
                        />
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      style={styles.input}
                      placeholder="Lesson Title (e.g., Intro to Programming)"
                      value={lesson.title}
                      onChangeText={text => {
                        const updated = [...lessons];
                        updated[index].title = text;
                        setLessons(updated);
                      }}
                    />
                    <View style={styles.lessonMetaRow}>
                      <TouchableOpacity
                        style={styles.videoAttachBtn}
                        onPress={() => {
                          pickLessonVideo(index);
                        }}
                      >
                        <MaterialIcons
                          name="video-library-outlined"
                          size={18}
                          color="#fff"
                        />
                        <Text style={styles.videoAttachText}>
                          {lesson.videoUrl ? 'Video Attached' : 'Upload Video'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.previewToggle,
                          lesson.isFreePreview && styles.previewToggleActive,
                        ]}
                        onPress={() => {
                          const updated = [...lessons];
                          updated[index].isFreePreview =
                            !updated[index].isFreePreview;
                          setLessons(updated);
                        }}
                      >
                        <Text
                          style={[
                            styles.previewToggleText,
                            lesson.isFreePreview && { color: PRIMARY_COLOR },
                          ]}
                        >
                          Free Preview
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.addLessonBtn}
                  onPress={() =>
                    setLessons(prev => [
                      ...prev,
                      {
                        title: '',
                        videoUrl: '',
                        duration: 0,
                        isFreePreview: false,
                      },
                    ])
                  }
                >
                  <MaterialIcons name="add" size={20} color={PRIMARY_COLOR} />
                  <Text style={styles.addLessonBtnText}>Add New Lesson</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
      {/* --- STEP 3: TYPE-SPECIFIC DETAILS --- */}
      <View style={styles.card}>
        <StepHeader
          number={3}
          toggleStep={toggleStep}
          title={`${
            productType.charAt(0).toUpperCase() + productType.slice(1)
          } Details`}
          currentStep={activeStep}
        />
        {activeStep === 3 && (
          <View style={styles.expandedContent}>
            {productType === 'physical' && (
              <View style={styles.sectionContainer}>
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.label}>Weight (Kg)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.5"
                      keyboardType="numeric"
                      value={physicalDetails.weightKg}
                      onChangeText={text =>
                        setPhysicalDetails(prev => ({
                          ...prev,
                          weightKg: text,
                        }))
                      }
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Stock Quantity</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="10"
                      keyboardType="numeric"
                      value={physicalDetails.inStock}
                      onChangeText={text =>
                        setPhysicalDetails(prev => ({ ...prev, inStock: text }))
                      }
                    />
                  </View>
                </View>
                <View style={styles.variantSection}>
                  {/* A. Colors Tag Input */}
                  <Text style={styles.label}>Available Colors (Optional)</Text>
                  <View style={styles.tagInputContainer}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0 }]}
                      placeholder="e.g. Red, Blue, Matte Black"
                      value={colorInput}
                      onChangeText={setColorInput}
                      onSubmitEditing={() => {
                        if (!colorInput.trim()) return;
                        setPhysicalDetails(prev => ({
                          ...prev,
                          colors: prev.colors.includes(colorInput.trim())
                            ? prev.colors
                            : [...prev.colors, colorInput.trim()],
                        }));
                        setColorInput('');
                      }}
                    />
                    <TouchableOpacity
                      style={styles.addTagButton}
                      onPress={() => {
                        if (!colorInput.trim()) return;
                        setPhysicalDetails(prev => ({
                          ...prev,
                          colors: prev.colors.includes(colorInput.trim())
                            ? prev.colors
                            : [...prev.colors, colorInput.trim()],
                        }));
                        setColorInput('');
                      }}
                    >
                      <Text style={styles.addTagButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.tagWrapper}>
                    {physicalDetails.colors.map((color, index) => (
                      <TouchableOpacity
                        key={`color-${index}`}
                        style={[
                          styles.tagBadge,
                          { backgroundColor: '#fadccc' },
                        ]}
                        onPress={() =>
                          setPhysicalDetails(prev => ({
                            ...prev,
                            colors: prev.colors.filter(c => c !== color),
                          }))
                        }
                      >
                        <Text style={styles.tagText}>{color} ✕</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={[styles.label, { marginTop: 8 }]}>
                    Available Sizes (Optional)
                  </Text>
                  <View style={styles.tagInputContainer}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0 }]}
                      placeholder="e.g. Medium, XL, 42, 10 inches"
                      value={sizeInput}
                      onChangeText={setSizeInput}
                      onSubmitEditing={() => {
                        if (!sizeInput.trim()) return;
                        setPhysicalDetails(prev => ({
                          ...prev,
                          sizes: prev.sizes.includes(sizeInput.trim())
                            ? prev.sizes
                            : [...prev.sizes, sizeInput.trim()],
                        }));
                        setSizeInput('');
                      }}
                    />
                    <TouchableOpacity
                      style={styles.addTagButton}
                      onPress={() => {
                        if (!sizeInput.trim()) return;
                        setPhysicalDetails(prev => ({
                          ...prev,
                          sizes: prev.sizes.includes(sizeInput.trim())
                            ? prev.sizes
                            : [...prev.sizes, sizeInput.trim()],
                        }));
                        setSizeInput('');
                      }}
                    >
                      <Text style={styles.addTagButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.tagWrapper}>
                    {physicalDetails.sizes.map((size, index) => (
                      <TouchableOpacity
                        key={`size-${index}`}
                        style={styles.tagBadge}
                        onPress={() =>
                          setPhysicalDetails(prev => ({
                            ...prev,
                            sizes: prev.sizes.filter(s => s !== size),
                          }))
                        }
                      >
                        <Text style={styles.tagText}>{size}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <Text style={styles.label}>Fulfillment / Delivery Options</Text>
                <Text style={styles.subLabel}>
                  How will the buyer receive this item? Select all that apply.
                </Text>
                <View style={styles.gatewayRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.gatewayChip,
                      physicalDetails.sellerGateways.includes('drop_off') &&
                        styles.activeChip,
                    ]}
                    onPress={() => {
                      setPhysicalDetails(prev => {
                        const hasIt = prev.sellerGateways.includes('drop_off');
                        const updated = hasIt
                          ? prev.sellerGateways.filter(g => g !== 'drop_off')
                          : [...prev.sellerGateways, 'drop_off'];

                        return {
                          ...prev,
                          sellerGateways: updated as (
                            | 'drop_off'
                            | 'home_delivery'
                          )[],
                          dropOffAddress: hasIt ? [] : prev.dropOffAddress,
                        };
                      });
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        physicalDetails.sellerGateways.includes('drop_off') &&
                          styles.activeChipText,
                      ]}
                    >
                      Drop-off Station
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.gatewayChip,
                      physicalDetails.sellerGateways.includes(
                        'home_delivery',
                      ) && styles.activeChip,
                    ]}
                    onPress={() => {
                      setPhysicalDetails(prev => {
                        const hasIt =
                          prev.sellerGateways.includes('home_delivery');
                        const updated = hasIt
                          ? prev.sellerGateways.filter(
                              g => g !== 'home_delivery',
                            )
                          : [...prev.sellerGateways, 'home_delivery'];

                        return {
                          ...prev,
                          sellerGateways: updated as (
                            | 'drop_off'
                            | 'home_delivery'
                          )[],
                        };
                      });
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        physicalDetails.sellerGateways.includes(
                          'home_delivery',
                        ) && styles.activeChipText,
                      ]}
                    >
                      Home Delivery
                    </Text>
                  </TouchableOpacity>
                </View>
                {physicalDetails.sellerGateways.includes('drop_off') && (
                  <View style={styles.stationBlock}>
                    <Text style={[styles.label, { marginTop: 12 }]}>
                      Select Drop-off Hubs Nearby
                    </Text>
                    <Text style={styles.subLabel}>
                      Choose where you will physically drop this package upon
                      sale.
                    </Text>
                    {stations.map(station => {
                      const isSelected = physicalDetails.dropOffAddress.some(
                        s => s.code === station.code,
                      );
                      return (
                        <TouchableOpacity
                          key={station.code}
                          activeOpacity={0.9}
                          style={[
                            styles.stationCard,
                            isSelected && styles.activeStationCard,
                          ]}
                          onPress={() => {
                            setPhysicalDetails(prev => {
                              const alreadySelected = prev.dropOffAddress.some(
                                s => s.code === station.code,
                              );
                              const updatedStations = alreadySelected
                                ? prev.dropOffAddress.filter(
                                    s => s.code !== station.code,
                                  )
                                : [...prev.dropOffAddress, station];
                              return {
                                ...prev,
                                dropOffAddress: updatedStations,
                              };
                            });
                          }}
                        >
                          <View style={styles.stationInfo}>
                            <Text style={styles.stationName}>
                              {station.name}
                            </Text>
                            <Text style={styles.stationAddress}>
                              {station.address}
                            </Text>
                          </View>
                          {isSelected && (
                            <MaterialIcons
                              name="check-circle-outlined"
                              size={15}
                              color={PRIMARY_COLOR}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
            {productType === 'course' && (
              <View style={styles.sectionContainer}>
                <Text style={styles.label}>
                  Co-Lecturers / Instructors (Optional)
                </Text>
                <Text style={styles.subLabel}>
                  You are automatically assigned as the primary instructor. Add
                  other creator UIDs separated by commas if you are co-authoring
                  this course.
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="e.g. uid_abc123, uid_xyz789"
                  value={courseDetails.additionalLecturersRaw}
                  onChangeText={text =>
                    setCourseDetails(prev => ({
                      ...prev,
                      additionalLecturersRaw: text,
                    }))
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}
            {productType === 'file' && (
              <View style={styles.sectionContainer}>
                <Text style={styles.label}>Upload Digital Product Asset</Text>
                <Text style={styles.subLabel}>
                  Upload the document, textbook, or source archive. Buyers will
                  instantly unlock download access post-checkout.
                </Text>

                {/* File Action Box */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.fileUploadBox,
                    fileDetails.fileUrl ? styles.fileUploadedBox : null,
                  ]}
                  onPress={pickDigitalFile}
                  disabled={fileDetails.isUploading}
                >
                  {fileDetails.isUploading ? (
                    <ActivityIndicator size="small" color="#007AFF" />
                  ) : fileDetails.fileUrl ? (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={styles.fileIcon}>📄</Text>
                      <Text style={styles.fileNameText} numberOfLines={1}>
                        {fileDetails.fileName}
                      </Text>
                      <Text style={styles.fileMetaText}>
                        {fileDetails.fileFormat} • {fileDetails.fileSizeInMB} MB
                      </Text>
                      <Text style={styles.reUploadText}>
                        Tap to replace file
                      </Text>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={styles.uploadCloudIcon}>📥</Text>
                      <Text style={styles.uploadBoxText}>
                        Select PDF, ZIP, EPUB, or Source Document
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Has Password Protection Toggle */}
                <View style={styles.switchContainer}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.switchLabel}>
                      Password Protected Archive
                    </Text>
                    <Text style={styles.subLabel}>
                      Toggle this if your file requires a key sequence to
                      extract or read.
                    </Text>
                  </View>
                  <Switch
                    value={fileDetails.hasPassword}
                    onValueChange={value =>
                      setFileDetails(prev => ({ ...prev, hasPassword: value }))
                    }
                    trackColor={{ true: '#007AFF' }}
                  />
                </View>

                {/* Optional Key Entry Field */}
                {fileDetails.hasPassword && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.label}>Extraction Password / Key</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter extraction password details for buyer"
                      value={fileDetails.passwordProtectionKey}
                      onChangeText={text =>
                        setFileDetails(prev => ({
                          ...prev,
                          passwordProtectionKey: text,
                        }))
                      }
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </View>
      {/* --- STEP 4: Price --- */}
      <View style={styles.card}>
        <StepHeader
          number={4}
          toggleStep={toggleStep}
          title="Inventory & Stock"
          currentStep={activeStep}
        />
        {activeStep === 4 && (
          <PriceSectionComponent userCountry={user?.country} />
        )}
      </View>
      <TouchableOpacity style={styles.submitButton}>
        <Text style={styles.submitButtonText}>Publish Product</Text>
      </TouchableOpacity>
      {activeExtractingUri && (
        <VideoDurationExtractor
          uri={activeExtractingUri.uri}
          onDurationExtracted={durationInSeconds => {
            setLessons(prev => {
              const updated = [...prev];
              updated[activeExtractingUri.index].duration = durationInSeconds;
              return updated;
            });
            // Kill the component instance immediately after extracting
            setActiveExtractingUri(null);
          }}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  mainTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  activeStepHeader: { backgroundColor: '#fadccc' },
  headerLead: { flexDirection: 'row', alignItems: 'center' },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activeBadge: { backgroundColor: PRIMARY_COLOR },
  stepNumber: { fontSize: 14, fontWeight: 'bold', color: PRIMARY_COLOR },
  activeStepNumber: { color: '#fff' },
  stepTitle: { fontSize: 14, fontWeight: '600', color: '#222', flex: 1 },
  activeStepTitle: { color: PRIMARY_COLOR },
  expandedContent: {
    padding: 18,
    paddingTop: 0,
    borderTopWidth: 0.8,
    borderTopColor: PRIMARY_COLOR_TINT,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#222',
    marginVertical: 15,
  },
  input: {
    backgroundColor: '#fadccc',
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 8,
    padding: 15,
    fontSize: 14,
  },
  typeSelector: { flexDirection: 'row', marginTop: 5 },
  typeBtn: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginRight: 8,
  },
  activeTypeBtn: { borderColor: PRIMARY_COLOR, backgroundColor: '#F0F7FF' },
  typeBtnText: {
    textTransform: 'capitalize',
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeTypeBtnText: { color: PRIMARY_COLOR },
  uploadPlaceholder: {
    height: 120,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    borderRadius: 12,
    alignContent: 'center',
    marginTop: 15,
  },
  uploadText: { color: PRIMARY_COLOR_TINT, marginTop: 8, fontSize: 13 },
  submitButton: {
    backgroundColor: PRIMARY_COLOR,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 25,
  },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  bioInput: {
    height: 120,
    backgroundColor: '#fadccc',
    padding: 15,
    textAlignVertical: 'top',
    fontSize: 14,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 8,
  },
  dropdownPicker: {
    backgroundColor: '#fadccc',
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 8,
    borderWidth: 0.8,
    paddingHorizontal: 12,
    minHeight: 50,
  },
  dropdownList: {
    backgroundColor: '#fadccc',
    borderColor: PRIMARY_COLOR_TINT,
    elevation: 5,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownText: {
    fontSize: 14,
    color: '#222',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#222',
    marginBottom: 15,
  },
  thumbnailContainer: {
    flexDirection: 'row',
    marginTop: 15,
  },
  thumbnailWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  removeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  lessonCard: {
    backgroundColor: '#fadccc',
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  lessonHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lessonNumberLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2222',
  },
  lessonMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  videoAttachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  videoAttachText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 6,
  },
  previewToggle: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
  },
  previewToggleActive: {
    borderColor: PRIMARY_COLOR,
  },
  previewToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  addLessonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 14,
    marginTop: 10,
  },
  addLessonBtnText: {
    color: PRIMARY_COLOR,
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
  sectionContainer: {
    marginVertical: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  subLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  gatewayRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  gatewayChip: {
    flex: 1,
    flexDirection: 'row',
    alignContent: 'center',
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    borderRadius: 8,
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  activeChip: {
    backgroundColor: PRIMARY_COLOR,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: PRIMARY_COLOR_TINT,
  },
  activeChipText: {
    color: '#FFF',
    fontWeight: '600',
  },
  stationBlock: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  stationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeStationCard: {
    backgroundColor: '#fff',
    borderColor: PRIMARY_COLOR,
  },
  stationInfo: {
    flex: 1,
    paddingRight: 12,
  },
  stationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  stationAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },
  variantSection: {
    padding: 14,
    marginBottom: 16,
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addTagButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTagButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tagWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: PRIMARY_COLOR_TINT,
  },
  fileUploadBox: {
    borderWidth: 2,
    borderColor: '#D0D7DE',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  fileUploadedBox: {
    borderColor: '#007AFF',
    backgroundColor: '#F4F9FF',
    borderStyle: 'solid',
  },
  uploadCloudIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadBoxText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  fileIcon: {
    fontSize: 36,
    marginBottom: 4,
  },
  fileNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    textAlign: 'center',
  },
  fileMetaText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  reUploadText: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  priceHintText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
  disabledInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  disabledInput: {
    backgroundColor: '#EEF2F6', // Visually distinct greyed background
    borderColor: '#D0D7DE',
    color: '#57606A',
    paddingLeft: 34, // Push text right to fit symbol prefix neatly
  },
  currencyPrefix: {
    position: 'absolute',
    left: 14,
    top: 13,
    fontSize: 16,
    fontWeight: '600',
    color: '#57606A',
    zIndex: 1,
  },
  spinner: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  rateHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: -4,
  },
  miniLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginTop: 10,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  courseThumbnailPlaceholder: {
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  courseThumbnailPlaceholderText: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    fontWeight: '500',
  },
  courseThumbnailPreviewWrapper: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    height: 150,
    marginBottom: 16,
    backgroundColor: PRIMARY_COLOR,
  },
  courseThumbnailPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.85,
  },
  courseThumbnailRemoveBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: PRIMARY_COLOR_TINT_MAIN,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  courseThumbnailRemoveText: {
    color: PRIMARY_COLOR_TINT,
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: PRIMARY_COLOR_TINT,
    marginVertical: 14,
  },
  inputWarning: { borderColor: PRIMARY_COLOR },
  warningText: {
    color: PRIMARY_COLOR,
    fontSize: 11,
    marginTop: -8,
    marginBottom: 12,
    fontWeight: '500',
  },
});
