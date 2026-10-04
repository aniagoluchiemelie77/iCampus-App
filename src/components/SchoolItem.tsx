import { Image, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { iCampusOperationalInstitutionSchema } from '../types/firebase';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { useAppSelector } from '../hooks/hooks';
import { ActionModal } from './LogoutModal.tsx';
import { useState } from 'react';
import Toast from 'react-native-toast-message';

export const SchoolItem = ({
  item,
  onDelete,
  onEdit,
}: {
  item: iCampusOperationalInstitutionSchema;
  onDelete: (id: string) => void;
  onEdit: (item: iCampusOperationalInstitutionSchema) => void;
}) => {
  const { colors } = useTheme();
  const admin = useAppSelector(state => state.admin);
  const isSuperAdmin = admin.adminType === 'super_admin';
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<{
    id: string;
    schoolName: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const handleDeletePress = () => {
    if (!item?.id) return;

    setSelectedInstitution({
      id: item.id,
      schoolName: item.schoolName ?? '',
    });
    setDeleteModalVisible(true);
  };
  const confirmDelete = async () => {
    if (!selectedInstitution?.id) return;

    try {
      setIsDeleting(true);
      onDelete(selectedInstitution.id);
      setIsDeleting(false);

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Institution deleted successfully.',
      });
    } catch (error: any) {
      setIsDeleting(false);
      Toast.show({
        type: 'error',
        text1: 'Deletion Failed',
        text2: error?.message || 'Failed to delete institution.',
      });
    }
  };
  return (
    <View
      style={[styles.itemCard, { backgroundColor: colors.backgroundSecondary }]}
    >
      <View style={styles.togActionCard}>
        <Image source={{ uri: item.logo }} style={styles.logo} />
        <View style={styles.sideDiv}>
          <Text style={[styles.name, { color: colors.textDarker }]}>
            {item.schoolName}
          </Text>
          <View style={styles.sideBySide}>
            <Text style={[styles.email, { color: colors.text }]}>
              {item.contactEmail}
            </Text>
            <Text style={[styles.date, { color: colors.text }]}>
              Joined:{' '}
              {item.createdAt
                ? new Date(item.createdAt).toLocaleDateString()
                : 'N/A'}
            </Text>
          </View>
        </View>
      </View>
      {isSuperAdmin && (
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => onEdit(item)} style={styles.iconBtn}>
            <MaterialIcons
              name="edit"
              size={24}
              color={colors.primary}
              style={{ padding: 10 }}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeletePress} style={styles.iconBtn}>
            <MaterialIcons
              name="delete"
              size={24}
              color={colors.primary}
              style={{ padding: 10 }}
            />
          </TouchableOpacity>
        </View>
      )}
      <ActionModal
        visible={deleteModalVisible}
        onClose={() => {
          if (!isDeleting) {
            setDeleteModalVisible(false);
            setSelectedInstitution(null);
          }
        }}
        onContinue={confirmDelete}
        title="Delete Institution?"
        subtitle={`Are you sure you want to delete the institution from "${selectedInstitution?.schoolName}"? This action cannot be undone.`}
        continueText="Delete"
        loading={isDeleting}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  itemCard: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  togActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  sideDiv: {
    marginLeft: 10,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  sideBySide: { flexDirection: 'row', justifyContent: 'space-between' },
  email: {
    fontSize: 14,
  },
  date: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
  },
  iconBtn: {
    marginRight: 12,
    padding: 10,
  },
});
