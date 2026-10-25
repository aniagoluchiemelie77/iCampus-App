import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { saveProductApiCall } from '../api/localPostApis';
import type { Product } from '../types/firebase';
import { useTheme } from './ThemeContext';
import { useAppDataContext } from './EventContext';
import {
  clearDraftFromLocalDb,
  saveProductToLocalDb,
} from '../hooks/useSQLiteDb';
import { uploadToCloudinaryWithProgress } from '../utils/CloudinaryPresetHelper';
import { v4 as uuidv4 } from 'uuid';
import { navigationRef } from './navigationContext';

type ProductPayload = {
  title: string;
  description: string;
  type: Product['type'];
  price: number;
  niche: Product['niche'];
  physicalDetails: NonNullable<Product['physicalDetails']>;
  mediaUrls: string[];
};

interface ProductUploadJob {
  payload: ProductPayload;
  productId?: string;
  draftKey: string;
  sellerId: string;
  currency: string;
  nationalityOfSeller: string;
  schoolName?: string;
  existingProduct?: Product;
  onSuccess: () => void;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface UploadState {
  status: UploadStatus;
  progress: number;
  step: string;
  error?: string;
}

interface ProductUploadContextValue {
  startProductUpload: (job: ProductUploadJob) => boolean;
  isUploading: boolean;
  pendingProduct: Product | null;
  publishedVersion: number;
}

const ProductUploadContext = createContext<
  ProductUploadContextValue | undefined
>(undefined);
const MEDIA_PROGRESS_SHARE = 45;
const SUCCESS_LINGER_MS = 1200;

export const ProductUploadProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { syncCatalogToDatabase } = useAppDataContext();
  const [state, setState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    step: '',
  });
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [publishedVersion, setPublishedVersion] = useState(0);
  const jobRef = useRef<ProductUploadJob | null>(null);
  const uploadedUrlsRef = useRef<string[]>([]);
  const idempotencyKeyRef = useRef('');
  const runningRef = useRef(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    jobRef.current = null;
    uploadedUrlsRef.current = [];
    idempotencyKeyRef.current = '';
    setPendingProduct(null);
    setState({ status: 'idle', progress: 0, step: '' });
  }, []);

  const run = useCallback(async () => {
    const job = jobRef.current;
    if (!job || runningRef.current) return;
    runningRef.current = true;

    const setProgress = (progress: number, step: string) =>
      setState({
        status: 'uploading',
        progress: Math.max(0, Math.min(99, Math.round(progress))),
        step,
      });

    try {
      const mediaUrls = job.payload.mediaUrls;
      uploadedUrlsRef.current =
        uploadedUrlsRef.current.length === mediaUrls.length
          ? uploadedUrlsRef.current
          : mediaUrls.map(uri => (uri.startsWith('http') ? uri : ''));

      for (let index = 0; index < mediaUrls.length; index += 1) {
        const uri = mediaUrls[index];
        if (uri.startsWith('http') || uploadedUrlsRef.current[index]) continue;

        const label =
          mediaUrls.length > 1
            ? `Uploading image ${index + 1} of ${mediaUrls.length}`
            : 'Uploading product image';
        setProgress((index / mediaUrls.length) * MEDIA_PROGRESS_SHARE, label);
        uploadedUrlsRef.current[index] = await uploadToCloudinaryWithProgress(
          uri,
          'product-thumbnails',
          'image',
          fraction =>
            setProgress(
              ((index + fraction) / mediaUrls.length) * MEDIA_PROGRESS_SHARE,
              label,
            ),
        );
      }

      const finalMediaUrls = [...uploadedUrlsRef.current];
      setProgress(
        MEDIA_PROGRESS_SHARE,
        job.productId ? 'Saving listing changes' : 'Publishing your listing',
      );
      const response = await saveProductApiCall(
        { ...job.payload, mediaUrls: finalMediaUrls },
        job.productId,
        percent =>
          setProgress(
            MEDIA_PROGRESS_SHARE +
              (percent / 100) * (100 - MEDIA_PROGRESS_SHARE),
            'Saving product details',
          ),
        idempotencyKeyRef.current,
      );

      if (!response?.success) {
        throw new Error(
          response?.message || 'The server could not save your listing.',
        );
      }

      const responseData =
        response.data?.product ?? response.product ?? response.data ?? {};
      const serverProduct =
        responseData && typeof responseData === 'object' ? responseData : {};
      const productIdentifier =
        serverProduct.productId ||
        serverProduct._id ||
        serverProduct.id ||
        response.productId ||
        job.productId;

      if (!productIdentifier) {
        throw new Error(
          'The server did not return a product ID. Your listing could not be added to inventory.',
        );
      }
      const savedProductId = String(productIdentifier);

      const savedProduct: Product = {
        ...serverProduct,
        productId: savedProductId,
        id: serverProduct.id || serverProduct._id || savedProductId,
        sellerId: serverProduct.sellerId || job.sellerId,
        title: serverProduct.title || job.payload.title,
        description: serverProduct.description ?? job.payload.description,
        type:
          serverProduct.type || serverProduct.productType || job.payload.type,
        price: Number(serverProduct.price ?? job.payload.price),
        niche: serverProduct.niche || job.payload.niche,
        category:
          serverProduct.category || serverProduct.niche || job.payload.niche,
        currency: serverProduct.currency || job.currency,
        amountInStock:
          Number(
            serverProduct.amountInStock ??
              serverProduct.physicalDetails?.inStock ??
              job.payload.physicalDetails.inStock,
          ) || 0,
        mediaUrls: Array.isArray(serverProduct.mediaUrls)
          ? serverProduct.mediaUrls
          : finalMediaUrls,
        physicalDetails: {
          ...job.payload.physicalDetails,
          ...(serverProduct.physicalDetails || {}),
        },
        nationalityOfSeller:
          serverProduct.nationalityOfSeller || job.nationalityOfSeller,
        schoolName: serverProduct.schoolName || job.schoolName,
        impressions: Number(serverProduct.impressions) || 0,
        sales: Number(serverProduct.sales) || 0,
        favCount: Number(serverProduct.favCount) || 0,
        ratings: Array.isArray(serverProduct.ratings)
          ? serverProduct.ratings
          : [],
        isAvailable: serverProduct.isAvailable ?? true,
        createdAt: serverProduct.createdAt || new Date().toISOString(),
      };

      saveProductToLocalDb(savedProduct);
      await syncCatalogToDatabase({ force: true });
      clearDraftFromLocalDb(job.draftKey);
      setPendingProduct(savedProduct);
      setState({ status: 'success', progress: 100, step: '' });
      setPublishedVersion(version => version + 1);
      dismissTimerRef.current = setTimeout(() => {
        job.onSuccess();
        reset();
      }, SUCCESS_LINGER_MS);
    } catch (error: any) {
      console.error('Product publish failed:', error);
      setPendingProduct(null);
      setState({
        status: 'error',
        progress: 0,
        step: '',
        error:
          error?.message ||
          'Could not publish your listing. Check your connection and try again.',
      });
    } finally {
      runningRef.current = false;
    }
  }, [reset, syncCatalogToDatabase]);

  const startProductUpload = useCallback(
    (job: ProductUploadJob) => {
      if (runningRef.current || state.status === 'uploading') return false;
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

      const optimisticId = job.productId || `pending-${uuidv4()}`;
      const preview: Product = {
        id: optimisticId,
        productId: optimisticId,
        sellerId: job.sellerId,
        currency: job.currency,
        nationalityOfSeller: job.nationalityOfSeller,
        impressions: 0,
        sales: 0,
        schoolName: job.schoolName,
        type: job.payload.type,
        category: job.payload.niche,
        title: job.payload.title,
        description: job.payload.description,
        price: job.payload.price,
        mediaUrls: job.payload.mediaUrls,
        amountInStock: Number(job.payload.physicalDetails.inStock) || 0,
        physicalDetails: job.payload.physicalDetails,
        ratings: [],
        favCount: 0,
        isAvailable: true,
        createdAt: new Date().toISOString(),
        niche: job.payload.niche,
      };

      jobRef.current = job;
      uploadedUrlsRef.current = [];
      idempotencyKeyRef.current = uuidv4();
      setPendingProduct(preview);
      setState({
        status: 'uploading',
        progress: 0,
        step: job.payload.mediaUrls.length
          ? 'Preparing product images'
          : 'Publishing your listing',
      });
      void run();
      return true;
    },
    [run, state.status],
  );

  const retry = useCallback(() => {
    void run();
  }, [run]);
  const returnToListing = useCallback(() => {
    const job = jobRef.current;
    if (!job) return;
    const product = job.existingProduct
      ? {
          ...job.existingProduct,
          ...job.payload,
          productId: job.productId || job.existingProduct.productId,
        }
      : undefined;
    navigationRef.navigate('CreateProduct', { product });
    reset();
  }, [reset]);

  useEffect(
    () => () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    },
    [],
  );

  return (
    <ProductUploadContext.Provider
      value={{
        startProductUpload,
        isUploading: state.status === 'uploading',
        pendingProduct,
        publishedVersion,
      }}
    >
      {children}
      {state.status !== 'idle' && (
        <ProductUploadOverlay
          state={state}
          onRetry={retry}
          onReturnToListing={returnToListing}
        />
      )}
    </ProductUploadContext.Provider>
  );
};

