import React, { useState } from 'react';
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
} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import DocumentPicker from 'react-native-document-picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import DropDownPicker from 'react-native-dropdown-picker';
import { Product, DropOffStation } from '../types/firebase';
import Video from 'react-native-video';
import { uploadLessonVideoAPI } from '../api/localPostApis';
import { uploadFileToFirebaseClient } from '../utils/CloudinaryPresetHelper';

interface VideoDurationExtractorProps {
  uri: string;
  onDurationExtracted: (duration: number) => void;
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
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
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
  const [activeStep, setActiveStep] = useState(1);
  const [nicheOpen, setNicheOpen] = useState(false);
  const [nicheValue, setNicheValue] = useState(null);
  const [nicheItems, setNicheItems] = useState([
    { label: 'Electronics', value: 'Electronics' },
    { label: 'Courses', value: 'Courses' },
    { label: 'Document', value: 'Documents' },
    { label: 'Fashion', value: 'Fashion' },
    { label: 'Stationery', value: 'Stationery' },
    { label: 'Snacks and Deserts', value: 'Snacks and Deserts' },
    { label: 'Food', value: 'Food' },
  ]);
  const [images, setImages] = useState<string[]>([]);
  const [colorInput, setColorInput] = useState('');
  const [sizeInput, setSizeInput] = useState('');
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
    colors: string[]; // Added
    sizes: string[];
  }>({
    weightKg: '',
    inStock: '',
    sellerGateways: ['drop_off'], // Defaulting to drop_off as requested
    dropOffAddress: [],
    colors: [],
    sizes: [],
  });
  const [courseDetails, setCourseDetails] = useState<{
    additionalLecturersRaw: string; // To capture the comma-separated text input
    content: UIContentItem[]; // Array of lesson objects with videoUrl, duration, etc.
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
  const AVAILABLE_STATIONS: DropOffStation[] = [
    {
      id: '1',
      name: 'Main Campus Hub',
      address: 'Gate 2, Student Union Complex',
      code: 'MCH-01',
      agentId: 'ag_77',
      latitude: 6.428,
      longitude: 7.501,
    },
    {
      id: '2',
      name: 'Chime Avenue Station',
      address: '32 Chime Ave, New Haven',
      code: 'CAS-02',
      agentId: 'ag_34',
      latitude: 6.441,
      longitude: 7.505,
    },
  ];

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
                          name="delete-outline"
                          size={20}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      style={styles.input}
                      placeholder="Lesson Title (e.g., Intro to Hooks)"
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
                          color={lesson.videoUrl ? PRIMARY_COLOR : '#666'}
                        />
                        <Text
                          style={[
                            styles.videoAttachText,
                            lesson.videoUrl && { color: PRIMARY_COLOR },
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
                {/* 1. Basic Dimensions Rows */}
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

                  <View style={{ flex: 1, marginLeft: 8 }}>
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
                          { backgroundColor: '#F0F0F0' },
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

                  {/* B. Sizes Tag Input */}
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

                  {/* Sizes Rendered Tags Row */}
                  <View style={styles.tagWrapper}>
                    {physicalDetails.sizes.map((size, index) => (
                      <TouchableOpacity
                        key={`size-${index}`}
                        style={[
                          styles.tagBadge,
                          { backgroundColor: '#EBF3FF' },
                        ]}
                        onPress={() =>
                          setPhysicalDetails(prev => ({
                            ...prev,
                            sizes: prev.sizes.filter(s => s !== size),
                          }))
                        }
                      >
                        <Text style={[styles.tagText, { color: '#007AFF' }]}>
                          {size} ✕
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* 2. Shipping Gateways Multi-Select Chips */}
                <Text style={styles.label}>Fulfillment / Delivery Options</Text>
                <Text style={styles.subLabel}>
                  How will the buyer receive this item? Select all that apply.
                </Text>

                <View style={styles.gatewayRow}>
                  {/* Drop Off Option */}
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
                          // Force TS to see this as the exact literal array type required by the state
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
                      📦 Drop-off Station
                    </Text>
                  </TouchableOpacity>

                  {/* Home Delivery Option */}
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
                      🏠 Home Delivery
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 3. Conditional Drop Off Station Picker Layout */}
                {physicalDetails.sellerGateways.includes('drop_off') && (
                  <View style={styles.stationBlock}>
                    <Text style={[styles.label, { marginTop: 12 }]}>
                      Select Drop-off Hubs Nearby
                    </Text>
                    <Text style={styles.subLabel}>
                      Choose where you will physically drop this package upon
                      sale.
                    </Text>

                    {AVAILABLE_STATIONS.map(station => {
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
                              {station.name}{' '}
                              <Text style={styles.stationCode}>
                                ({station.code})
                              </Text>
                            </Text>
                            <Text style={styles.stationAddress}>
                              {station.address}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.checkboxCircle,
                              isSelected && styles.checkboxCircleChecked,
                            ]}
                          >
                            {isSelected && (
                              <View style={styles.checkboxInner} />
                            )}
                          </View>
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
          <View style={styles.expandedContent}>
            <Text style={styles.label}>Price (iCash)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="numeric"
              value={form.price}
              onChangeText={text => setForm(prev => ({ ...prev, price: text }))}
            />

            {/* Dynamic contextual advice helper text */}
            <Text style={styles.priceHintText}>
              {productType === 'file' &&
                '⚠️ Digital files are capped at 1,000 iCash to keep materials accessible.'}
              {productType === 'course' &&
                '💡 Premium courses are restricted to a maximum threshold of 10,000 iCash.'}
              {productType === 'physical' &&
                '📦 Physical items are regulated up to a limit of 50,000 iCash.'}
            </Text>
          </View>
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
    borderColor: '#D1D5DB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#666',
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
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    color: '#666',
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  videoAttachText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  previewToggle: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  previewToggleActive: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: '#FFF0EA',
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 12,
    marginHorizontal: 4,
    backgroundColor: '#FFF',
  },
  activeChip: {
    borderColor: '#007AFF', // Use your main application theme color here
    backgroundColor: '#E6F0FF',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#444',
  },
  activeChipText: {
    color: '#007AFF',
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
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
  },
  activeStationCard: {
    borderColor: '#007AFF',
    backgroundColor: '#F4F9FF',
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
  stationCode: {
    fontSize: 11,
    color: '#888',
  },
  stationAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },
  checkboxCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CCC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCircleChecked: {
    borderColor: '#007AFF',
  },
  checkboxInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  variantSection: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
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
    color: '#444',
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
});