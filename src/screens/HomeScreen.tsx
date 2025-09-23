import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const HomeScreen = () => {
  const [activeIcon, setActiveIcon] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        <Text style={styles.header}>Welcome Chiemelie, to iCampus</Text>
        {/* You can add welcome text or dashboard content here */}
      </View>

      <View style={styles.iconBar}>
        <TouchableOpacity
          onPress={() => setActiveIcon('home')}
          style={styles.iconItem}
        >
          <Icon
            name="home-outline"
            size={30}
            color={activeIcon === 'home' ? '#021a14' : '#032820'}
          />
          <Text style={styles.iconLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveIcon('classroom')}
          style={styles.iconItem}
        >
          <Icon
            name="school-outline"
            size={30}
            color={activeIcon === 'classroom' ? '#021a14' : '#032820'}
          />
          <Text style={styles.iconLabel}>Classroom</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveIcon('store')}
          style={styles.iconItem}
        >
          <Icon
            name="cart-outline"
            size={30}
            color={activeIcon === 'store' ? '#021a14' : '#032820'}
          />
          <Text style={styles.iconLabel}>Store</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveIcon('profile')}
          style={styles.iconItem}
        >
          <Icon
            name="person-outline"
            size={30}
            color={activeIcon === 'profile' ? '#021a14' : '#032820'}
          />
          <Text style={styles.iconLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    backgroundColor: '#fff', // ✅ replaced 'inherit' with a valid color
  },
  iconItem: {
    alignItems: 'center',
  },
  iconLabel: {
    marginTop: 5,
    fontSize: 11,
    color: '#032820',
  },
  header: {
    marginTop: 5,
    fontSize: 35,
    fontWeight: 700,
    color: '#000',
  },
});

export default HomeScreen;
