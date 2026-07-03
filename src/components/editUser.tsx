import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, Switch, TouchableOpacity, ActivityIndicator } from 'react-native';
import { InputGroup, InfoListCard } from './InputGroup'; 
import { useTheme } from '../context/ThemeContext';
import { updateAdminUser } from '../api/localPatchApis';
import Toast from 'react-native-toast-message';
import { User } from '../types/firebase';
import Modal from 'react-native-modal';
import { styles } from './LogoutModal';

export interface EditUserModalContentProps {
  user: User;
  visible: boolean;
  onClose: () => void;
  onUserUpdated: (updatedUser: User) => void;
}

export const EditUserModalContent = ({ user, onClose, onUserUpdated, visible } : EditUserModalContentProps) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  
  const initialData = useMemo(() => ({
    firstname: user.firstname || '',
    lastname: user.lastname || '',
    username: user.username || '',
    email: user.email || '',
    bio: user.bio || '',
    pointsBalance: user.pointsBalance || 0,
    pendingSalesBalance: user.pendingSalesBalance || 0,
    tier: user.tier || 'free',
    website: user.website || '',
    headline: user.headline || '',
    department: user.department || '',
    organizationName: user.organizationName || '',
    staffId: user.staffId || '',
    matricNumber: user.matricNumber || '',
    itagusername: user.itagusername || '',
    schoolName: user.schoolName || '',
    country: user.country || '',
    current_level: user.current_level || '',
    isSuspended: user.isSuspended || false,
    twoFactorEnabled: user.twoFactorEnabled || false
  }), [user]);
  const [formData, setFormData] = useState(initialData);

  const handleSave = async () => {
    setLoading(true);
    const result = await updateAdminUser(user.uid, formData);
    setLoading(false);

    if (result.success) {
        Toast.show({
            type: 'sucess',
            text2: 'User updated successfully.'
        })
      onUserUpdated(result.data); 
      onClose(); 
    }
  };
  const hasChanges = useMemo(() => {
  return Object.keys(initialData).some((key) => {
    const typedKey = key as keyof typeof initialData;
    return formData[typedKey] !== initialData[typedKey];
  });
}, [formData, initialData]);
  const isButtonDisabled = loading || !hasChanges;

  return (
    <Modal
          isVisible={visible}
          onBackdropPress={() => onClose()}
          swipeDirection="down"
          onSwipeComplete={() => onClose()}
          style={styles.modalOverride}
        >
          <View style={styles.modalOverlay}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.modalContent,
                { backgroundColor: colors.backgroundSecondary },]}>
      <Text style={[styles.modalTitle, { color: colors.textDarker }]}>
        Edit User Context
      </Text>

      {formData.firstname && (
          <InputGroup
            label="First Name"
            defaultValue={formData.firstname}
            onChangeText={(text) => setFormData({ ...formData, firstname: text })}
          />
      )}
      {formData.lastname && (
          <InputGroup
            label="Last Name"
            defaultValue={formData.lastname}
            onChangeText={(text) => setFormData({ ...formData, lastname: text })}
          />
      )}
      {formData.username && (
          <InputGroup
            label="Username"
            defaultValue={formData.username}
            onChangeText={(text) => setFormData({ ...formData, username: text })}
          />
      )}
      {formData.organizationName && (
        <InputGroup
        label="Organization Name"
        defaultValue={formData.organizationName}
        onChangeText={(text) => setFormData({ ...formData, organizationName: text })}
      />
      )}
      {formData.tier && (
          <InputGroup
            label="User Tier"
            defaultValue={formData.tier}
            isLocked={true}
          />
      )}
      {formData.staffId && (
          <InputGroup
            label="Staff Id"
            defaultValue={formData.staffId}
            onChangeText={(text) => setFormData({ ...formData, staffId: text })}
          />
      )}
      {formData.matricNumber && (
          <InputGroup
            label="Matriculation Number"
            defaultValue={formData.matricNumber}
            onChangeText={(text) => setFormData({ ...formData, matricNumber: text })}
          />
      )}
      {formData.department && (
          <InputGroup
            label="Department"
            defaultValue={formData.department}
            onChangeText={(text) => setFormData({ ...formData, department: text })}
          />
      )}
      {formData.schoolName && (
          <InputGroup
            label="School Name"
            defaultValue={formData.schoolName}
            onChangeText={(text) => setFormData({ ...formData, schoolName: text })}
          />
      )}

      {formData.website && (
          <InputGroup
            label="Website"
            defaultValue={formData.website}
            onChangeText={(text) => setFormData({ ...formData, website: text })}
          />
      )}
      {formData.email && (
        <InputGroup
        label="Email"
        defaultValue={formData.email}
        onChangeText={(text) => setFormData({ ...formData, email: text })}
      />
      )}
      {formData.headline && (
        <InputGroup
        label="Headline"
        defaultValue={formData.headline}
        isLocked={true}
      />
      )}
      {formData.bio && (
        <InputGroup
        label="Bio"
        defaultValue={formData.bio}
        isLocked={true}
      />
      )}
      {formData.country && (
        <InputGroup
        label="Country"
        defaultValue={formData.country}
        isLocked={true}
      />
      )}
      {formData.current_level && (
        <InputGroup
        label="User Current Level"
        defaultValue={formData.current_level}
        onChangeText={(text) => setFormData({ ...formData, current_level: text })}
      />
      )}
      {formData.itagusername && (
        <InputGroup
        label="iTag Username"
        defaultValue={`@${formData.itagusername}`}
        onChangeText={(text) => setFormData({ ...formData, itagusername: text })}
      />
      )}
      {formData.pointsBalance && (
        <InputGroup
        label="iCash Balance"
        defaultValue={formData.pointsBalance?.toString() || '0'}
        isLocked={true}
      />
      )}
      {formData.pendingSalesBalance && (
        <InputGroup
        label="Pending Payout Balance"
        defaultValue={formData.pendingSalesBalance?.toString() || '0'}
        isLocked={true}
      />
      )}
      <View style={styles.toggleDiv}>
        <Text style={[styles.toggleText, { color: colors.text }]}>Toggle Account Suspension</Text>
        <Switch
          value={formData.isSuspended}
          onValueChange={(val) => setFormData({ ...formData, isSuspended: val })}
          trackColor={{ false: colors.border, true: colors.primary }}
        />
      </View>
      <View style={styles.toggleDiv}>
        <Text style={[styles.toggleText, { color: colors.text }]}>Two Factor Authentication</Text>
        <Switch
          value={formData.twoFactorEnabled}
          trackColor={{ false: colors.border, true: colors.primary }}
        />
      </View>
      <InfoListCard
        title="Suspicious Activities"
        iconName="warning"
        data={user.suspiciousActivity}
        emptyText="No suspicious activity recorded."
        renderItem={(item) => (
          <View style={styles.rowBetweenDiv}>
            <Text style={[styles.arrayItemsText, { color: colors.text }]}>{item.type.replace(/_/g, ' ')}</Text>
            <Text style={[styles.dateText, { color: colors.text }]}>
              {new Date(item.timestamp).toLocaleString()}
            </Text>
          </View>
        )}
      />

      <InfoListCard
        title="Recovery Emails"
        iconName="security"
        data={user.recoveryEmails}
        emptyText="No recovery emails set."
        renderItem={(item) => (
          <View style={styles.rowBetweenDiv}>
            <Text style={[styles.arrayItemsText, { color: colors.text }]}>{item.email}</Text>
            <Text style={[styles.dateText, { color: colors.success }]}>
              {item.isVerified ? 'Verified' : 'Pending'}
            </Text>
          </View>
        )}
      />
      <InfoListCard
        title="Phone Numbers"
        iconName="security"
        data={user.phoneNumbers}
        emptyText="No phone numbers set."
        renderItem={(item) => (
          <View style={styles.rowBetweenDiv}>
            <Text style={[styles.arrayItemsText, { color: colors.text }]}>{item.number}</Text>
            <Text style={[styles.dateText, { color: colors.success }]}>
              {item.isVerified ? 'Verified' : 'Pending'}
            </Text>
          </View>
        )}
      />
      <TouchableOpacity 
        style={[styles.fullWidthBtn, { backgroundColor: colors.btnColor }]}
        onPress={handleSave}
        disabled={isButtonDisabled}
      >
        {loading ? <ActivityIndicator color={colors.btnTextColor} size={'small'} /> : <Text style={[styles.fullWidthText, { color: colors.btnTextColor }]}>Save Changes</Text>}
      </TouchableOpacity>
    </ScrollView>
    </View>
    </Modal>
  );
};