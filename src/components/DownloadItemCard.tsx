import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Product } from '../types/firebase'; 

interface DownloadItemCardProps {
  product: Product;
  onPress?: () => void;
}

export const DownloadItemCard: React.FC<DownloadItemCardProps> = ({ product, onPress }) => {
  const isCourse = product.type === 'course';
  const isFile = product.type === 'file';

  // Determine the display metadata
  const getSubtext = () => {
    if (isCourse) return `${product.courseDetails?.duration || 0} mins • Course`;
    if (isFile) return `${product.fileDetails?.fileSizeInMB || 0} MB • ${product.fileDetails?.fileFormat || 'File'}`;
    return product.category;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Thumbnail with Type Overlay */}
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: product.mediaUrls[0] || 'https://via.placeholder.com/150' }} 
          style={styles.thumbnail} 
        />
        <View style={styles.typeBadge}>
          <MaterialIcons 
            name={isCourse ? "play-circle-filled" : "insert-drive-file"} 
            size={16} 
            color="#FFF" 
          />
        </View>
      </View>

      {/* Product Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>
        <Text style={styles.subtitle}>{getSubtext()}</Text>
        
        {/* Progress bar (Visual flourish for Udemy style) */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: isCourse ? '30%' : '100%' }]} />
        </View>
      </View>

      <TouchableOpacity style={styles.actionBtn}>
        <MaterialIcons name="more-vert" size={24} color="#999" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  imageContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  typeBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 2,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  info: {
    flex: 1,
    marginLeft: 15,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
    marginBottom: 8,
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#EEEEEE',
    borderRadius: 2,
    width: '90%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  actionBtn: {
    padding: 5,
  },
});