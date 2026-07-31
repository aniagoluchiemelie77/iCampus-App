import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { AdItem } from '../types/firebase'; 
import { deleteAdApi } from '../api/localDeleteApis'; 
import { navigate } from '../context/navigationContext';
import Toast from 'react-native-toast-message';
import { useTheme } from '../context/ThemeContext';
import { useAppSelector } from '../hooks/hooks.ts';

interface AdItemComponentProps {
  item: AdItem;
  onRefresh: () => void;
}

export const AdItemComponent: React.FC<AdItemComponentProps> = ({ item, onRefresh }) => {
    const { colors } = useTheme();
  const [isDeleting, setIsDeleting] = useState(false);
  const currentUser = useAppSelector(state => state.admin);
  const canAct = currentUser.adminType === 'super_admin'

  const handleDeletePress = () => {
    Alert.alert(
      "Delete Advertisement",
      `Are you sure you want to delete the ad from "${item.advertiserName}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: confirmDelete 
        }
      ]
    );
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    const result = await deleteAdApi(item.id);
    setIsDeleting(false);

    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Advertisement deleted successfully.',
      });
      onRefresh();
    } else {
      Toast.show({
        type: 'error',
        text1: 'Deletion Failed',
        text2: result.error,
      });
    }
  };

  const handleEditPress = () => {
    navigate('AdAorE', { item });
  };

  return (
    <View style={[styles.card, {backgroundColor: colors.backgroundSecondary}]}>
      <View style={[styles.mediaContainer, {backgroundColor: colors.primary}]}>
        {item.type === 'video' ? (
          <View style={styles.videoPlaceholder}>
            <MaterialIcons name="videocam-outlined" size={24} color={colors.btnTextColor} />
          </View>
        ) : (
          <Image source={{ uri: item.mediaUrl }} style={styles.thumbnail} />
        )}
      </View>
      <View style={styles.detailsContainer}>
        <View style={styles.advertiserRow}>
          <Image source={{ uri: item.advertiserLogo }} style={styles.logo} />
          <Text style={[styles.advertiserName, {color: colors.text}]} numberOfLines={1} ellipsizeMode='tail'>
            {item.advertiserName}
          </Text>
        </View>
        <Text style={[styles.tagline, {color: colors.text}]}>
          {item.tagline || item.targetUrl || "No tagline provided"}
        </Text>
        {canAct && (
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={handleEditPress}
        >
          <MaterialIcons name="edit" size={20} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={handleDeletePress}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MaterialIcons name="delete" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  mediaContainer: {
    width: 55,
    height: 55,
    borderRadius: 10,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoPlaceholder: {
    flex: 1,
    alignContent: 'center',
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 12,
  },
  advertiserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  logo: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 6,
  },
  advertiserName: {
    fontSize: 14,
    fontWeight: '700',
  },
  tagline: {
    fontSize: 11,
    color: '#6B7280',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
  },
  actionBtn: {
    padding: 10,
    alignContent: 'center',
    marginRight: 6,
  },
});