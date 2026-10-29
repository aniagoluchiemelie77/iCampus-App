import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';

export type VerificationStage = 'scanning' | 'verifying' | 'finalizing' | 'done';

export interface OrderVerificationState {
  status: 'idle' | 'working' | 'error';
  stage: VerificationStage;
  progress: number; // 0–100
  error?: string;
}

export const idleVerification: OrderVerificationState = {
  status: 'idle',
  stage: 'scanning',
  progress: 0,
};

const STAGES: { key: VerificationStage; label: string; detail: string }[] = [
  { key: 'scanning', label: 'Scanning…', detail: 'Reading the order QR code' },
  { key: 'verifying', label: 'Verifying order…', detail: 'Confirming the order with iCampus' },
  { key: 'finalizing', label: 'Finalizing…', detail: 'Releasing funds to the seller' },
];
const stageIndex = (stage: VerificationStage) =>
  stage === 'done' ? STAGES.length : STAGES.findIndex(s => s.key === stage);

/**
 * Progress card shown after an order QR is scanned, in the same style as the
 * post upload card: Scanning → Verifying → Finalizing, then the caller
 * navigates to the success screen.
 */
export const OrderVerificationOverlay = ({
  state,
  onRetry,
  onClose,
}: {
  state: OrderVerificationState;
  onRetry: () => void;
  onClose: () => void;
}) => {
  const { colors } = useTheme();
  const fill = useRef(new Animated.Value(0)).current;
  const appear = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const visible = state.status !== 'idle';
  const isError = state.status === 'error';
  const isDone = state.stage === 'done';
  const current = stageIndex(state.stage);

  useEffect(() => {
    Animated.timing(fill, {
      toValue: state.progress,
      duration: 350,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [fill, state.progress]);

  useEffect(() => {
    if (!visible) return;
    appear.setValue(0);
    Animated.spring(appear, { toValue: 1, friction: 7, useNativeDriver: true }).start();
  }, [appear, visible]);

  useEffect(() => {
    if (!visible || isError || isDone) return;
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    spin.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [spin, visible, isError, isDone]);

  if (!visible) return null;

  const width = fill.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const accent = isError ? colors.primary : isDone ? colors.success : colors.primary;
  const title = isError
    ? 'Verification failed'
    : isDone
      ? 'Order completed'
      : STAGES[Math.max(0, current)]?.label;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => isError && onClose()}>
      <View style={styles.backdrop} accessibilityViewIsModal>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
              opacity: appear,
              transform: [
                { translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
              ],
            },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: accent + '1A' }]}>
            {isError || isDone ? (
              <MaterialIcons name={isError ? 'error-outline' : 'check-circle'} size={32} color={accent} />
            ) : (
              <>
                <Animated.View style={[styles.spinRing, { borderColor: accent, transform: [{ rotate }] }]} />
                <MaterialIcons name="qr-code-scanner" size={28} color={accent} />
              </>
            )}
          </View>
          <Text style={[styles.title, { color: colors.textDarker }]}>{title}</Text>
          {!isError && !isDone && (
            <Text style={[styles.percent, { color: colors.primary }]}>{Math.round(state.progress)}%</Text>
          )}
          {isError && (
            <Text style={[styles.subtitle, { color: colors.text }]} numberOfLines={4}>
              {state.error || 'Order verification failed, please retry.'}
            </Text>
          )}

          {!isError && (
            <View style={[styles.track, { backgroundColor: colors.border }]}>
              <Animated.View style={[styles.trackFill, { width, backgroundColor: accent }]} />
            </View>
          )}

          <View style={styles.stageList}>
            {STAGES.map((stage, i) => {
              const done = i < current;
              const active = i === current && !isError;
              const failed = isError && i === current;
              const color = failed
                ? colors.primary
                : done
                  ? colors.success
                  : active
                    ? colors.primary
                    : colors.text;
              return (
                <View key={stage.key} style={styles.stageRow}>
                  <View
                    style={[
                      styles.stageDot,
                      done || failed
                        ? { backgroundColor: color }
                        : { borderColor: color, borderWidth: 1.5, opacity: active ? 1 : 0.4 },
                    ]}
                  >
                    {done && <MaterialIcons name="check" size={12} color="#fff" />}
                    {failed && <MaterialIcons name="close" size={12} color="#fff" />}
                  </View>
                  <View style={{ flex: 1, opacity: done || active || failed ? 1 : 0.45 }}>
                    <Text style={[styles.stageLabel, { color: colors.textDarker }]}>
                      {stage.label.replace('…', '')}
                    </Text>
                    <Text style={[styles.stageDetail, { color: colors.text }]}>{stage.detail}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {isError && (
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.secondaryBtn, { borderColor: colors.border }]}
                accessibilityRole="button"
              >
                <Text style={[styles.secondaryText, { color: colors.text }]}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onRetry}
                style={[styles.primaryBtn, { backgroundColor: colors.btnColor }]}
                accessibilityRole="button"
              >
                <MaterialIcons name="qr-code-scanner" size={18} color={colors.btnTextColor} />
                <Text style={[styles.primaryText, { color: colors.btnTextColor }]}>Scan again</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  spinRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  title: { fontSize: 17, fontWeight: '800' },
  percent: { fontSize: 34, fontWeight: '800', marginTop: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 13.5, textAlign: 'center', marginTop: 6, opacity: 0.85, lineHeight: 19 },
  track: { width: '100%', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 16 },
  trackFill: { height: '100%', borderRadius: 4 },
  stageList: { width: '100%', marginTop: 18, gap: 12 },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stageDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageLabel: { fontSize: 13.5, fontWeight: '700' },
  stageDetail: { fontSize: 11.5, opacity: 0.7, marginTop: 1 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' },
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
