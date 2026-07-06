import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { styles } from './TransactionHistory';

export const DropOffStationItem = ({ item }: { item: any }) => (
  <View style={styles.itemCard}>
    <View style={styles.infoRow}>
      <Text style={styles.name}>{item.schoolName}</Text>
      <Text style={styles.code}>{item.schoolCode}</Text>
    </View>
    
    <View style={styles.actionRow}>
      <Text>Avg Score: {item.currentiScoreAvg || 'N/A'}</Text>
      <View style={{ flexDirection: 'row' }}>
        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconBtn}>
          <MaterialIcons name="edit" size={20} color="blue" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconBtn}>
          <MaterialIcons name="delete" size={20} color="red" />
        </TouchableOpacity>
      </View>
    </View>
  </View>
);