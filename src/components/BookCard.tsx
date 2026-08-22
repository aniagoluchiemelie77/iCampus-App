import React from 'react';
import { View, Text, Image } from 'react-native';
import { Book } from '../types/firebase';
import { LibraryScreenStyles } from '../screens/LibraryScreen';
import { useTheme } from '../context/ThemeContext';
import { CustomButton } from '../assets/components/AppUIComponents';

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

        <CustomButton
          title="Download"
          onPress={onDownload}
          iconName="cloud-download"
          iconColor="#fff"
          style={LibraryScreenStyles.downloadBtn}
        />
      </View>
    </View>
  );
};