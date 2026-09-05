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
  Modal,
  PermissionsAndroid,
  Pressable,
  FlatList,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { StationCarousel } from '../components/StationCarousel.tsx';
import Toast from 'react-native-toast-message';
import {
  Product,
  DropOffStation,
  GeolocationPosition,
  GeolocationError,
} from '../types/firebase';
import { useNavigation } from '@react-navigation/native';
import { saveProductApiCall } from '../api/localPostApis';
import { fetchDropOffStationsAPI } from '../api/localGetApis';
import { uploadToFirebase } from '../utils/CloudinaryPresetHelper';
import { useAppSelector } from '../hooks/hooks';
import { PageHeader } from '../components/PageHeader';
import { useTheme } from '../context/ThemeContext';
import { useMediaPicker } from '../hooks/useMediaPicker.ts';
import { useLocationServices } from '../hooks/useLocationService.ts';
import {
  StepHeader,
  CompleteFormInputs,
  PriceSectionComponent,
} from '../components/CreateProductComponents.tsx';
import { toPercentLabel } from '../screens/Checkout.tsx';
import { CustomButton } from '../assets/components/AppUIComponents';
import { TRANSACTION_TAX_RATE } from '../constants/inAppConstants.ts';
import { MediaPreviewList } from '../components/MediaPreview.tsx';

