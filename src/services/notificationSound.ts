import Sound from 'react-native-sound';

// Enable playback in silence mode (iOS)
Sound.setCategory('Playback');

//Add your ping.mp3 to android/app/src/main/res/raw and add it to your project in Xcode for iOS.
export const playNotificationSound = () => {
  const bell = new Sound('ping.mp3', Sound.MAIN_BUNDLE, (error) => {
    if (error) {
      console.log('failed to load the sound', error);
      return;
    }
    // Play the sound with an optional completion callback
    bell.play((success) => {
      if (!success) {
        console.log('playback failed due to audio decoding errors');
      }
      bell.release(); 
    });
  });
};