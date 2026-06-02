import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Video, ResizeMode } from 'react-native-video';
import { useTheme } from '../context/ThemeContext';
const { width } = Dimensions.get('window');

export const MediaGridItem = ({ post }: { post: any }) => {
  const isVideo = post.media?.mediaType === 'video';
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={styles.mediaGridItem} activeOpacity={0.9}>
      {isVideo ? (
        <Video
          source={{ uri: post.media.url[0] }}
          style={styles.mediaImage}
          resizeMode={ResizeMode.COVER}
          repeat={true}
          paused={false}
          muted={true}
          controls={false}
          playInBackground={false}
          playWhenInactive={false}
        />
      ) : (
        <Image
          source={{ uri: post.media.url[0] }}
          style={styles.mediaImage}
          resizeMode="cover"
        />
      )}

      {isVideo && (
        <View
          style={[
            styles.videoOverlay,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <MaterialIcons
            name="videocam-outlined"
            size={16}
            color={colors.text}
          />
        </View>
      )}
    </TouchableOpacity>
  );
};
const styles = StyleSheet.create({
  mediaGridItem: {
    width: width / 3 - 2,
    height: width / 3 - 2,
    margin: 1,
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 5,
    right: 5,
    borderRadius: 6,
    padding: 5,
  },

  // General Card Styling
  cardContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
});