const nicheToTypeMap: Record<Product['niche'], Product['type']> = {
  Electronics: 'physical',
  Fashion: 'physical',
  Stationery: 'physical',
  'Snacks and Deserts': 'physical',
  Food: 'physical',
  'Health & Beauty': 'physical',
  Footwears: 'physical',
};
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
export const CreateProductScreen = ({ route }: any) => {
  const { colors } = useTheme();
  const user = useAppSelector(state => state.user) || {};
  const { product: existingProduct } = route.params || {};
  const productId = existingProduct?.productId || existingProduct?._id;
  const isEditing = !!productId;
  const navigation = useNavigation<any>();
  const [activeStep, setActiveStep] = useState(1);
  const initialFormInputs = useMemo<CompleteFormInputs>(
    () => ({
      title: '',
      description: '',
      price: '',
      niche: '',
      type: 'physical',
      physicalDetails: {
        weightKg: '',
        inStock: '',
        sellerGateways: ['home_delivery'],
        dropOffAddress: [],
        colors: [],
        sizes: [],
      },
      mediaUrls: [],
    }),
    [],
  );
  const nicheItems = [
    { label: 'Tech Gears & Electronics', value: 'Electronics', icon: 'laptop' },
    { label: 'Apparel & Wardrobe', value: 'Fashion', icon: 'checkroom' },
    { label: 'Furniture & Stationery', value: 'Stationery', icon: 'chair' },
    {
      label: 'Quick Bites & Munchies',
      value: 'Snacks and Deserts',
      icon: 'bakery-dining',
    },
    { label: 'Quick Meals & Refreshments', value: 'Food', icon: 'restaurant' },
    { label: 'Self-Care & Essentials', value: 'Health & Beauty', icon: 'spa' },
    { label: 'FootWears', value: 'Footwears', icon: 'shopping-bag' },
  ];
  const [stations, setStations] = useState<DropOffStation[]>([]);
  const [_loading, setLoading] = useState<boolean>(true);
  const [colorInput, setColorInput] = useState('');
  const [sizeInput, setSizeInput] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isNicheModalOpen, setIsNicheModalOpen] = useState(false);
  const [formInputs, setFormInputs] =
    useState<CompleteFormInputs>(initialFormInputs);
  const type =
    nicheToTypeMap[formInputs.niche as Product['niche']] || 'physical';
  const toggleStep = (step: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveStep(activeStep === step ? 0 : step);
  };
  const { pickProductImages } = useMediaPicker();
  const { userCoords } = useLocationServices();
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
  const cannotSubmit =
    !formInputs.title.trim() ||
    !formInputs.price ||
    Number(formInputs.price) <= 0 ||
    !formInputs.niche;
  const handlePublishProduct = async () => {
    const { title, description, price, niche, physicalDetails, mediaUrls } =
      formInputs;

    if (cannotSubmit) {
      Toast.show({
        type: 'error',
        text1: 'Missing Info',
        text2:
          'Please fill in all general vital fields (Title, Description, Price, and Niche).',
      });
      return;
    }
    if (type === 'physical') {
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
        type,
        price: Number(price),
        mediaUrls: finalThumbnails,
        niche,
        physicalDetails,
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
              type: formPayload.type,
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
        ] as CompleteFormInputs['type']) || 'physical'
      : 'physical';

    if (formInputs.type !== computedType) {
      setFormInputs(prev => {
        const updated = { ...prev, type: computedType };

        if (computedType === 'file') {
          updated.physicalDetails = {
            weightKg: '',
            inStock: '',
            sellerGateways: ['drop_off'],
            dropOffAddress: [],
            colors: [],
            sizes: [],
          };
        }

        return updated;
      });
    }
  }, [formInputs.niche, formInputs.type]);
  useEffect(() => {
    if (existingProduct) {
      setFormInputs({
        ...initialFormInputs,
        ...existingProduct,
        physicalDetails: {
          ...initialFormInputs.physicalDetails,
          ...(existingProduct.physicalDetails || {}),
        },
      });
    }
  }, [initialFormInputs, existingProduct]);
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      <PageHeader title={isEditing ? 'Edit Listing' : 'Create New Listing'} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollContent}
      >
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
              <Pressable
                style={[
                  styles.dropdownPicker,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setIsNicheModalOpen(true)}
              >
                <Text
                  style={{
                    color: formInputs.niche
                      ? colors.text
                      : colors.inputTextHolder,
                    fontSize: 14,
                  }}
                >
                  {nicheItems.find(i => i.value === formInputs.niche)?.label ||
                    'Select a category'}
                </Text>
                <MaterialIcons
                  name="keyboard-arrow-down"
                  size={20}
                  color={colors.primary}
                />
              </Pressable>
            </View>
          )}
        </View>
        <View
          style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}
        >
          <StepHeader
            number={2}
            title={'Media & Photos'}
            currentStep={activeStep}
            toggleStep={toggleStep}
          />
          {activeStep === 2 && (
            <View style={styles.expandedContent}>
              <>
                {formInputs.mediaUrls && formInputs.mediaUrls.length > 0 && (
                  <MediaPreviewList
                    mediaList={formInputs.mediaUrls.map((uri: string) => ({
                      type: 'image',
                      uri: [uri],
                    }))}
                    colors={colors}
                    disabled={formInputs.mediaUrls.length >= 4}
                    onPickMedia={handleAddProductImages}
                    onRemove={index =>
                      setFormInputs(prev => ({
                        ...prev,
                        mediaUrls: (prev as any).mediaUrls.filter(
                          (_: any, i: number) => i !== index,
                        ),
                      }))
                    }
                  />
                )}
                <TouchableOpacity
                  style={styles.uploadPlaceholder}
                  onPress={handleAddProductImages}
                >
                  <MaterialIcons
                    name="cloud-upload"
                    size={29}
                    color={colors.primary}
                  />
                  <Text style={[styles.uploadText, { color: colors.primary }]}>
                    Tap to upload product images
                  </Text>
                </TouchableOpacity>
              </>
            </View>
          )}
        </View>
        <View
          style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}
        >
          <StepHeader
            number={3}
            toggleStep={toggleStep}
            title={`Product Details`}
            currentStep={activeStep}
          />
          {activeStep === 3 && (
            <View style={styles.expandedContent}>
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
                      {
                        flex: 1,
                        width: 'auto',
                        color: colors.text,
                        marginBottom: 0,
                      },
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
                        <Text
                          style={[
                            styles.tagText,
                            { color: `${color}` || colors.text },
                          ]}
                        >
                          {color}
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
                          {size}
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
                      { borderColor: colors.primary },
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
                          ? { color: colors.btnTextColor }
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
                      { borderColor: colors.primary },
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
                          ? { color: colors.btnTextColor }
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
                    <StationCarousel
                      stations={stations}
                      selectedStations={
                        formInputs.physicalDetails.dropOffAddress
                      }
                      onSelect={station => {
                        setFormInputs(prev => {
                          const currentAddresses =
                            prev.physicalDetails.dropOffAddress || [];
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
                              dropOffAddress: updatedStations,
                            },
                          };
                        });
                      }}
                      userCoords={userCoords}
                    />
                  </>
                )}
              </>
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
        <Text style={[styles.feeText, { color: colors.primary }]}>
          We charge a {toPercentLabel(TRANSACTION_TAX_RATE)} commission per
          product sold.
        </Text>
        <CustomButton
          title="Publish Product"
          style={styles.submitButton}
          onPress={handlePublishProduct}
          disabled={isSubmitting || cannotSubmit}
        />
      </ScrollView>
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
      <Modal
        visible={isNicheModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsNicheModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.bottomSheet,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <Text
              style={[styles.modalTitleSecond, { color: colors.textDarker }]}
            >
              Select Category
            </Text>
            <FlatList
              data={nicheItems}
              keyExtractor={item => item.value}
              renderItem={({ item }) => {
                const isSelected = formInputs.niche === item.value;
                return (
                  <Pressable
                    style={[
                      styles.nicheOption,
                      isSelected && { backgroundColor: colors.btnColor + '15' },
                      { borderBottomColor: colors.border || '#E2E8F0' },
                    ]}
                    onPress={() => {
                      setFormInputs(prev => ({ ...prev, niche: item.value }));
                      setIsNicheModalOpen(false);
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <MaterialIcons
                        name={item.icon}
                        size={20}
                        color={
                          isSelected ? colors.btnTextColor : colors.primary
                        }
                      />
                      <Text
                        style={{
                          color: isSelected ? colors.btnTextColor : colors.text,
                          fontSize: 14,
                        }}
                      >
                        {item.label}
                      </Text>
                    </View>
                    {isSelected && (
                      <MaterialIcons
                        name="check-circle"
                        size={20}
                        color={colors.btnTextColor}
                      />
                    )}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 15, paddingBottom: 50 },
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
  expandedContent: {
    marginTop: 20,
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
    paddingHorizontal: 15,
    fontSize: 14,
    width: '100%',
    marginBottom: 20,
    height: 50,
  },
  uploadPlaceholder: {
    padding: 15,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    width: 'auto',
    marginVertical: 20,
  },
  uploadText: { marginTop: 6, fontSize: 14 },
  submitButton: {
    paddingVertical: 15,
    marginVertical: 20,
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
    marginBottom: 20,
  },
  dropdownPicker: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownList: {
    borderRadius: 16,
    borderWidth: 1,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    paddingVertical: 6,
  },
  dropdownText: {
    fontSize: 14,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 15,
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
    marginBottom: 20,
    lineHeight: 20,
  },
  gatewayRow: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
    gap: 8,
  },
  gatewayChip: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flex: 1,
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
    marginBottom: 20,
  },
  addTagButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTagButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tagWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  tagBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
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
    alignItems: 'center',
    justifyContent: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    maxHeight: '60%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 25,
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    borderTopRightRadius: 25,
    borderTopLeftRadius: 25,
    padding: 25,
    alignItems: 'center',
    justifyContent: 'center',
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
  modalTitleSecond: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 25,
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
  feeText: {
    fontSize: 13,
    marginBottom: 15,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  nicheOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderBottomWidth: 0.5,
    borderRadius: 8,
    marginBottom: 10,
  },
});
