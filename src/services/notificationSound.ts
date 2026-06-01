import Sound from 'react-native-sound';

Sound.setCategory('Playback');

export const playNotificationSound = () => {
  const bell = new Sound('ping.mp3', Sound.MAIN_BUNDLE, (error) => {
    if (error) {
      console.log('failed to load the sound', error);
      return;
    }
    bell.play((success) => {
      if (!success) {
        console.log('playback failed due to audio decoding errors');
      }
      bell.release(); 
    });
  });
};