export const useProductUpload = () => {
  const context = useContext(ProductUploadContext);
  if (!context) {
    throw new Error(
      'useProductUpload must be used inside ProductUploadProvider',
    );
  }
  return context;
};

const ProductUploadOverlay = ({
  state,
  onRetry,
  onReturnToListing,
}: {
  state: UploadState;
  onRetry: () => void;
  onReturnToListing: () => void;
}) => {
  const { colors } = useTheme();
  const fill = useRef(new Animated.Value(state.progress)).current;
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fill, {
      toValue: state.progress,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [fill, state.progress]);

  useEffect(() => {
    Animated.spring(appear, {
      toValue: 1,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [appear]);

  const width = fill.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });
  const isError = state.status === 'error';
  const isSuccess = state.status === 'success';
  const accent = colors.primary;

  return (
    <View style={overlay.backdrop} accessibilityViewIsModal>
      <Animated.View
        style={[
          overlay.card,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
            opacity: appear,
            transform: [
              {
                translateY: appear.interpolate({
                  inputRange: [0, 1],
                  outputRange: [24, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={[overlay.iconCircle, { backgroundColor: accent + '1A' }]}>
          <MaterialIcons
            name={
              isSuccess
                ? 'check-circle'
                : isError
                  ? 'cloud-off'
                  : 'cloud-upload'
            }
            size={30}
            color={accent}
          />
        </View>
        <Text style={[overlay.title, { color: colors.textDarker }]}>
          {isSuccess
            ? 'Listing published'
            : isError
              ? 'Publishing failed'
              : 'Publishing your listing'}
        </Text>
        {!isSuccess && !isError && (
          <Text style={[overlay.percent, { color: colors.primary }]}>
            {state.progress}%
          </Text>
        )}
        <Text
          style={[overlay.subtitle, { color: colors.text }]}
          numberOfLines={3}
        >
          {isError
            ? state.error
            : isSuccess
              ? 'Your listing is now available in the store.'
              : state.step || 'Preparing your listing…'}
        </Text>
        {!isError && (
          <View style={[overlay.track, { backgroundColor: colors.border }]}>
            <Animated.View
              style={[overlay.trackFill, { width, backgroundColor: accent }]}
            />
          </View>
        )}
        {isError && (
          <View style={overlay.actions}>
            <TouchableOpacity
              onPress={onReturnToListing}
              style={[overlay.secondaryBtn, { borderColor: colors.border }]}
              accessibilityRole="button"
            >
              <Text style={[overlay.secondaryText, { color: colors.text }]}>
                Edit listing
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onRetry}
              style={[overlay.primaryBtn, { backgroundColor: colors.btnColor }]}
              accessibilityRole="button"
            >
              <MaterialIcons
                name="refresh"
                size={18}
                color={colors.btnTextColor}
              />
              <Text
                style={[overlay.primaryText, { color: colors.btnTextColor }]}
              >
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const overlay = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    zIndex: 9999,
    elevation: 9999,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '800' },
  percent: {
    fontSize: 34,
    fontWeight: '800',
    marginTop: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13.5,
    textAlign: 'center',
    marginTop: 6,
    opacity: 0.85,
    lineHeight: 19,
  },
  track: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 18,
  },
  trackFill: { height: '100%', borderRadius: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18, width: '100%' },
  secondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: 14.5, fontWeight: '700' },
  primaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontSize: 14.5, fontWeight: '700' },
});
