import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Book } from 'types/firebase';
import {LibraryScreenStyles} from '../screens/LibraryScreen'

export const BookCard = ({ book, onDownload }: { book: Book; onDownload: () => void }) => {
  return (
    <View style={LibraryScreenStyles.card}>
      <Image source={{ uri: book.thumbnail }} style={LibraryScreenStyles.cover} resizeMode="cover" />
      <View style={LibraryScreenStyles.infoContainer}>
        <Text style={LibraryScreenStyles.title} numberOfLines={2}>{book.title}</Text>
        <Text style={LibraryScreenStyles.author}>{book.author}</Text>
        
        <View style={LibraryScreenStyles.metaRow}>
          <View style={LibraryScreenStyles.badge}>
            <Text style={LibraryScreenStyles.badgeText}>{book.extension.toUpperCase()}</Text>
          </View>
          <Text style={LibraryScreenStyles.sizeText}>{book.size} • {book.year || 'N/A'}</Text>
        </View>

        <TouchableOpacity style={LibraryScreenStyles.downloadBtn} onPress={onDownload}>
          <MaterialIcons name="cloud-download" size={20} color="#FFF" />
          <Text style={LibraryScreenStyles.downloadText}>Download</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};