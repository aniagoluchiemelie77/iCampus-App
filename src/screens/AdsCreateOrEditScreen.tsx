import { useAppSelector } from '../hooks/hooks.ts';
import React, { useState } from 'react';
import Toast from 'react-native-toast-message';
import {
  View,
  TouchableOpacity,
  Text,
  ScrollView,
  Modal,
  StyleSheet,
} from 'react-native';
import { AccessDeniedScreen } from '../components/AccessDeniedScreen.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { InputGroup } from '../components/InputGroup.tsx';
import { updateAdApi } from '../api/localPatchApis.ts';
import {createAdApi} from '../api/localPostApis.ts';
import { useFormHydration } from '../hooks/useAdminInputFormHydration.ts';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors.ts';

export const AdTypePicker = ({
  value,
  onSelect,
}: {
  value: 'image' | 'video';
  onSelect: (type: 'image' | 'video') => void;
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const { colors } = useTheme();
  const options: ('image' | 'video')[] = ['image', 'video'];

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>Ad Type</Text>
      <TouchableOpacity
        style={[styles.inputWrapper, { borderColor: colors.border }]}
        onPress={() => setModalVisible(true)}
      >
        <Text
          style={[
            styles.dropDownText,
            { color: colors.text, textTransform: 'capitalize' },
          ]}
        >
          {value || 'Select Ad Type'}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={24} color={colors.text} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            {options.map(type => (
              <TouchableOpacity
                key={type}
                style={styles.option}
                onPress={() => {
                  onSelect(type);
                  setModalVisible(false);
                }}
              >
                <Text
                  style={{ color: colors.text, textTransform: 'capitalize' }}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export const AdAorEScreen = ({ route }: { route: any }) => {
  const navigation = useNavigation<any>();
  const { colors: themeColors } = useTheme();
  const [isSaving, setIsSaving] = useState(false);

  const adToEdit = route.params?.item;
  const [formData, setFormData] = useFormHydration(
    {
      type: 'image',
      mediaUrl: '',
      targetUrl: '',
      advertiserLogo: '',
      advertiserName: '',
      tagline: '',
    },
    adToEdit,
  );

  const isEditing = !!adToEdit;
  const currentUser = useAppSelector(state => state.admin);

  if (currentUser.adminType !== 'super_admin') {
    return (
      <AccessDeniedScreen reason="Only Super Admins can manage advertisements." />
    );
  }

  const handleSave = async () => {
    if (
      !formData.mediaUrl ||
      !formData.advertiserName ||
      !formData.advertiserLogo
    ) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2:
          'Please fill out all required fields (Media URL, Advertiser Name, Logo).',
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = isEditing
        ? await updateAdApi(adToEdit.id, formData)
        : await createAdApi(formData);

      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: isEditing
            ? 'Advertisement updated successfully.'
            : 'Advertisement created successfully.',
        });
        navigation.goBack();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Action Failed',
          text2: result.error,
        });
      }
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Network Error',
        text2: 'Check your connection, then retry.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View
      style={[
        styles.mainContainer,
        { backgroundColor: themeColors.background },
      ]}
    >
      <PageHeader
        title={
          isEditing
            ? 'Edit Advertisement Banner'
            : 'Create Advertisement Banner'
        }
        subtitle={
          isEditing
            ? `Managing ${formData.advertiserName}`
            : 'Add a new sponsor slot'
        }
      />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.content}
      >
        <AdTypePicker
          value={formData.type}
          onSelect={type => setFormData({ ...formData, type })}
        />
        <InputGroup
          label="Media URL (Image or Video Link)"
          value={formData.mediaUrl}
          onChangeText={v => setFormData({ ...formData, mediaUrl: v })}
        />
        <InputGroup
          label="Target Link (Redirect URL when clicked)"
          value={formData.targetUrl}
          onChangeText={v => setFormData({ ...formData, targetUrl: v })}
        />
        <InputGroup
          label="Advertiser's Name"
          value={formData.advertiserName}
          onChangeText={v => setFormData({ ...formData, advertiserName: v })}
        />
        <InputGroup
          label="Advertiser Logo URL"
          value={formData.advertiserLogo}
          onChangeText={v => setFormData({ ...formData, advertiserLogo: v })}
        />
        <InputGroup
          label="Tagline (Optional short text)"
          value={formData.tagline}
          onChangeText={v => setFormData({ ...formData, tagline: v })}
        />

        <TouchableOpacity
          style={[
            styles.submitBtn,
            {
              backgroundColor: themeColors.btnColor,
              opacity: isSaving ? 0.6 : 1,
            },
          ]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={[styles.btnText, { color: themeColors.btnTextColor }]}>
            {isSaving ? 'Saving...' : 'Save Advertisement'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 15 },
  mainContainer: { flex: 1, paddingHorizontal: 15 },
  label: { fontSize: 14, marginBottom: 10, fontWeight: '600' },
  inputWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderRadius: 8,
    width: '100%',
  },
  dropDownText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    margin: 0,
    padding: 20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  option: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: PRIMARY_COLOR_TINT,
  },
  scrollContainer: { flex: 1 },
  submitBtn: {
    width: '80%',
    paddingVertical: 14,
    borderRadius: 15,
    alignSelf: 'center',
    marginTop: 20,
  },
  btnText: { fontSize: 14, fontWeight: 'bold' },
  content: { paddingBottom: 20 },
});