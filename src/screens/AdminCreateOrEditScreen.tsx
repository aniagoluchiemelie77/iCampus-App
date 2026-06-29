import { useAppSelector } from '../hooks/hooks.ts';
import React, { useState} from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  ScrollView,
  Modal,
  StyleSheet
} from 'react-native';
import {AccessDeniedScreen} from '../components/AccessDeniedScreen.tsx';
import {PageHeader} from '../components/PageHeader.tsx';
import {InputGroup} from '../components/InputGroup.tsx';
import {updateAdminApi} from '../api/localPutApis.ts';
import {createAdminApi} from '../api/localPostApis.ts';
import { useFormHydration } from '../hooks/useAdminInputFormHydration.ts';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';


export const RolePicker = ({ value, onSelect }: { value: string, onSelect: (role: string) => void }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const { colors } = useTheme();
  const options = ['moderator', 'support'];

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>Admin Role</Text>
      <TouchableOpacity style={[styles.inputWrapper, { borderColor: colors.border }]} onPress={() => setModalVisible(true)}>
        <Text style={{ color: colors.text }}>{value || 'Select Role'}</Text>
        <MaterialIcons name="arrow-drop-down" size={24} color={colors.text} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary }]}>
            {options.map((role) => (
              <TouchableOpacity key={role} style={styles.option} onPress={() => { onSelect(role); setModalVisible(false); }}>
                <Text style={{ color: colors.text, textTransform: 'capitalize' }}>{role.replace('_', ' ')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};
export const AdminFormPage = ({ route }: { route: any }) => {
    const { colors: themeColors } = useTheme();
  const adminToEdit = route.params?.admin;
  const [formData, setFormData] = useFormHydration({
    firstname: '',
    lastname: '',
    email: '',
    adminType: 'support'
  }, adminToEdit);
  const isEditing = !!adminToEdit;
  const currentUser = useAppSelector((state) => state.admin);
  if (currentUser.adminType !== 'super_admin') {
    return <AccessDeniedScreen reason="Only Super Admins can manage administrative access." />;
  }

  const handleSave = async () => {
    try {
      if (isEditing) await updateAdminApi(adminToEdit.uid, formData);
      else await createAdminApi(formData);
      // Navigation logic here
    } catch (e) {
      // Error already handled in API utility
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <PageHeader 
        title={isEditing ? 'Edit Administrator' : 'Create Administrator'} 
        subtitle={isEditing ? `Managing ${formData.firstname}` : 'Add new system staff'}
      />
      
      <ScrollView style={styles.content}>
        <InputGroup 
          label="First Name" 
          value={formData.firstname} 
          onChangeText={(v) => setFormData({...formData, firstname: v})} 
        />
        <InputGroup 
          label="Last Name" 
          value={formData.lastname} 
          onChangeText={(v) => setFormData({...formData, lastname: v})} 
        />
        <InputGroup 
          label="Email" 
          value={formData.email} 
          isLocked={isEditing} 
          onChangeText={(v) => setFormData({...formData, email: v})} 
        />
          <RolePicker 
  value={formData.adminType} 
  onSelect={(role) => setFormData({...formData, adminType: role})} 
/>
        
        <TouchableOpacity style={[styles.submitBtn, {backgroundColor: themeColors.btnColor}]} onPress={handleSave}>
          <Text style={[styles.btnText, {color: themeColors.btnTextColor}]}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};
const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  label: { fontSize: 14, marginBottom: 8, fontWeight: '600' },
  inputWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderRadius: 8,
  },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { margin: 20, padding: 20, borderRadius: 12 },
  option: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  submitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  btnText: { fontSize: 14, fontWeight: 'bold' },
  content:{paddingBottom: 20}
});