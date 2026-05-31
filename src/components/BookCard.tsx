import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Book } from 'types/firebase';
import {LibraryScreenStyles} from '../screens/LibraryScreen'
import { useTheme } from 'context/ThemeContext';

export const BookCard = ({
  book,
  onDownload,
}: {
  book: Book;
  onDownload: () => void;
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        LibraryScreenStyles.card,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      <Image
        source={{ uri: book.thumbnail }}
        style={LibraryScreenStyles.cover}
        resizeMode="cover"
      />
      <View style={LibraryScreenStyles.infoContainer}>
        <Text
          style={[LibraryScreenStyles.title, { color: colors.textDarker }]}
          numberOfLines={2}
        >
          {book.title}
        </Text>
        <Text
          style={[LibraryScreenStyles.author, { color: colors.primaryTint }]}
        >
          {book.author}
        </Text>

        <View style={LibraryScreenStyles.metaRow}>
          <View style={LibraryScreenStyles.badge}>
            <Text style={LibraryScreenStyles.badgeText}>
              {book.extension.toUpperCase()}
            </Text>
          </View>
          <Text
            style={[
              LibraryScreenStyles.sizeText,
              { color: colors.primaryTint },
            ]}
          >
            {book.size} • {book.year || 'N/A'}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            LibraryScreenStyles.downloadBtn,
            { backgroundColor: colors.btnColor },
          ]}
          onPress={onDownload}
        >
          <MaterialIcons
            name="cloud-download-outlined"
            size={20}
            color="#FFF"
          />
          <Text
            style={[
              LibraryScreenStyles.downloadText,
              { color: colors.btnTextColor },
            ]}
          >
            Download
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};