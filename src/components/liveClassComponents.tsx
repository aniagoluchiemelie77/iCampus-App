import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  FlatList,
  Animated
} from 'react-native';
import { Modal, Portal } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import {PRIMARY_COLOR, PRIMARY_COLOR_TINT} from '../assets/styles/colors';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { UserIdentity } from './UserIdentity';
import {UserAvatar} from './UserAvatar';
import {RTCView } from 'react-native-webrtc';
import { useTheme } from '../context/ThemeContext';

interface LecturerControlsProps {
  localStream: any;
  isLive: boolean;
  socket: any;
  lectureId: string;
  onMuteAll: () => void;
  wavers: any[];
  onGrantMic: (uid: string) => void;
}
interface GroupToastProps {
  activeUsers: any[];
  onHide: () => void;
}
export const WavingToast = ({ activeUsers, onHide }: GroupToastProps) => {
  const { colors: themeColors } = useTheme();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const userCount = activeUsers.length;
  let displayMessage = '';

  if (userCount === 1) {
    displayMessage = `👋 ${activeUsers[0].firstname} is waving`;
  } else if (userCount === 2) {
    displayMessage = `👋 ${activeUsers[0].firstname} and ${activeUsers[1].firstname} are waving`;
  } else if (userCount > 2) {
    displayMessage = `👋 ${activeUsers[0].firstname} and ${
      userCount - 1
    } others are waving`;
  }

  useEffect(() => {
    if (userCount === 0) return;
    Animated.spring(slideAnim, {
      toValue: 20,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 500,
        useNativeDriver: true,
      }).start(() => onHide());
    }, 6000);

    return () => clearTimeout(timer);
  }, [userCount, onHide, slideAnim]);

  if (userCount === 0) return null;

  return (
    <Animated.View
      style={[
        styles.waveToast,
        { transform: [{ translateY: slideAnim }] },
        { backgroundColor: themeColors.backgroundSecondary },
      ]}
    >
      <Text
        style={[styles.waveText, { color: themeColors.text }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {displayMessage}
      </Text>
    </Animated.View>
  );
};

export const SpeakerToast = ({ activeUsers, onHide }: GroupToastProps) => {
  const { colors: themeColors } = useTheme();
  const slideAnim = useRef(new Animated.Value(-100)).current;

  const userCount = activeUsers.length;
  let displayMessage = '';

  if (userCount === 1) {
    displayMessage = `${activeUsers[0].firstname} is speaking...`;
  } else if (userCount === 2) {
    displayMessage = `${activeUsers[0].firstname} & ${activeUsers[1].firstname} are speaking...`;
  } else if (userCount > 2) {
    displayMessage = `${activeUsers[0].firstname} and ${
      userCount - 1
    } others are speaking...`;
  }

  useEffect(() => {
    if (userCount === 0) return;

    Animated.spring(slideAnim, {
      toValue: 20,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 500,
        useNativeDriver: true,
      }).start(() => onHide());
    }, 5000);

    return () => clearTimeout(timer);
  }, [userCount, onHide, slideAnim]);

  if (userCount === 0) return null;

  return (
    <Animated.View
      style={[
        styles.speakerToast,
        { transform: [{ translateY: slideAnim }] },
        { backgroundColor: themeColors.backgroundSecondary },
      ]}
    >
      <MaterialIcons name="mic" size={18} color={themeColors.primary} />
      <Text
        style={[
          styles.speakerText,
          { color: themeColors.text },
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {displayMessage}
      </Text>
    </Animated.View>
  );
};
const MessageBubble = React.memo(({ msg, isOwnMessage, colors }: any) => (
  <View style={[
    styles.messageBubble,
    isOwnMessage ? styles.myMessage : styles.theirMessage
  ]}>
    {!isOwnMessage && <Text style={[styles.senderName, { color: colors.text }]}>{msg.username}</Text>}
    <Text style={[styles.messageText, { color: isOwnMessage ? colors.btnTextColor : colors.text }]}>
      {msg.text}
    </Text>
  </View>
));
const ChatInput = ({ text, onChangeText, onSend, colors }: any) => (
  <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  >
    <View
      style={[
        styles.chatInputRow,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      <TextInput
        placeholder="Type a message..."
        value={text}
        onChangeText={onChangeText}
        placeholderTextColor={colors.inputTextHolder}
        style={[styles.chatInput, { color: colors.text }]}
        onSubmitEditing={onSend}
      />
      <TouchableOpacity
        onPress={onSend}
        disabled={!text.trim()}
        style={styles.sendBtn}
      >
        <MaterialIcons name="send" color={colors.primary} size={17} />
      </TouchableOpacity>
    </View>
  </KeyboardAvoidingView>
);
const AttendeeRow = React.memo(({ student, isWaving, colors }: any) => (
  <View style={styles.studentRow}>
    <UserAvatar
      profilePic={student.profilePic}
      firstName={student.firstname}
      lastName={student.lastname}
      username={student.username}
      style={styles.attendeesAvatar}
    />
    <View style={styles.studentInfo}>
      <UserIdentity
        firstname={student.firstname!}
        lastname={student.lastname}
        username={student.username}
        tier={student.tier || 'free'}
        isVerified={student.isVerified}
        size="small"
      />
    </View>
    {isWaving && (
      <MaterialIcons
        name="waving-hand-outlined"
        size={22}
        color={colors.primary}
        style={styles.waveIcon}
      />
    )}
  </View>
));
export const LecturerStreamControls = ({
  localStream,
  isLive,
  socket,
  lectureId,
  onMuteAll,
  wavers,
  onGrantMic,
}: LecturerControlsProps) => {
  const { colors: themeColors } = useTheme();
  const [isCameraOff, setIsCameraOff] = useState(false);
  const toggleCamera = () => {
    const newStatus = !isCameraOff;
    setIsCameraOff(newStatus);
    socket.emit('toggle_lecturer_camera', {
      lectureId,
      isCameraOn: !newStatus,
    });
  };
  return (
    <View style={styles.controlWrapper}>
      {localStream ? (
        <RTCView
          streamURL={localStream.toURL()}
          style={[
            styles.previewVideo,
            { backgroundColor: themeColors.backgroundSecondary },
          ]}
          objectFit="cover"
          mirror={true}
        />
      ) : (
        <View style={styles.previewVideo}>
          <MaterialIcons
            name="videocam-off-outlined"
            size={40}
            color={themeColors.primary}
          />
          <Text
            style={[
              styles.previewVideoText,
              { color: themeColors.text },
            ]}
          >
            Camera is Off
          </Text>
        </View>
      )}
      {wavers.length > 0 && (
        <TouchableOpacity
          style={[
            styles.muteAllButton,
            { backgroundColor: themeColors.btnColor },
          ]}
          onPress={() => onGrantMic(wavers[0].uid)}
        >
          <MaterialIcons
            name={'waving-hand-outlined'}
            size={18}
            color={themeColors.btnTextColor}
          />
          <Text
            style={[
              styles.muteAllText,
              { color: themeColors.btnTextColor },
            ]}
          >
            Grant Mic
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[
          styles.muteAllButton,
          { backgroundColor: themeColors.btnColor },
        ]}
        onPress={toggleCamera}
      >
        <MaterialIcons
          name={isCameraOff ? 'videocam-off-outlined' : 'videocam-outlined'}
          size={18}
          color={themeColors.btnTextColor}
        />
        <Text
          style={[
            styles.muteAllText,
            { color: themeColors.btnTextColor },
          ]}
        >
          {isCameraOff ? 'Cam off' : 'Cam on'}
        </Text>
      </TouchableOpacity>
      {isLive && (
        <TouchableOpacity
          style={[
            styles.muteAllButton,
            { backgroundColor: themeColors.btnColor },
          ]}
          onPress={onMuteAll}
        >
          <MaterialIcons
            name="mic-off-outlined"
            color={themeColors.btnTextColor}
            size={18}
          />
          <Text
            style={[
              styles.muteAllText,
              { color: themeColors.btnTextColor },
            ]}
          >
            Mute All
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
export const ChatModal = ({ visible, onDismiss, messages, sendMessage, inputText, setInputText, colors, user }: any) => {
  const scrollViewRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (visible) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages, visible]);

  return (
    <Modal visible={visible} onDismiss={onDismiss} style={styles.bottomOverlay}>
      <View style={[styles.bottomModalContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.chatHeader, { color: colors.textDarker }]}>Live Class Chat</Text>
        
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messageList}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg: any) => (
            <MessageBubble 
              key={msg.id} 
              msg={msg} 
              isOwnMessage={msg.userId === user.uid} 
              colors={colors} 
            />
          ))}
        </ScrollView>

        <ChatInput 
          text={inputText} 
          onChangeText={setInputText} 
          onSend={sendMessage} 
          colors={colors} 
        />
      </View>
    </Modal>
  );
};
export const AttendeeListModal = ({ visible, onDismiss, attendees, wavers, colors }: any) => (
  <Portal>
    <Modal visible={visible} onDismiss={onDismiss} style={styles.bottomOverlay}>
      <View style={[styles.bottomModalContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={styles.modalHandle} />
        <Text style={[styles.attendeeListTitle, { color: colors.textDarker }]}>
          Class Attendees ({attendees.length})
        </Text>
        <FlatList
            data={attendees}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => (
                <AttendeeRow 
                    student={item} 
                    isWaving={wavers.some((w: any) => w.uid === item.uid)} 
                    colors={colors} 
                />
            )}
        />
      </View>
    </Modal>
  </Portal>
);
export const ConfirmationModal = ({
  visible,
  onDismiss,
  onConfirm,
  title,
  subText,
  colors,
}: any) => (
  <Portal>
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      contentContainerStyle={styles.modalOverlay}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <MaterialIcons name="info-outlined" size={50} color={colors.primary} />
        
        <Text style={[styles.modalTitle, { color: colors.textDarker }]}>
          {title}
        </Text>
        
        <Text style={[styles.modalSubText, { color: colors.text }]}>
          {subText}
        </Text>

        <View style={styles.modalButtonRow}>
          <TouchableOpacity onPress={onDismiss} style={[styles.modalButtonRowBtn, { borderColor: colors.primary }]}>
            <Text style={[styles.modalButtonRowBtnText, { color: colors.primary }]}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={onConfirm} style={[styles.modalButtonRowBtn, { backgroundColor: colors.btnColor }]}>
            <Text style={[styles.modalButtonRowBtnText, { color: colors.btnTextColor }]}>End Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  </Portal>
);
const styles = StyleSheet.create({
    messageBubble: {
    padding: 10,
    borderRadius: 12,
    marginVertical: 10,
    maxWidth: '80%',
  },
  myMessage: {
      alignSelf: 'flex-end',
      backgroundColor: PRIMARY_COLOR,
      borderBottomRightRadius: 0,
    },
    theirMessage: {
      alignSelf: 'flex-start',
      borderBottomLeftRadius: 0,
      borderColor: PRIMARY_COLOR_TINT,
      borderWidth: 0.8,
    },
    senderName: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  messageText: { fontSize: 14 },
    bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
    bottomModalContainer: {
    padding: 20,
    width: '100%',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '70%',
    paddingBottom: 40,
    position: 'relative',
  },
   chatHeader: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 15,
  },
  messageList: { flex: 1, paddingBottom: 30 },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  chatInput: {
    flex: 1,
    height: 60,
    fontSize: 14,
  },
    sendBtn: {
    marginHorizontal: 6,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
  },
  attendeesAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
  },
    studentInfo: {
    marginLeft: 15,
    flex: 1,
  },
  waveIcon: {
    marginLeft: 7,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: PRIMARY_COLOR_TINT,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 15,
  },
  attendeeListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  attendeeScrollList: {
    paddingBottom: 20,
  },
  modalContainer: {
    padding: 20,
    borderRadius: 12,
    alignContent: 'center',
    width: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 15,
  },
  modalSubText: {
    fontSize: 14,
    marginBottom: 15,
  },
   modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    alignItems: 'center',
    marginTop: 10,
  },
  modalButtonRowBtn: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    alignContent: 'center',
    borderWidth: 1,
  },
  modalButtonRowBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
    modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignContent: 'center',
  },
   controlWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  previewVideo: {
    position: 'absolute',
    top: 45,
    right: 20,
    width: 70,
    height: 90,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignContent: 'center',
  },
  previewVideoText: {
    fontSize: 12,
    marginTop: 10,
    fontWeight: 'bold',
  },
  overlayBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  muteAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 6,
  },
  muteAllText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  waveText: { fontSize: 14, flex: 1 },
    waveToast: {
    position: 'absolute',
    top: 20,
    right: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    elevation: 5,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    zIndex: 100,
    maxWidth: '70%',
  },
   speakerToast: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    padding: 15,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '70%',
    zIndex: 100,
  },
  speakerText: {
    fontSize: 14,
    marginLeft: 5,
  },
})