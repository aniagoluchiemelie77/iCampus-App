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
import ImagePicker from 'react-native-image-crop-picker';
import DocumentPicker from 'react-native-document-picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
  PRIMARY_COLOR_TINT_MAIN,
} from '../assets/styles/colors';
import DropDownPicker from 'react-native-dropdown-picker';
import Toast from 'react-native-toast-message';
import toastConfig from '../components/ToastConfig';
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
import { useAppSelector } from '../components/hooks';
import { launchImageLibrary } from 'react-native-image-picker';
import { PageHeader } from '../components/PageHeader';

type ItemCategory = Product['type'];
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
export default function PriceSectionComponent({
  userCountry = 'Nigeria',
  formInputs,
  setFormInputs,
}: PriceSectionProps) {
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

  // Bind calculations directly to formInputs instead of local state
  const icashEntered = parseFloat(formInputs.price) || 0;
  const maxAllowedIcash = CATEGORY_MAX_PRICES[formInputs.productType];
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
        value={formInputs.price} // Read directly from master state
        onChangeText={
          text => setFormInputs(prev => ({ ...prev, price: text })) // Write directly to master state
        }
      />
      {isOverpriced && (
        <Text style={styles.warningText}>
          This exceeds the maximum limit of {maxAllowedIcash} iCash allowed for
          a {formInputs.productType}.
        </Text>
      )}

      <Text style={styles.label}>
        Estimated Local Value ({exchangeDetails.code})
      </Text>
      <View style={styles.disabledInputWrapper}>
        <Text style={styles.currencyPrefix}>{exchangeDetails.symbol}</Text>
        <TextInput
          style={[styles.input, styles.disabledInput]}
          value={formInputs.price ? formattedLocalCurrency : '0.00'}
          editable={false}
          selectTextOnFocus={false}
        />
        {exchangeDetails.loading && (
          <ActivityIndicator
            size="small"
            color={PRIMARY_COLOR}
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
export const CreateProductScreen = ({ route }: any) => {
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
  const productType: Product['type'] = nicheValue
    ? nicheToTypeMap[nicheValue as Product['niche']]
    : 'physical';
  const [formInputs, setFormInputs] =
    useState<CompleteFormInputs>(initialFormInputs);
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

        setFormInputs(prev => {
          const currentThumbnails = (prev as any).thumbnails || [];

          return {
            ...prev,
            mediaUrls: [...currentThumbnails, ...selectedUris].slice(0, 5),
          } as any;
        });
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
      setFormInputs(prev => {
        const updatedLessons = [...(prev.lessons || [])];
        if (updatedLessons[index]) {
          updatedLessons[index] = {
            ...updatedLessons[index],
            videoUrl: targetUri,
            isUploading: true,
          } as any;
        }
        return { ...prev, lessons: updatedLessons };
      });
      setActiveExtractingUri({ uri: targetUri, index });
      const uploadResult = await uploadLessonVideoAPI(
        targetUri,
        fileName,
        fileType,
      );
      setFormInputs(prev => {
        const updatedLessons = [...(prev.lessons || [])];
        if (updatedLessons[index]) {
          updatedLessons[index] = {
            ...updatedLessons[index],
            isUploading: false,
            videoUrl: uploadResult.success
              ? uploadResult.data.permanentUrl
              : '',
            verificationStatus: uploadResult.success
              ? uploadResult.data.status
              : 'Failed',
          } as any;
        }
        return { ...prev, lessons: updatedLessons };
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
      setFormInputs(
        prev =>
          ({
            ...prev,
            fileDetails: {
              ...(prev as any).fileDetails,
              fileName: rawName,
              fileSizeInMB: sizeInMB,
              fileFormat: extension,
              isUploading: true,
            },
          } as any),
      );

      const uploadResult = await uploadFileToFirebaseClient(
        targetUri,
        'digital-products',
      );
      setFormInputs(
        prev =>
          ({
            ...prev,
            fileDetails: {
              ...(prev as any).fileDetails,
              isUploading: false,
              fileUrl: uploadResult.success
                ? uploadResult.data?.permanentUrl || ''
                : '',
            },
          } as any),
      );

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
          setFormInputs(
            prev =>
              ({
                ...prev,
                mediaUrls: uri,
              } as any),
          );
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
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <PageHeader title={isEditing ? 'Edit Listing' : 'Create New Listing'} />
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
              value={formInputs.title}
              onChangeText={text =>
                setFormInputs(prev => ({ ...prev, title: text }))
              }
              placeholder="e.g. Shoes, bags, wristwatch..."
              placeholderTextColor={PRIMARY_COLOR_TINT}
            />

            <Text style={styles.label}>Product Description</Text>
            <TextInput
              style={styles.bioInput}
              multiline
              value={formInputs.description}
              onChangeText={text =>
                setFormInputs(prev => ({ ...prev, description: text }))
              }
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
            {formInputs.productType !== 'course' ? (
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
                {formInputs.lessons.map((lesson, index) => (
                  <View key={index} style={styles.lessonCard}>
                    <View style={styles.lessonHeaderRow}>
                      <Text style={styles.lessonNumberLabel}>
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
                          color={PRIMARY_COLOR}
                        />
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      style={styles.input}
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
                    <Text style={styles.label}>Stock Quantity</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="10"
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
                <View style={styles.variantSection}>
                  {/* A. Colors Tag Input */}
                  <Text style={styles.label}>Available Colors (Optional)</Text>
                  <View style={styles.tagInputContainer}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0 }]}
                      placeholder="e.g. Red, Blue, Matte Black"
                      value={colorInput}
                      onChangeText={setColorInput}
                      onSubmitEditing={handleAddColor}
                    />
                    <TouchableOpacity
                      style={styles.addTagButton}
                      onPress={handleAddColor}
                    >
                      <Text style={styles.addTagButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.tagWrapper}>
                    {(formInputs.physicalDetails?.colors || []).map(
                      (color, index) => (
                        <TouchableOpacity
                          key={`color-${index}`}
                          style={[
                            styles.tagBadge,
                            { backgroundColor: '#fadccc' },
                          ]}
                          onPress={() =>
                            setFormInputs((prev: any) => {
                              // Type the parameter as any directly
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
                          <Text style={styles.tagText}>{color} ✕</Text>
                        </TouchableOpacity>
                      ),
                    )}
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
                      onSubmitEditing={handleAddSize}
                    />
                    <TouchableOpacity
                      style={styles.addTagButton}
                      onPress={handleAddSize}
                    >
                      <Text style={styles.addTagButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.tagWrapper}>
                    {(formInputs.physicalDetails?.sizes || []).map(
                      (size, index) => (
                        <TouchableOpacity
                          key={`size-${index}`}
                          style={[
                            styles.tagBadge,
                            { backgroundColor: '#e2f0d9' },
                          ]}
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
                          <Text style={styles.tagText}>{size} ✕</Text>
                        </TouchableOpacity>
                      ),
                    )}
                  </View>
                </View>
                <Text style={styles.label}>Fulfillment / Delivery Options</Text>
                <Text style={styles.subLabel}>
                  How will the buyer receive this item? Select all that apply.
                </Text>
                <View style={styles.gatewayRow}>
                  {/* Drop-off Station Chip */}
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
                            // Cast the array back to the expected specific type
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
                        ) && styles.activeChipText,
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
                            // Cast the array back to the expected specific type
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
                        ) && styles.activeChipText,
                      ]}
                    >
                      Home Delivery
                    </Text>
                  </TouchableOpacity>
                </View>
                {formInputs.physicalDetails.sellerGateways.includes(
                  'drop_off',
                ) && (
                  <View style={styles.stationBlock}>
                    <Text style={[styles.label, { marginTop: 12 }]}>
                      Select Drop-off Hubs Nearby
                    </Text>
                    <Text style={styles.subLabel}>
                      Choose where you will physically drop this package upon
                      sale.
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
                                  // explicitly casting ensures compatibility with CompleteFormInputs types
                                  dropOffAddress:
                                    updatedStations as typeof currentAddresses,
                                },
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
                  your co-creator's fullname if you are co-authoring this course
                  (Optional).
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="e.g. John Mark"
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
              </View>
            )}
            {productType === 'file' && (
              <View style={styles.sectionContainer}>
                <Text style={styles.label}>Upload Digital Product Asset</Text>
                <Text style={styles.subLabel}>
                  Upload the document, textbook, or source archive. Buyers will
                  instantly unlock download access post-checkout.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.fileUploadBox,
                    formInputs.fileDetails.fileUrl
                      ? styles.fileUploadedBox
                      : null,
                  ]}
                  onPress={pickDigitalFile}
                  disabled={formInputs.fileDetails.isUploading}
                >
                  {formInputs.fileDetails.isUploading ? (
                    <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                  ) : formInputs.fileDetails.fileUrl ? (
                    <View style={{ alignItems: 'center' }}>
                      <MaterialIcons
                        name="insert-drive-file-outlined"
                        size={25}
                        color={PRIMARY_COLOR}
                      />
                      <Text style={styles.fileNameText} numberOfLines={1}>
                        {formInputs.fileDetails.fileName}
                      </Text>
                      <Text style={styles.fileMetaText}>
                        {formInputs.fileDetails.fileFormat} •{' '}
                        {formInputs.fileDetails.fileSizeInMB} MB
                      </Text>
                      <Text style={styles.reUploadText}>
                        Tap to replace file
                      </Text>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center' }}>
                      <MaterialIcons
                        name="file-upload-outlined"
                        size={20}
                        color={PRIMARY_COLOR}
                      />
                      <Text style={styles.uploadBoxText}>
                        Select PDF, ZIP, EPUB, or Source Document
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
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
        style={styles.submitButton}
        onPress={handlePublishProduct}
      >
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
      <Modal
        visible={isSubmitting}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Publishing Product</Text>

            <ActivityIndicator
              size="large"
              color={PRIMARY_COLOR}
              style={{ marginVertical: 25 }}
            />
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${uploadProgress}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {uploadProgress < 100
                ? `Uploading assets... ${uploadProgress}%`
                : 'Processing metadata and finalizing layout...'}
            </Text>
          </View>
        </View>
      </Modal>
      <Toast config={toastConfig} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 20, paddingBottom: 100 },
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
    width: '100%',
  },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
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
    borderColor: PRIMARY_COLOR,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    backgroundColor: '#fadccc',
    alignContent: 'center',
    marginBottom: 16,
  },
  fileUploadedBox: {
    borderColor: PRIMARY_COLOR,
    borderStyle: 'solid',
  },
  uploadBoxText: {
    fontSize: 13,
    color: PRIMARY_COLOR,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 3,
  },
  fileNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    textAlign: 'center',
    marginTop: 3,
  },
  fileMetaText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  reUploadText: {
    fontSize: 11,
    color: PRIMARY_COLOR,
    fontWeight: '600',
    marginTop: 8,
    textTransform: 'uppercase',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFF',
    borderRadius: 25,
    padding: 25,
    alignContent: 'center',
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PRIMARY_COLOR,
  },
  progressBarTrack: {
    height: 8,
    width: '80%',
    backgroundColor: PRIMARY_COLOR_TINT,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
});
