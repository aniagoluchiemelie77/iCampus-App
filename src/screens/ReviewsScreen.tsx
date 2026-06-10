import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ImagePicker from 'react-native-image-crop-picker';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from 'assets/styles/colors';
import {uploadToFirebase} from '../utils/CloudinaryPresetHelper';
import { submitReviewApi } from '../api/localPostApis';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

interface ReviewAttributes {
  deliverySpeed?: number;
  accuracy?: number;
  clarity?: number;
}

export const CreateReviewScreen = ({ route, navigation }: any) => {
  const { colors } = useTheme();
  const { targetId, productType: targetType } = route.params;
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [localImageUris, setLocalImageUris] = useState<string[]>([]);
  const [attributes, setAttributes] = useState<ReviewAttributes>(() => {
    const initialAttrs: ReviewAttributes = {};
    config.fields.forEach(field => {
      initialAttrs[field] = 0;
    });
    return initialAttrs;
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const TARGET_TYPE_CONFIGS: Record<
    string,
    {
      targetType: 'product' | 'seller' | 'agent' | 'course' | 'lecturer';
      headerTitle: string;
      fields: Array<'accuracy' | 'deliverySpeed' | 'clarity'>;
    }
  > = {
    physical: {
      targetType: 'product',
      headerTitle: 'Physical Product Review',
      fields: ['accuracy', 'deliverySpeed'],
    },
    course: {
      targetType: 'course',
      headerTitle: 'Course Curriculum Review',
      fields: ['accuracy', 'clarity'],
    },
    file: {
      targetType: 'product',
      headerTitle: 'Digital Product Review',
      fields: ['accuracy'],
    },
    agent: {
      targetType: 'agent',
      headerTitle: 'Service Agent Review',
      fields: ['accuracy', 'deliverySpeed'],
    },
    lecturer: {
      targetType: 'lecturer',
      headerTitle: 'Instructor Evaluation',
      fields: ['clarity'],
    },
  };
  const TARGET_ICON_MAP: Record<string, string> = {
    product: 'shopping-bag-outlined',
    course: 'school-outlined',
    seller: 'store-front-outlined',
    agent: 'local-shipping-outlined',
    lecturer: 'record-voice-over-outlined',
  };
  const config =
    TARGET_TYPE_CONFIGS[targetType] || TARGET_TYPE_CONFIGS.physical;
  const handlePickImages = () => {
    ImagePicker.openPicker({
      multiple: true,
      maxFiles: 3,
      mediaType: 'photo',
      compressImageQuality: 0.7,
    })
      .then(assets => {
        const paths = assets.map(asset => asset.path);
        setLocalImageUris(prev => [...prev, ...paths].slice(0, 3));
      })
      .catch(err => {
        if (err.message !== 'User cancelled image selection') {
          Toast.show({
            type: 'error',
            text1: 'Selection Error',
            text2: 'Could not open photo library',
          });
        }
      });
  };
  const removeSelectedImage = (index: number) => {
    setLocalImageUris(prev => prev.filter((_, i) => i !== index));
  };
  const updateAttributeRating = (
    key: keyof ReviewAttributes,
    value: number,
  ) => {
    setAttributes(prev => ({ ...prev, [key]: value }));
  };
  const handleSubmitReview = async () => {
    if (rating === 0) {
      Alert.alert(
        'Rating Required',
        'Please choose a primary star rating level.',
      );
      return;
    }
    try {
      setIsSubmitting(true);
      let finalMediaUrls: string[] = [];
      if (localImageUris.length > 0) {
        finalMediaUrls = await Promise.all(
          localImageUris.map(uri =>
            uploadToFirebase(uri, 'review-attachments'),
          ),
        );
      }
      const reviewPayload = {
        targetType: targetType,
        targetId: targetId || 'UNKNOWN_ID',
        rating,
        comment: comment.trim(),
        mediaUrls: finalMediaUrls,
        attributes: {
          deliverySpeed: attributes.deliverySpeed || undefined,
          accuracy: attributes.accuracy || undefined,
          clarity: attributes.clarity || undefined,
        },
      };
      console.log('Pushing schema aligned submission body:', reviewPayload);
      const result = await submitReviewApi(reviewPayload, authToken!);
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Review Submitted',
          text2: result.message,
        });
        navigation.navigate('Home', { activeTab: 'home' });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Review Error',
          text2: result.message || 'Something went wrong',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Submission Failure',
        text2: 'Something broke down while saving your evaluation metrics',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const renderStarRatingRow = (
    currentVal: number,
    onChange: (val: number) => void,
    maxStars = 5,
  ) => {
    return (
      <View style={styles.starRow}>
        {[...Array(maxStars)].map((_, i) => {
          const starIndex = i + 1;
          return (
            <TouchableOpacity
              key={starIndex}
              onPress={() => onChange(starIndex)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={starIndex <= currentVal ? 'star' : 'star-border-outlined'}
                size={32}
                color={colors.primary}
                style={styles.starSpacing}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const token =
          (await AsyncStorage.getItem('accessToken')) ||
          route.params?.authFallback;
        console.log('Active Session Token resolved:', token);

        if (token) {
          setAuthToken(token);
        }
      } catch (error) {
        console.error('Authentication extraction error:', error);
      }
    };

    checkAuthentication();
  }, [route.params?.authFallback]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <View
        style={[
          styles.subContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <MaterialIcons
          name={TARGET_ICON_MAP[config.targetType] || 'rate-review'}
          size={24}
          color={colors.text}
        />
        <Text style={[styles.sectionTitle, { color: colors.textDarker }]}>
          {config.headerTitle}
        </Text>
        <Text style={[styles.blockHeading, { color: colors.text }]}>
          Overall Satisfaction *
        </Text>
        {renderStarRatingRow(rating, setRating)}
        <Text style={[styles.blockHeading, { color: colors.text }]}>
          Detailed Performance Metrics
        </Text>
        {attributes.accuracy !== undefined && (
          <>
            <Text style={[styles.attributeLabel, { color: colors.text }]}>
              Item Accuracy
            </Text>
            <Text style={[styles.attributeDescription, { color: colors.text }]}>
              How well did the product description, files, or service details
              match what you actually received?
            </Text>
            {renderStarRatingRow(attributes.accuracy, val =>
              updateAttributeRating('accuracy', val),
            )}
          </>
        )}
        {attributes.deliverySpeed !== undefined && (
          <>
            <Text style={[styles.attributeLabel, { color: colors.text }]}>
              Fulfillment Speed
            </Text>
            <Text style={[styles.attributeDescription, { color: colors.text }]}>
              Rate the speed of delivery drop-off, agent handling times, or
              download availability.
            </Text>
            {renderStarRatingRow(attributes.deliverySpeed, val =>
              updateAttributeRating('deliverySpeed', val),
            )}
          </>
        )}
        {attributes.clarity !== undefined && (
          <>
            <Text style={[styles.attributeLabel, { color: colors.text }]}>
              Content Clarity
            </Text>
            <Text style={[styles.attributeDescription, { color: colors.text }]}>
              Evaluate the video resolution, audio quality, instruction quality,
              or explanation breakdown.
            </Text>
            {renderStarRatingRow(attributes.clarity, val =>
              updateAttributeRating('clarity', val),
            )}
          </>
        )}
        <Text style={[styles.blockHeading, { color: colors.text }]}>
          Written Feedback (Optional)
        </Text>
        <TextInput
          style={[styles.textAreaInput, { color: colors.text }]}
          placeholder="Share your experience here to help others make informed decisions..."
          placeholderTextColor={colors.inputTextHolder}
          multiline
          numberOfLines={4}
          value={comment}
          onChangeText={setComment}
        />
        <Text style={[styles.blockHeading, { color: colors.text }]}>
          Media Uploads ({localImageUris.length}/3)
        </Text>
        <View style={styles.mediaContainerStrip}>
          {localImageUris.map((uri, index) => (
            <View key={index} style={styles.imagePreviewWrapper}>
              <Image source={{ uri }} style={styles.previewThumbnail} />
              <TouchableOpacity
                style={[
                  styles.closeBadgeButton,
                  { backgroundColor: colors.backgroundSecondary },
                ]}
                onPress={() => removeSelectedImage(index)}
              >
                <MaterialIcons
                  name="cancel-outlined"
                  size={18}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          ))}
          {localImageUris.length < 3 && (
            <TouchableOpacity
              style={styles.addPhotosBoxButton}
              onPress={handlePickImages}
            >
              <MaterialIcons
                name="add-a-photo-outlined"
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.addPhotosText, {color: colors.primary}]}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.disabledButton, {backgroundColor: colors.btnColor}]}
          onPress={handleSubmitReview}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.btnTextColor} size='small' />
          ) : (
            <Text style={[styles.submitButtonText, {color: colors.btnTextColor}]}>Publish Review</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignContent: 'center' },
  subContainer: { padding: 20, borderRadius: 15, alignContent: 'center' },
  scrollContent: { padding: 15 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 15,
  },
  blockHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 15,
  },
  starRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  starSpacing: { marginRight: 8 },
  attributeLabel: {
    fontSize: 14,
    marginBottom: 15,
  },
  textAreaInput: {
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 13,
    padding: 15,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  mediaContainerStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  imagePreviewWrapper: {
    width: 80,
    height: 80,
    marginRight: 12,
    marginBottom: 12,
    position: 'relative',
  },
  previewThumbnail: { width: '100%', height: '100%', borderRadius: 8 },
  closeBadgeButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 15,
  },
  addPhotosBoxButton: {
    width: 80,
    height: 80,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    borderRadius: 12,
    alignContent: 'center',
  },
  addPhotosText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  submitButton: {
    width: '80%',
    paddingVertical: 10,
    borderRadius: 15,
    alignContent: 'center',
    marginTop: 15,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
    alignSelf: 'center'
  },
  disabledButton: { opacity: 0.6 },
  submitButtonText: { fontSize: 14, fontWeight: '600' },
  attributeDescription: {
    fontSize: 12,
    marginBottom: 15,
    fontStyle: 'italic',
  },
});