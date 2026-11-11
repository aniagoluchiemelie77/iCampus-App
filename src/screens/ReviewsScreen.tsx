import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ImagePicker from 'react-native-image-crop-picker';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { uploadToCloudinary } from '../utils/CloudinaryPresetHelper';
import { submitReviewApi } from '../api/localPostApis';
import { useTheme } from '../context/ThemeContext';
import { CustomButton } from '../assets/components/AppUIComponents';
import { PageHeader } from '../components/PageHeader';
import { centeredColumn } from '../utils/layout';

type AttributeKey = 'accuracy' | 'deliverySpeed' | 'clarity';
type BackendTarget = 'product' | 'seller' | 'agent' | 'course' | 'lecturer';

// Defined at module level: these used to live inside the component, after
// the useState that read them (a crash on open), and their arrays changed
// identity every render, which reset the ratings on every tap.
const TARGET_CONFIGS: Record<
  string,
  {
    targetType: BackendTarget;
    headerTitle: string;
    prompt: string;
    icon: string;
    fields: AttributeKey[];
  }
> = {
  physical: {
    targetType: 'product',
    headerTitle: 'Rate your order',
    prompt: 'How was your purchase?',
    icon: 'shopping-bag',
    fields: ['accuracy', 'deliverySpeed'],
  },
  product: {
    targetType: 'product',
    headerTitle: 'Rate your order',
    prompt: 'How was your purchase?',
    icon: 'shopping-bag',
    fields: ['accuracy', 'deliverySpeed'],
  },
  file: {
    targetType: 'product',
    headerTitle: 'Rate this download',
    prompt: 'How was this digital product?',
    icon: 'description',
    fields: ['accuracy'],
  },
  course: {
    targetType: 'course',
    headerTitle: 'Rate this course',
    prompt: 'How was this course?',
    icon: 'school',
    fields: ['accuracy', 'clarity'],
  },
  agent: {
    targetType: 'agent',
    headerTitle: 'Rate the delivery agent',
    prompt: 'How was the hand-off?',
    icon: 'local-shipping',
    fields: ['accuracy', 'deliverySpeed'],
  },
  lecturer: {
    targetType: 'lecturer',
    headerTitle: 'Rate your instructor',
    prompt: 'How was this instructor?',
    icon: 'record-voice-over',
    fields: ['clarity'],
  },
};

const ATTRIBUTE_COPY: Record<AttributeKey, { label: string; hint: string }> = {
  accuracy: {
    label: 'As described',
    hint: 'Did what you got match the listing?',
  },
  deliverySpeed: {
    label: 'Speed',
    hint: 'Delivery, hand-off or download time',
  },
  clarity: {
    label: 'Clarity',
    hint: 'Explanations, audio and video quality',
  },
};

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
const MAX_PHOTOS = 3;
const MAX_COMMENT = 500;

