import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { CustomButton } from '../assets/components/AppUIComponents';

interface Props {
  reason?: string;
  title?: string;
  /** MaterialIcons name for the badge, e.g. 'event-busy' for an ended class. */
  icon?: string;
  /** Short hints shown as a checklist under the reason. */
  tips?: string[];
}

export const AccessDeniedScreen = ({
  reason = 'You do not have permission to view this session.',
  title = 'Access denied',
  icon = 'lock-outline',
  tips,
}: Props) => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Home', { activeTab: 'classroom' });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border + '40',
          },
        ]}
      >
        {/* Layered badge: soft halo, then a solid tinted disc */}
        <View style={[styles.halo, { backgroundColor: colors.primary + '0F' }]}>
          <View style={[styles.badge, { backgroundColor: colors.primary + '1F' }]}>
            <MaterialIcons name={icon} size={40} color={colors.primary} />
          </View>
        </View>

        <Text style={[styles.eyebrow, { color: colors.primary }]}>
          RESTRICTED
        </Text>
        <Text style={[styles.title, { color: colors.textDarker }]}>{title}</Text>
        <Text style={[styles.reason, { color: colors.text }]}>{reason}</Text>

        {!!tips?.length && (
          <View style={[styles.tips, { backgroundColor: colors.background }]}>
            {tips.map(tip => (
              <View key={tip} style={styles.tipRow}>
                <MaterialIcons
                  name="check-circle-outline"
                  size={16}
                  color={colors.primary}
                />
                <Text style={[styles.tipText, { color: colors.text }]}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        <CustomButton
          title="Go back"
          iconName="arrow-back"
          onPress={goBack}
          style={styles.button}
        />
        <TouchableOpacity
          onPress={() => navigation.navigate('Home', { activeTab: 'classroom' })}
          style={styles.secondary}
          accessibilityRole="button"
        >
          <Text style={[styles.secondaryText, { color: colors.primary }]}>
            Open my classroom
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 18,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  halo: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginTop: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
    textAlign: 'center',
  },
  reason: {
    fontSize: 14.5,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.85,
  },
  tips: {
    alignSelf: 'stretch',
    borderRadius: 14,
    padding: 12,
    marginTop: 18,
    gap: 8,
  },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 18 },
  button: {
    alignSelf: 'stretch',
    width: 'auto',
    height: 48,
    borderRadius: 24,
    marginTop: 22,
  },
  secondary: { paddingVertical: 12, marginTop: 4 },
  secondaryText: { fontSize: 14, fontWeight: '700' },
});
