import React from 'react';
import {
  View,
  Text,
  StyleSheet
} from 'react-native';
import Video from 'react-native-video';
import { ProgressBar } from 'react-native-paper';
//import {useLiveSession} from '../hooks/useLiveSession';
//import {baseUrl} from '../components/HomeScreenComponents';
export const LiveVideoPlayer = ({ url }: { url: string }) => {
  return (
    <View style={styles.container}>
      <Video
        source={{ uri: url }} 
        style={styles.fullScreen}
        controls={true}
        resizeMode="contain"
        paused={false}
        playInBackground={false}
        onError={(e) => console.log("Streaming Error:", e)}
      />
    </View>
  );
};
const AttendanceIndicator = ({ checks }: { checks: boolean[] }) => (
  <View style={styles.checkRow}>
    {checks.map((passed, index) => (
      <View 
        key={index} 
        style={[styles.dot, passed ? styles.passed : styles.pending]} 
      />
    ))}
    <Text style={styles.dotCount}>{checks.filter(c => c).length}/7</Text>
  </View>
);
export const StudentLiveClassSession = ({ lecture, checks, hasException }: any) => {
  const passedChecks = checks.filter((c: boolean) => c).length;
  // Logic: Requirement is now 5/7 + being there at the very end
  const isEndCheckPassed = checks[6];
  const isAttendanceValid = hasException || (passedChecks >= 5 && isEndCheckPassed);

  return (
    <View style={styles.container}>
      <LiveVideoPlayer url={lecture.location} />
      
      {/* Attendance Status Bar */}
      <View style={styles.attendanceTracker}>
        <Text style={styles.statusText}>
          {hasException 
            ? "✅ Attendance Excused" 
            : `Attendance Progress: ${passedChecks}/7`}
        </Text>
        
        {/* Visual Dot Indicator */}
        <AttendanceIndicator checks={checks} />

        <ProgressBar 
          progress={passedChecks / 7} 
          color={isAttendanceValid ? '#4CAF50' : '#FF9800'} 
        />

        {/* Dynamic Warning Label */}
        {!isEndCheckPassed && !hasException && (
          <Text style={styles.warning}>
            ⚠️ You must be present for the final check to qualify.
          </Text>
        )}
        
        {isAttendanceValid && !hasException && (
          <Text style={styles.success}>
            🎉 Attendance threshold met! Stay tuned.
          </Text>
        )}
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
    paddingHorizontal: 5,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  passed: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  pending: {
    backgroundColor: '#f0f0f0',
  },
  warning: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'center',
  },
  success: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'center',
  },
  container: {
    width: '100%',
    height: 250,
    backgroundColor: '#000',
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  attendanceTracker: { padding: 20, backgroundColor: '#fff' },
  statusText: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  dotCount: { marginLeft: 10, fontSize: 12, color: '#666' },
});