const StarRow = ({
  value,
  onChange,
  size,
  color,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  size: number;
  color: string;
  label: string;
}) => (
  <View style={styles.starRow}>
    {[1, 2, 3, 4, 5].map(star => (
      <TouchableOpacity
        key={star}
        onPress={() => onChange(star)}
        activeOpacity={0.7}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${star} star${star > 1 ? 's' : ''}`}
        accessibilityState={{ selected: star <= value }}
      >
        <MaterialIcons
          name={star <= value ? 'star' : 'star-border'}
          size={size}
          color={color}
          style={styles.star}
        />
      </TouchableOpacity>
    ))}
  </View>
);

export const CreateReviewScreen = ({ route, navigation }: any) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    targetId,
    productType,
    orderId,
    productName,
    productImage,
  } = route.params || {};
  const config = TARGET_CONFIGS[productType] || TARGET_CONFIGS.physical;

  const [rating, setRating] = useState(0);
  const [attributes, setAttributes] = useState<
    Partial<Record<AttributeKey, number>>
  >({});
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickPhotos = () => {
    ImagePicker.openPicker({
      multiple: true,
      maxFiles: MAX_PHOTOS - photos.length,
      mediaType: 'photo',
      compressImageQuality: 0.7,
    })
      .then(assets => {
        setPhotos(prev =>
          [...prev, ...assets.map(a => a.path)].slice(0, MAX_PHOTOS),
        );
      })
      .catch(err => {
        if (err?.code !== 'E_PICKER_CANCELLED') {
          Toast.show({ type: 'error', text2: 'Could not open your photos.' });
        }
      });
  };

  const leave = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Home', { activeTab: 'home' });
  };

  const submit = async () => {
    if (!targetId) {
      Toast.show({
        type: 'error',
        text1: 'Nothing to review',
        text2: 'This review link is missing its item.',
      });
      return;
    }
    if (rating === 0) {
      Toast.show({ type: 'error', text1: 'Tap a star to rate first' });
      return;
    }
    setIsSubmitting(true);
    try {
      const mediaUrls = photos.length
        ? await Promise.all(
            photos.map(uri => uploadToCloudinary(uri, 'review-attachments')),
          )
        : [];
      const result = await submitReviewApi(
        {
          targetType: config.targetType,
          targetId,
          orderId,
          rating,
          comment: comment.trim(),
          mediaUrls,
          attributes: {
            accuracy: attributes.accuracy || undefined,
            deliverySpeed: attributes.deliverySpeed || undefined,
            clarity: attributes.clarity || undefined,
          },
        },
        '',
      );
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Thanks for your review',
          text2: 'It helps others on iCampus decide.',
        });
        leave();
      } else {
        Toast.show({
          type: 'error',
          text1: "Couldn't post review",
          text2: result.message || 'Please try again.',
        });
      }
    } catch {
      Toast.show({
        type: 'error',
        text1: "Couldn't post review",
        text2: 'Check your connection and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title={config.headerTitle} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, centeredColumn(560)]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* What is being reviewed + the main rating */}
          <View
            style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}
          >
            <View style={styles.itemRow}>
              {productImage ? (
                <Image source={{ uri: productImage }} style={styles.itemThumb} />
              ) : (
                <View
                  style={[
                    styles.itemThumb,
                    styles.itemIcon,
                    { backgroundColor: colors.primary + '14' },
                  ]}
                >
                  <MaterialIcons
                    name={config.icon}
                    size={26}
                    color={colors.primary}
                  />
                </View>
              )}
              <View style={styles.flex}>
                <Text
                  style={[styles.itemName, { color: colors.textDarker }]}
                  numberOfLines={2}
                >
                  {productName || config.prompt}
                </Text>
                {!!orderId && (
                  <Text style={[styles.itemMeta, { color: colors.text }]}>
                    Order #{String(orderId).slice(-8).toUpperCase()}
                  </Text>
                )}
              </View>
            </View>

            <View
              style={[styles.divider, { backgroundColor: colors.border + '40' }]}
            />
            <Text style={[styles.overallLabel, { color: colors.text }]}>
              Overall rating
            </Text>
            <StarRow
              value={rating}
              onChange={setRating}
              size={42}
              color={colors.primary}
              label="Overall rating"
            />
            <Text
              style={[
                styles.ratingWord,
                { color: rating ? colors.primary : colors.text },
              ]}
            >
              {rating ? RATING_LABELS[rating] : 'Tap a star'}
            </Text>
          </View>

          {/* Detail ratings */}
          <View
            style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}
          >
            <Text style={[styles.cardTitle, { color: colors.textDarker }]}>
              Details{' '}
              <Text style={[styles.optional, { color: colors.text }]}>
                optional
              </Text>
            </Text>
            {config.fields.map((field, i) => (
              <View
                key={field}
                style={[
                  styles.attrRow,
                  i > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.border + '55',
                  },
                ]}
              >
                <View style={styles.flex}>
                  <Text style={[styles.attrLabel, { color: colors.textDarker }]}>
                    {ATTRIBUTE_COPY[field].label}
                  </Text>
                  <Text style={[styles.attrHint, { color: colors.text }]}>
                    {ATTRIBUTE_COPY[field].hint}
                  </Text>
                </View>
                <StarRow
                  value={attributes[field] || 0}
                  onChange={v => setAttributes(prev => ({ ...prev, [field]: v }))}
                  size={22}
                  color={colors.primary}
                  label={ATTRIBUTE_COPY[field].label}
                />
              </View>
            ))}
          </View>

          {/* Written review + photos */}
          <View
            style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}
          >
            <Text style={[styles.cardTitle, { color: colors.textDarker }]}>
              Your review{' '}
              <Text style={[styles.optional, { color: colors.text }]}>
                optional
              </Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border + '80',
                  backgroundColor: colors.background,
                },
              ]}
              placeholder="What did you like or dislike? Others will read this."
              placeholderTextColor={colors.inputTextHolder}
              multiline
              maxLength={MAX_COMMENT}
              value={comment}
              onChangeText={setComment}
            />
            <Text style={[styles.counter, { color: colors.text }]}>
              {comment.length}/{MAX_COMMENT}
            </Text>

            <View style={styles.photoRow}>
              {photos.map((uri, index) => (
                <View key={uri} style={styles.photo}>
                  <Image source={{ uri }} style={styles.photoImg} />
                  <TouchableOpacity
                    style={[styles.photoRemove, { backgroundColor: colors.textDarker }]}
                    onPress={() =>
                      setPhotos(prev => prev.filter((_, i) => i !== index))
                    }
                    accessibilityLabel="Remove photo"
                    hitSlop={6}
                  >
                    <MaterialIcons name="close" size={14} color={colors.background} />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < MAX_PHOTOS && (
                <TouchableOpacity
                  style={[styles.photo, styles.addPhoto, { borderColor: colors.primary + '80' }]}
                  onPress={pickPhotos}
                  accessibilityRole="button"
                  accessibilityLabel="Add photos"
                >
                  <MaterialIcons name="add-a-photo" size={22} color={colors.primary} />
                  <Text style={[styles.addPhotoText, { color: colors.primary }]}>
                    {photos.length}/{MAX_PHOTOS}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Pinned action */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.backgroundSecondary,
              borderTopColor: colors.border + '40',
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={[styles.footerInner, centeredColumn(560)]}>
            <TouchableOpacity onPress={leave} style={styles.skipBtn} disabled={isSubmitting}>
              <Text style={[styles.skipText, { color: colors.text }]}>Not now</Text>
            </TouchableOpacity>
            <CustomButton
              title={isSubmitting ? 'Posting…' : 'Post review'}
              style={styles.submitBtn}
              onPress={submit}
              disabled={isSubmitting || rating === 0}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 14, paddingBottom: 24, gap: 12 },
  card: {
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemThumb: { width: 56, height: 56, borderRadius: 12 },
  itemIcon: { alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 15.5, fontWeight: '700', lineHeight: 21 },
  itemMeta: { fontSize: 12, marginTop: 3, opacity: 0.75 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 16 },
  overallLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 8,
  },
  starRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  star: { marginHorizontal: 2 },
  ratingWord: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  optional: { fontSize: 12, fontWeight: '500', opacity: 0.6 },
  attrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  attrLabel: { fontSize: 14, fontWeight: '600' },
  attrHint: { fontSize: 12, marginTop: 2, opacity: 0.7 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 110,
    textAlignVertical: 'top',
    marginTop: 4,
  },
  counter: { alignSelf: 'flex-end', fontSize: 11, marginTop: 4, opacity: 0.6 },
  photoRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  photo: { width: 72, height: 72, borderRadius: 12 },
  photoImg: { width: '100%', height: '100%', borderRadius: 12 },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: {
    borderWidth: 1.2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addPhotoText: { fontSize: 11, fontWeight: '600' },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingHorizontal: 14,
  },
  footerInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  skipBtn: { paddingHorizontal: 14, height: 48, justifyContent: 'center' },
  skipText: { fontSize: 14, fontWeight: '600' },
  submitBtn: { flex: 1, width: 'auto', height: 48, borderRadius: 24 },
});
