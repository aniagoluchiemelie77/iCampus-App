import React, { useState, useEffect, useMemo } from 'react';
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
  ActivityIndicator,
  PermissionsAndroid,
  Modal,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import DropDownPicker from 'react-native-dropdown-picker';
import Toast from 'react-native-toast-message';
import {
  Product,
  DropOffStation,
  GeolocationPosition,
  GeolocationError,
} from '../types/firebase';
import Video from 'react-native-video';
import { useNavigation } from '@react-navigation/native';
import { uploadLessonVideoAPI, saveProductApiCall } from '../api/localPostApis';
import { fetchDropOffStationsAPI } from '../api/localGetApis';
import {
  uploadFileToFirebaseClient,
  uploadToFirebase,
} from '../utils/CloudinaryPresetHelper';
import { fetchLiveRate } from '../utils/UserTransactionsHelpers';
import { useAppSelector } from '../hooks/hooks';
import { PageHeader } from '../components/PageHeader';
import {
  CATEGORY_MAX_PRICES,
  USD_EQUIVALENCE_OF_1_ICASH,
} from '../constants/inAppConstants';
import { useTheme } from '../context/ThemeContext';
import { useMediaPicker } from '../hooks/useMediaPicker.ts';

interface VideoDurationExtractorProps {
  uri: string;
  onDurationExtracted: (duration: number) => void;
}
interface StepHeaderProps {
  number: number;
  title: string;
  currentStep: number;
  toggleStep: (step: number) => void;
}
interface PriceSectionProps {
  userCountry?: string;
  formInputs: CompleteFormInputs;
  setFormInputs: React.Dispatch<React.SetStateAction<CompleteFormInputs>>;
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
export interface CompleteFormInputs {
  title: string;
  description: string;
  price: string;
  niche: string;
  productType: 'physical' | 'file' | 'course';
  physicalDetails: {
    weightKg: string;
    inStock: string;
    sellerGateways: ('drop_off' | 'home_delivery')[];
    dropOffAddress: DropOffStation[];
    colors: string[];
    sizes: string[];
  };
  courseDetails: {
    additionalLecturersRaw: string;
    content: UIContentItem[];
  };
  fileDetails: {
    fileName: string;
    fileSizeInMB: number;
    fileFormat: string;
    fileUrl: string;
    isUploading: boolean;
    rawBlobOrFile?: any;
  };
  lessons: {
    title: string;
    videoUrl: string;
    duration: number;
    isFreePreview: boolean;
  }[];
  mediaUrls: string[];
}
const nicheToTypeMap: Record<Product['niche'], Product['type']> = {
  Documents: 'file',
  Templates: 'file',
  'Software Assets': 'file',
  Courses: 'course',
  'Audio Resources': 'course',
  Electronics: 'physical',
  Fashion: 'physical',
  Stationery: 'physical',
  'Snacks and Deserts': 'physical',
  Food: 'physical',
  'Health & Beauty': 'physical',
  Crafts: 'physical',
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
export default function PriceSectionComponent({
  userCountry = 'Nigeria',
  formInputs,
  setFormInputs,
}: PriceSectionProps) {
  const { colors } = useTheme();
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

  const localRatePerIcash = exchangeDetails.rate * USD_EQUIVALENCE_OF_1_ICASH;
  const icashEntered = parseFloat(formInputs.price) || 0;
  const maxAllowedIcash = CATEGORY_MAX_PRICES[formInputs.productType];
  const isOverpriced = icashEntered > maxAllowedIcash;

  const rawConvertedAmount = icashEntered * localRatePerIcash;

  const formattedLocalCurrency = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rawConvertedAmount);

  return (
    <>
      <Text style={[styles.label, { color: colors.text }]}>Price (iCash)</Text>
      <TextInput
        style={[
          styles.input,
          isOverpriced && styles.inputWarning,
          { color: colors.text },
        ]}
        placeholder="0.00"
        keyboardType="numeric"
        value={formInputs.price}
        onChangeText={text => setFormInputs(prev => ({ ...prev, price: text }))}
        placeholderTextColor={colors.inputTextHolder}
      />
      {isOverpriced && (
        <Text style={[styles.warningText, { color: colors.primary }]}>
          This exceeds the maximum limit of {maxAllowedIcash} iCash allowed for
          a {formInputs.productType}.
        </Text>
      )}

      <Text style={[styles.label, { color: colors.text }]}>
        Estimated Local Value ({exchangeDetails.code})
      </Text>
      <View style={styles.disabledInputWrapper}>
        <Text style={[styles.currencyPrefix, { color: colors.text }]}>
          {exchangeDetails.symbol}
        </Text>
        <TextInput
          style={[styles.disabledInput, { color: colors.text }]}
          value={formInputs.price ? formattedLocalCurrency : '0.00'}
          editable={false}
          selectTextOnFocus={false}
        />
        {exchangeDetails.loading && (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.spinner}
          />
        )}
      </View>
      <Text style={[styles.rateHint, { color: colors.primaryTint }]}>
        Rate anchored at 1 iCash = {exchangeDetails.symbol}
        {(exchangeDetails.rate * USD_EQUIVALENCE_OF_1_ICASH).toFixed(2)}{' '}
        {exchangeDetails.code}
      </Text>
    </>
  );
}
const StepHeader = ({
  number,
  title,
  currentStep,
  toggleStep,
}: StepHeaderProps) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={() => toggleStep(number)}
      style={styles.stepHeader}
    >
      <View style={styles.headerLead}>
        <View
          style={[
            styles.stepBadge,
            currentStep === number && { backgroundColor: colors.primary },
          ]}
        >
          <Text
            style={[
              styles.stepNumber,
              currentStep === number
                ? { color: colors.btnTextColor }
                : { color: colors.text },
            ]}
          >
            {number}
          </Text>
        </View>
        <Text
          style={[
            styles.stepTitle,
            currentStep === number
              ? { color: colors.textDarker, fontWeight: 'bold' }
              : { color: colors.text },
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
        color={colors.text}
      />
    </TouchableOpacity>
  );
};
export const CreateProductScreen = ({ route }: any) => {
  const { colors } = useTheme();
  const user = useAppSelector(state => state.user);
  const { product: existingProduct } = route.params;
  const productId = existingProduct?.productId || existingProduct?._id;
  const isEditing = !!productId;
  const navigation = useNavigation<any>();
  const [activeStep, setActiveStep] = useState(1);
  const [nicheOpen, setNicheOpen] = useState(false);
  const [nicheValue, setNicheValue] = useState(null);
  const initialFormInputs = useMemo<CompleteFormInputs>(
    () => ({
      title: '',
      description: '',
      price: '',
      niche: '',
      productType: 'physical',
      lessons: [],
      physicalDetails: {
        weightKg: '',
        inStock: '',
        sellerGateways: ['drop_off'],
        dropOffAddress: [],
        colors: [],
        sizes: [],
      },
      courseDetails: {
        additionalLecturersRaw: '',
        content: [],
      },
      fileDetails: {
        fileName: '',
        fileSizeInMB: 0,
        fileFormat: '',
        fileUrl: '',
        isUploading: false,
      },
      mediaUrls: [],
    }),
    [],
  );
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
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formInputs, setFormInputs] =
    useState<CompleteFormInputs>(initialFormInputs);
  const productType =
    nicheToTypeMap[formInputs.niche as Product['niche']] || 'physical';
  const toggleStep = (step: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveStep(activeStep === step ? 0 : step);
  };
  const {
    pickLessonVideo,
    pickDigitalFile,
    pickCourseThumbnail,
    pickProductImages,
  } = useMediaPicker();
  const handleAddProductImages = async () => {
    const selectedUris = await pickProductImages(5);

    if (selectedUris) {
      setFormInputs(prev => {
        const currentMedia = (prev as any).mediaUrls || [];

        return {
          ...prev,
          mediaUrls: [...currentMedia, ...selectedUris].slice(0, 5),
        } as any;
      });
    }
  };
  const handleLessonUpload = async (index: number) => {
    const file = await pickLessonVideo();
    if (!file) return;
    setFormInputs(prev => {
      const updatedLessons = [...(prev.lessons || [])];
      if (updatedLessons[index]) {
        updatedLessons[index] = {
          ...updatedLessons[index],
          videoUrl: file.uri,
        };
      }
      return { ...prev, lessons: updatedLessons };
    });

    const result = await uploadLessonVideoAPI(
      file.uri,
      file.name || 'video.mp4',
      file.type || 'video/mp4',
    );
    setFormInputs(prev => {
      const updatedLessons = [...(prev.lessons || [])];
      if (updatedLessons[index]) {
        updatedLessons[index] = {
          ...updatedLessons[index],
          videoUrl: result.success ? result.data.permanentUrl : '',
        };
      }
      return { ...prev, lessons: updatedLessons };
    });

    if (!result.success) {
      Alert.alert('Upload Notice', result.message);
    }
  };
  const handleDigitalFilePick = async () => {
    const fileData = await pickDigitalFile();
    if (!fileData) return;
    setFormInputs(prev => ({
      ...prev,
      fileDetails: {
        ...(prev as any).fileDetails,
        fileName: fileData.fileName,
        fileSizeInMB: fileData.fileSizeInMB,
        fileFormat: fileData.fileFormat,
        isUploading: true,
      },
    }));

    const uploadResult = await uploadFileToFirebaseClient(
      fileData.uri,
      'digital-products',
    );

    setFormInputs(prev => ({
      ...prev,
      fileDetails: {
        ...(prev as any).fileDetails,
        isUploading: false,
        fileUrl: uploadResult.success
          ? uploadResult.data?.permanentUrl || ''
          : '',
      },
    }));

    if (!uploadResult.success) {
      Alert.alert('Upload Failed', uploadResult.message);
    }
  };
  const handleThumbnailPick = async () => {
    const uri = await pickCourseThumbnail();

    if (uri) {
      setFormInputs(prev => ({
        ...prev,
        mediaUrls: [uri],
      }));
    }
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
  const handleAddColor = () => {
    const cleanInput = colorInput.trim();
    if (!cleanInput) return;

    setFormInputs(prev => {
      const currentColors = prev.physicalDetails?.colors || [];
      const updatedColors = currentColors.includes(cleanInput)
        ? currentColors
        : [...currentColors, cleanInput];

      return {
        ...prev,
        physicalDetails: {
          ...prev.physicalDetails,
          colors: updatedColors,
        },
      };
    });

    setColorInput('');
  };
  const handleAddSize = () => {
    const cleanInput = sizeInput.trim();
    if (!cleanInput) return;

    setFormInputs(prev => {
      const currentSizes = prev.physicalDetails?.sizes || [];

      const updatedSizes = currentSizes.includes(cleanInput)
        ? currentSizes
        : [...currentSizes, cleanInput];

      return {
        ...prev,
        physicalDetails: {
          ...prev.physicalDetails,
          sizes: updatedSizes,
        },
      };
    });

    setSizeInput('');
  };
  const handlePublishProduct = async () => {
    const {
      title,
      description,
      price,
      niche,
      physicalDetails,
      courseDetails,
      fileDetails,
      mediaUrls,
    } = formInputs;

    if (
      !title.trim() ||
      !description.trim() ||
      !price ||
      Number(price) <= 0 ||
      !niche
    ) {
      Toast.show({
        type: 'error',
        text1: 'Missing Info',
        text2:
          'Please fill in all general vital fields (Title, Description, Price, and Niche).',
      });
      return;
    }

    // 2. Domain-Specific Validations
    if (productType === 'physical') {
      if (!physicalDetails?.inStock || Number(physicalDetails.inStock) < 0) {
        Toast.show({
          type: 'error',
          text1: 'Missing Info',
          text2:
            'Please specify valid stock availability for your physical product.',
        });
        return;
      }
    }

    if (productType === 'file') {
      // Only throw validation error if it is a new asset build without a file path tracking reference
      if (!fileDetails?.rawBlobOrFile?.uri && !fileDetails?.fileUrl) {
        Toast.show({
          type: 'error',
          text1: 'Missing Asset',
          text2: 'Please attach the digital product file before publishing.',
        });
        return;
      }
    }

    if (productType === 'course') {
      if (!lessons || lessons.length === 0) {
        Toast.show({
          type: 'error',
          text1: 'Missing Content',
          text2: 'Please add at least one lesson module to your course.',
        });
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(10);
      const thumbnails: string[] = mediaUrls || [];
      let finalThumbnails: string[] = [];
      if (thumbnails.length > 0) {
        const localUris = mediaUrls.filter(
          uri => uri.startsWith('file://') || !uri.startsWith('http'),
        );
        const remoteUrls = mediaUrls.filter(uri => uri.startsWith('http'));
        if (localUris.length > 0) {
          const uploadedUrls = await Promise.all(
            localUris.map(uri => uploadToFirebase(uri, 'product-thumbnails')),
          );
          finalThumbnails = [...remoteUrls, ...uploadedUrls];
        } else {
          finalThumbnails = remoteUrls;
        }
      }
      setUploadProgress(30);
      const formPayload = {
        title: title.trim(),
        description: description.trim(),
        productType,
        price: Number(price),
        mediaUrls: finalThumbnails,
        niche,
        physicalDetails,
        courseDetails,
        fileDetails,
        lessons,
      };
      const result = await saveProductApiCall(
        formPayload,
        productId,
        progress => {
          setUploadProgress(30 + Math.round(progress / 2));
        },
      );

      console.log('Product catalog update finalized:', result);
      setIsSubmitting(false);
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'ProductPublishSuccess',
            params: {
              productName: formPayload.title,
              productType: formPayload.productType,
              isEditing: isEditing,
            },
          },
        ],
      });
    } catch (error: any) {
      setIsSubmitting(false);
      console.error('Upload stalled or failed:', error);
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2:
          error?.message ||
          'Something went wrong while pushing assets to the server.',
      });
    }
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
  useEffect(() => {
    const selectedNiche = formInputs.niche;

    const computedType = selectedNiche
      ? (nicheToTypeMap[
          selectedNiche as keyof typeof nicheToTypeMap
        ] as CompleteFormInputs['productType']) || 'physical'
      : 'physical';

    if (formInputs.productType !== computedType) {
      setFormInputs(prev => {
        const updated = { ...prev, productType: computedType };

        if (computedType === 'file') {
          updated.physicalDetails = {
            weightKg: '',
            inStock: '',
            sellerGateways: ['drop_off'], // Matched your original default
            dropOffAddress: [],
            colors: [],
            sizes: [],
          };
          updated.courseDetails = { additionalLecturersRaw: '', content: [] };
          updated.lessons = [];
        } else if (computedType === 'course') {
          updated.physicalDetails = {
            weightKg: '',
            inStock: '',
            sellerGateways: ['drop_off'], // Matched your original default
            dropOffAddress: [],
            colors: [],
            sizes: [],
          };
          updated.fileDetails = {
            fileName: '',
            fileSizeInMB: 0,
            fileFormat: '',
            fileUrl: '',
            isUploading: false,
          };
        } else if (computedType === 'physical') {
          updated.courseDetails = { additionalLecturersRaw: '', content: [] };
          updated.lessons = [];
          updated.fileDetails = {
            fileName: '',
            fileSizeInMB: 0,
            fileFormat: '',
            fileUrl: '',
            isUploading: false,
          };
        }

        return updated;
      });
    }
  }, [formInputs.niche, formInputs.productType]);
  useEffect(() => {
    if (existingProduct) {
      setFormInputs({
        ...initialFormInputs,
        ...existingProduct,
        physicalDetails: {
          ...initialFormInputs.physicalDetails,
          ...(existingProduct.physicalDetails || {}),
        },
        courseDetails: {
          ...initialFormInputs.courseDetails,
          ...(existingProduct.courseDetails || {}),
        },
        fileDetails: {
          ...initialFormInputs.fileDetails,
          ...(existingProduct.fileDetails || {}),
        },
        lessons: existingProduct.lessons || [],
      });
    }
  }, [initialFormInputs, existingProduct]);
  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: colors.backgroundSecondary },
      ]}
      contentContainerStyle={styles.scrollContent}
    >
      <PageHeader title={isEditing ? 'Edit Listing' : 'Create New Listing'} />
      <View
        style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}
      >
        <StepHeader
          number={1}
          title="General Information"
          currentStep={activeStep}
          toggleStep={toggleStep}
        />
        {activeStep === 1 && (
          <View style={styles.expandedContent}>
            <Text style={[styles.label, { color: colors.text }]}>
              Product Title
            </Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={formInputs.title}
              onChangeText={text =>
                setFormInputs(prev => ({ ...prev, title: text }))
              }
              placeholder="e.g. Shoes, bags, wristwatch..."
              placeholderTextColor={colors.inputTextHolder}
            />

            <Text style={[styles.label, { color: colors.text }]}>
              Product Description
            </Text>
            <TextInput
              style={[styles.bioInput, { color: colors.text }]}
              multiline
              value={formInputs.description}
              onChangeText={text =>
                setFormInputs(prev => ({ ...prev, description: text }))
              }
              placeholder="A brief description of your listing (optional)."
              placeholderTextColor={colors.inputTextHolder}
            />

            <Text style={[styles.label, { color: colors.text }]}>
              Niche (Category)
            </Text>
            <View style={{ zIndex: 2000 }}>
              <DropDownPicker
                open={nicheOpen}
                value={nicheValue}
                items={nicheItems}
                setOpen={setNicheOpen}
                setValue={setNicheValue}
                setItems={setNicheItems}
                onChangeValue={value => {
                  if (value) {
                    setFormInputs(prev => ({ ...prev, niche: value }));
                  }
                }}
                placeholder="Select a category"
                listMode="MODAL"
                modalProps={{
                  animationType: 'fade',
                }}
                style={styles.dropdownPicker}
                dropDownContainerStyle={styles.dropdownList}
                textStyle={[styles.dropdownText, { color: colors.text }]}
                labelStyle={{ fontWeight: '600', color: colors.text }}
                placeholderStyle={{ color: colors.inputTextHolder }}
              />
            </View>
          </View>
        )}
      </View>
      <View
        style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}
      >
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
            {formInputs.productType !== 'course' ? (
              <>
                {images.length > 0 && (
                  <ScrollView horizontal style={styles.thumbnailContainer}>
                    {images.map((uri, idx) => (
                      <View key={idx} style={styles.thumbnailWrapper}>
                        <Image source={{ uri }} style={styles.thumbnail} />
                        <TouchableOpacity
                          style={[
                            styles.removeBadge,
                            { backgroundColor: colors.backgroundSecondary },
                          ]}
                          onPress={() =>
                            setImages(prev => prev.filter((_, i) => i !== idx))
                          }
                        >
                          <MaterialIcons
                            name="cancel-outlined"
                            size={18}
                            color={colors.primary}
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
                <TouchableOpacity
                  style={styles.uploadPlaceholder}
                  onPress={handleAddProductImages}
                >
                  <MaterialIcons
                    name="cloud-upload-outlined"
                    size={29}
                    color={colors.primary}
                  />
                  <Text style={[styles.uploadText, { color: colors.primary }]}>
                    Tap to upload product images
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
                  Build your curriculum. Add lessons and attach video files.
                </Text>
                <Text style={[styles.miniLabel, { color: colors.text }]}>
                  Course Cover Thumbnail
                </Text>
                {courseThumbnail ? (
                  <View style={styles.courseThumbnailPreviewWrapper}>
                    <Image
                      source={{ uri: courseThumbnail }}
                      style={styles.courseThumbnailPreview}
                    />
                    <TouchableOpacity
                      style={[
                        styles.removeBadge,
                        { backgroundColor: colors.backgroundSecondary },
                      ]}
                      onPress={() => setCourseThumbnail(null)}
                    >
                      <MaterialIcons
                        name="cancel-outlined"
                        size={16}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.courseThumbnailPlaceholder}
                    onPress={handleThumbnailPick}
                  >
                    <MaterialIcons
                      name="image-search-outlined"
                      size={24}
                      color={colors.primary}
                    />
                    <Text
                      style={[
                        styles.courseThumbnailPlaceholderText,
                        { color: colors.primary },
                      ]}
                    >
                      Upload Course Thumbnail
                    </Text>
                  </TouchableOpacity>
                )}
                <Text style={[styles.miniLabel, { color: colors.text }]}>
                  Lessons & Video Modules
                </Text>
                {formInputs.lessons.map((lesson, index) => (
                  <View key={index}>
                    <View style={styles.lessonHeaderRow}>
                      <Text
                        style={[
                          styles.lessonNumberLabel,
                          { color: colors.text },
                        ]}
                      >
                        Lesson {index + 1}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setFormInputs(prev => ({
                            ...prev,
                            lessons: prev.lessons.filter((_, i) => i !== index),
                          }))
                        }
                      >
                        <MaterialIcons
                          name="delete-outlined"
                          size={20}
                          color={colors.primary}
                        />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholderTextColor={colors.inputTextHolder}
                      placeholder="Lesson Title (e.g., Intro to Programming)"
                      value={lesson.title}
                      onChangeText={text => {
                        setFormInputs(prev => {
                          const updatedLessons = [...prev.lessons];
                          updatedLessons[index] = {
                            ...updatedLessons[index],
                            title: text,
                          };
                          return { ...prev, lessons: updatedLessons };
                        });
                      }}
                    />
                    <View style={styles.lessonMetaRow}>
                      <TouchableOpacity
                        style={[
                          styles.videoAttachBtn,
                          { backgroundColor: colors.btnColor },
                        ]}
                        onPress={() => {
                          handleLessonUpload(index);
                        }}
                      >
                        <MaterialIcons
                          name="video-library-outlined"
                          size={20}
                          color={colors.btnTextColor}
                        />
                        <Text
                          style={[
                            styles.videoAttachText,
                            { color: colors.btnTextColor },
                          ]}
                        >
                          {lesson.videoUrl ? 'Video Attached' : 'Upload Video'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.previewToggle,
                          lesson.isFreePreview && styles.previewToggleActive,
                        ]}
                        onPress={() => {
                          setFormInputs(prev => {
                            const updatedLessons = [...prev.lessons];
                            updatedLessons[index] = {
                              ...updatedLessons[index],
                              isFreePreview:
                                !updatedLessons[index].isFreePreview,
                            };
                            return { ...prev, lessons: updatedLessons };
                          });
                        }}
                      >
                        <Text
                          style={[
                            styles.previewToggleText,
                            lesson.isFreePreview
                              ? { color: colors.primary }
                              : { color: colors.text },
                          ]}
                        >
                          Free Preview
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {lesson.videoUrl ? (
                      <View style={styles.videoPreviewWrapper}>
                        <Video
                          source={{ uri: lesson.videoUrl }}
                          style={styles.videoPreview}
                          controls={true}
                          resizeMode="contain"
                          muted={true}
                          paused={true}
                        />
                        <TouchableOpacity
                          style={[
                            styles.removeVideoBadge,
                            { backgroundColor: colors.backgroundSecondary },
                          ]}
                          onPress={() => {
                            setFormInputs(prev => {
                              const updatedLessons = [...prev.lessons];
                              updatedLessons[index] = {
                                ...updatedLessons[index],
                                videoUrl: '',
                              };
                              return { ...prev, lessons: updatedLessons };
                            });
                          }}
                        >
                          <MaterialIcons
                            name="cancel-outlined"
                            size={16}
                            color={colors.primary}
                          />
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.addLessonBtn}
                  onPress={() =>
                    setFormInputs(prev => ({
                      ...prev,
                      lessons: [
                        ...prev.lessons,
                        {
                          title: '',
                          videoUrl: '',
                          duration: 0,
                          isFreePreview: false,
                        },
                      ],
                    }))
                  }
                >
                  <MaterialIcons name="add" size={22} color={colors.primary} />
                  <Text
                    style={[styles.addLessonBtnText, { color: colors.primary }]}
                  >
                    Add New Lesson
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
      <View
        style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}
      >
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
              <>
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      Weight (Kg)
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        { color: colors.text, width: 'auto' },
                      ]}
                      placeholderTextColor={colors.inputTextHolder}
                      placeholder="0.5"
                      keyboardType="numeric"
                      value={formInputs.physicalDetails.weightKg}
                      onChangeText={text => {
                        const cleanFloat = text
                          .replace(/[^0-9.]/g, '')
                          .replace(/(\..*?)\..*/g, '$1');
                        setFormInputs(prev => ({
                          ...prev,
                          physicalDetails: {
                            ...prev.physicalDetails,
                            weightKg: cleanFloat,
                          },
                        }));
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      Stock Quantity
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        { color: colors.text, width: 'auto' },
                      ]}
                      placeholder="10"
                      placeholderTextColor={colors.inputTextHolder}
                      keyboardType="number-pad"
                      value={formInputs.physicalDetails.inStock}
                      onChangeText={text => {
                        const cleanInt = text.replace(/[^0-9]/g, '');
                        setFormInputs(prev => ({
                          ...prev,
                          physicalDetails: {
                            ...prev.physicalDetails,
                            inStock: cleanInt,
                          },
                        }));
                      }}
                    />
                  </View>
                </View>
                <Text style={[styles.label, { color: colors.text }]}>
                  Available Colors (Optional)
                </Text>
                <View style={styles.tagInputContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      { flex: 1, width: 'auto', color: colors.text },
                    ]}
                    placeholder="e.g. Red, Blue, Matte Black"
                    value={colorInput}
                    placeholderTextColor={colors.inputTextHolder}
                    onChangeText={setColorInput}
                    onSubmitEditing={handleAddColor}
                  />
                  <TouchableOpacity
                    style={[
                      styles.addTagButton,
                      { backgroundColor: colors.btnColor },
                    ]}
                    onPress={handleAddColor}
                  >
                    <Text
                      style={[
                        styles.addTagButtonText,
                        { color: colors.btnTextColor },
                      ]}
                    >
                      Add
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.tagWrapper}>
                  {(formInputs.physicalDetails?.colors || []).map(
                    (color, index) => (
                      <TouchableOpacity
                        key={`color-${index}`}
                        style={styles.tagBadge}
                        onPress={() =>
                          setFormInputs((prev: any) => {
                            const currentColors =
                              prev.physicalDetails?.colors || [];
                            return {
                              ...prev,
                              physicalDetails: {
                                ...prev.physicalDetails,
                                colors: currentColors.filter(
                                  (c: string) => c !== color,
                                ),
                              },
                            };
                          })
                        }
                      >
                        <Text style={[styles.tagText, { color: colors.text }]}>
                          {color} ✕
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
                <Text style={[styles.label, { color: colors.text }]}>
                  Available Sizes (Optional)
                </Text>
                <View style={styles.tagInputContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      { flex: 1, marginBottom: 0, color: colors.text },
                    ]}
                    placeholder="e.g. Medium, XL, 42, 10 inches"
                    value={sizeInput}
                    placeholderTextColor={colors.inputTextHolder}
                    onChangeText={setSizeInput}
                    onSubmitEditing={handleAddSize}
                  />
                  <TouchableOpacity
                    style={[
                      styles.addTagButton,
                      { backgroundColor: colors.btnColor },
                    ]}
                    onPress={handleAddSize}
                  >
                    <Text
                      style={[
                        styles.addTagButtonText,
                        { color: colors.btnTextColor },
                      ]}
                    >
                      Add
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.tagWrapper}>
                  {(formInputs.physicalDetails?.sizes || []).map(
                    (size, index) => (
                      <TouchableOpacity
                        key={`size-${index}`}
                        style={[styles.tagBadge]}
                        onPress={() =>
                          setFormInputs((prev: any) => {
                            // Typing 'prev' as any prevents any trailing syntax errors
                            const currentSizes =
                              prev.physicalDetails?.sizes || [];
                            return {
                              ...prev,
                              physicalDetails: {
                                ...prev.physicalDetails,
                                sizes: currentSizes.filter(
                                  (s: string) => s !== size,
                                ),
                              },
                            };
                          })
                        }
                      >
                        <Text style={[styles.tagText, { color: colors.text }]}>
                          {size} ✕
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
                <Text style={[styles.label, { color: colors.text }]}>
                  Fulfillment / Delivery Options
                </Text>
                <Text style={[styles.subLabel, { color: colors.text }]}>
                  How will the buyer receive this item? Select all that apply.
                </Text>
                <View style={styles.gatewayRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.gatewayChip,
                      formInputs.physicalDetails.sellerGateways.includes(
                        'drop_off',
                      ) && styles.activeChip,
                    ]}
                    onPress={() => {
                      setFormInputs(prev => {
                        const currentGateways =
                          prev.physicalDetails.sellerGateways;
                        const hasIt = currentGateways.includes('drop_off');

                        const updatedGateways = hasIt
                          ? currentGateways.filter(g => g !== 'drop_off')
                          : [...currentGateways, 'drop_off'];

                        return {
                          ...prev,
                          physicalDetails: {
                            ...prev.physicalDetails,
                            sellerGateways:
                              updatedGateways as typeof currentGateways,
                            dropOffAddress: hasIt
                              ? []
                              : prev.physicalDetails.dropOffAddress,
                          },
                        };
                      });
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        formInputs.physicalDetails.sellerGateways.includes(
                          'drop_off',
                        )
                          ? { color: colors.primary }
                          : { color: colors.text },
                      ]}
                    >
                      Drop-off Station
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.gatewayChip,
                      formInputs.physicalDetails.sellerGateways.includes(
                        'home_delivery',
                      ) && styles.activeChip,
                    ]}
                    onPress={() => {
                      setFormInputs(prev => {
                        const currentGateways =
                          prev.physicalDetails.sellerGateways;
                        const hasIt = currentGateways.includes('home_delivery');

                        const updatedGateways = hasIt
                          ? currentGateways.filter(g => g !== 'home_delivery')
                          : [...currentGateways, 'home_delivery'];

                        return {
                          ...prev,
                          physicalDetails: {
                            ...prev.physicalDetails,
                            sellerGateways:
                              updatedGateways as typeof currentGateways,
                          },
                        };
                      });
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        formInputs.physicalDetails.sellerGateways.includes(
                          'home_delivery',
                        )
                          ? { color: colors.primary }
                          : { color: colors.text },
                      ]}
                    >
                      Home Delivery
                    </Text>
                  </TouchableOpacity>
                </View>
                {formInputs.physicalDetails.sellerGateways.includes(
                  'drop_off',
                ) && (
                  <>
                    <Text style={[styles.label, { color: colors.text }]}>
                      Select Drop-off Hubs Nearby
                    </Text>
                    <Text style={[styles.subLabel, { color: colors.text }]}>
                      Choose where you can physically drop your products for
                      pickup by the buyer upon sale.
                    </Text>
                    {stations.map(station => {
                      const isSelected =
                        formInputs.physicalDetails.dropOffAddress.some(
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
                            setFormInputs(prev => {
                              const currentAddresses =
                                prev.physicalDetails.dropOffAddress;
                              const alreadySelected = currentAddresses.some(
                                s => s.code === station.code,
                              );

                              const updatedStations = alreadySelected
                                ? currentAddresses.filter(
                                    s => s.code !== station.code,
                                  )
                                : [...currentAddresses, station];

                              return {
                                ...prev,
                                physicalDetails: {
                                  ...prev.physicalDetails,
                                  dropOffAddress:
                                    updatedStations as typeof currentAddresses,
                                },
                              };
                            });
                          }}
                        >
                          <View style={styles.stationInfo}>
                            <Text
                              style={[
                                styles.stationAddress,
                                { color: colors.text },
                              ]}
                            >
                              {station.address}
                            </Text>
                            <Text
                              style={[
                                styles.stationName,
                                { color: colors.text },
                              ]}
                            >
                              {station.name}
                            </Text>
                          </View>
                          {isSelected && (
                            <MaterialIcons
                              name="check-circle-outlined"
                              size={18}
                              color={colors.primary}
                              style={{ marginLeft: 6 }}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </>
                )}
              </>
            )}
            {productType === 'course' && (
              <>
                <Text style={[styles.label, { color: colors.text }]}>
                  Co-Lecturers / Instructors (Optional)
                </Text>
                <Text style={[styles.subLabel, { color: colors.text }]}>
                  You are automatically assigned as the primary instructor. Add
                  your co-creator's fullname if you are co-authoring this course
                  (Optional).
                </Text>

                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="e.g. John Mark"
                  placeholderTextColor={colors.inputTextHolder}
                  value={(formInputs as any).additionalLecturersRaw || ''}
                  onChangeText={text =>
                    setFormInputs(
                      prev =>
                        ({
                          ...prev,
                          additionalLecturersRaw: text,
                        } as any),
                    )
                  }
                  autoCorrect={false}
                />
              </>
            )}
            {productType === 'file' && (
              <>
                <Text style={[styles.label, { color: colors.text }]}>
                  Upload Digital Product Asset
                </Text>
                <Text style={[styles.subLabel, { color: colors.text }]}>
                  Upload the document, textbook, or source archive. Buyers will
                  instantly unlock download access post-checkout.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.fileUploadBox}
                  onPress={handleDigitalFilePick}
                  disabled={formInputs.fileDetails.isUploading}
                >
                  {formInputs.fileDetails.isUploading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : formInputs.fileDetails.fileUrl ? (
                    <>
                      <MaterialIcons
                        name="insert-drive-file-outlined"
                        size={25}
                        color={colors.primary}
                      />
                      <Text
                        style={[styles.fileNameText, { color: colors.text }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {formInputs.fileDetails.fileName}
                      </Text>
                      <Text
                        style={[styles.fileMetaText, { color: colors.text }]}
                      >
                        {formInputs.fileDetails.fileFormat} •{' '}
                        {formInputs.fileDetails.fileSizeInMB} MB
                      </Text>
                      <Text
                        style={[styles.reUploadText, { color: colors.primary }]}
                      >
                        Tap to replace file
                      </Text>
                    </>
                  ) : (
                    <>
                      <MaterialIcons
                        name="file-upload-outlined"
                        size={25}
                        color={colors.primary}
                      />
                      <Text
                        style={[styles.uploadBoxText, { color: colors.text }]}
                      >
                        Select PDF, ZIP, EPUB, or Source Document
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
      <View
        style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}
      >
        <StepHeader
          number={4}
          toggleStep={toggleStep}
          title="Price"
          currentStep={activeStep}
        />
        {activeStep === 4 && (
          <PriceSectionComponent
            userCountry={user?.country}
            formInputs={formInputs}
            setFormInputs={setFormInputs}
          />
        )}
      </View>
      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: colors.btnColor }]}
        onPress={handlePublishProduct}
      >
        <Text style={[styles.submitButtonText, { color: colors.btnTextColor }]}>
          Publish Product
        </Text>
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
            setActiveExtractingUri(null);
          }}
        />
      )}
      <Modal
        visible={isSubmitting}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textDarker }]}>
              Publishing Product
            </Text>
            <View
              style={[
                styles.progressBarTrack,
                { backgroundColor: colors.primaryTint },
              ]}
            >
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${uploadProgress}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.text }]}>
              {uploadProgress < 100
                ? `Uploading Listing... ${uploadProgress}%`
                : 'Processing metadata and finalizing layout...'}
            </Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  card: {
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    padding: 15,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLead: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'transparent',
    alignContent: 'center',
    marginRight: 10,
  },
  stepNumber: { fontSize: 14, fontWeight: 'bold' },
  stepTitle: { fontSize: 14, fontWeight: '600' },
  expandedContent: {
    marginTop: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 15,
  },
  input: {
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    width: '100%',
    marginBottom: 15,
  },
  uploadPlaceholder: {
    padding: 15,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    borderRadius: 15,
    alignContent: 'center',
  },
  uploadText: { marginTop: 6, fontSize: 14 },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 20,
    width: '80%',
    alignSelf: 'center',
  },
  submitButtonText: { fontWeight: 'bold', fontSize: 14 },
  bioInput: {
    height: 120,
    padding: 15,
    textAlignVertical: 'top',
    fontSize: 14,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 8,
  },
  dropdownPicker: {
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 8,
    borderWidth: 0.8,
    paddingHorizontal: 12,
    minHeight: 50,
  },
  dropdownList: {
    borderColor: PRIMARY_COLOR_TINT,
    elevation: 5,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownText: {
    fontSize: 14,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 15,
  },
  thumbnailContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  thumbnailWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  removeBadge: {
    position: 'absolute',
    top: -6,
    right: 6,
    padding: 8,
    borderRadius: 5,
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
  },
  lessonMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoAttachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 15,
  },
  videoAttachText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  previewToggle: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 15,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
  },
  previewToggleActive: {
    borderColor: PRIMARY_COLOR,
  },
  previewToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addLessonBtn: {
    alignItems: 'center',
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    borderRadius: 10,
    padding: 10,
  },
  addLessonBtnText: {
    fontWeight: '700',
    fontSize: 14,
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  subLabel: {
    fontSize: 12,
    marginBottom: 12,
  },
  gatewayRow: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'center',
  },
  gatewayChip: {
    alignContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  activeChip: {
    backgroundColor: PRIMARY_COLOR,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  stationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeStationCard: {
    borderColor: PRIMARY_COLOR,
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 14,
    fontWeight: '600',
  },
  stationAddress: {
    fontSize: 14,
    marginBottom: 4,
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addTagButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginLeft: 8,
    alignContent: 'center',
  },
  addTagButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tagWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  tagBadge: {
    alignContent: 'center',
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  fileUploadBox: {
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    borderRadius: 15,
    padding: 15,
    alignContent: 'center',
  },
  uploadBoxText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  fileNameText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 4,
  },
  fileMetaText: {
    fontSize: 12,
    marginBottom: 3,
  },
  reUploadText: {
    fontSize: 11,
    fontWeight: '600',
  },
  disabledInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderRadius: 8,
    width: '100%',
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    marginBottom: 15,
  },
  disabledInput: {
    fontSize: 14,
    flex: 1,
  },
  currencyPrefix: {
    fontSize: 14,
  },
  spinner: {
    marginLeft: 4,
  },
  rateHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  miniLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 15,
  },
  courseThumbnailPlaceholder: {
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  courseThumbnailPlaceholderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  courseThumbnailPreviewWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  courseThumbnailPreview: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  courseThumbnailRemoveText: {
    color: PRIMARY_COLOR_TINT,
    fontSize: 12,
    fontWeight: '600',
  },
  inputWarning: { borderColor: PRIMARY_COLOR },
  warningText: {
    fontSize: 11,
    marginTop: -8,
    marginBottom: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    borderTopRightRadius: 25,
    borderTopLeftRadius: 25,
    padding: 25,
    alignContent: 'center',
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressBarTrack: {
    height: 8,
    width: '80%',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 15,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  videoPreviewWrapper: {
    position: 'relative',
    marginTop: 15,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  videoPreview: {
    width: '100%',
    height: 180,
  },
  removeVideoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000', // shadow for iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
});
