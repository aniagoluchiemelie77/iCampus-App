import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { InputGroup } from '../components/InputGroup'; 
import {updateStationApi} from '../api/localPatchApis';
import{createStationApi} from '../api/localPostApis';
import {RootStackParamList} from '../../App';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import {PageHeader} from '../components/PageHeader';
import { useTheme } from '../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'StationAorEScreen'>;
interface StationFormData {
  id?: string;
  name: string;
  address: string;
  contactPerson: string;
  latitude: string;
  longitude: string;
  agentId: string;
  images: string[];
}
const initialData: StationFormData = {
    id: '',
  name: '',
  address: '',
  contactPerson: '',
  latitude: '',
  longitude: '',
  agentId: '',
  images: [],
};


export const StationAorEScreen = ({ route, navigation }: Props) => {
  const isEdit = !!route.params?.station;
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<StationFormData>(
    route.params?.station || initialData
  );

  const updateField = (key: keyof StationFormData, value: any) => {
  setFormData((prev: StationFormData) => ({ ...prev, [key]: value }));
};
  const handleSave = async () => {
    if (isEdit) {
    const isUnchanged = JSON.stringify(formData) === JSON.stringify(route.params?.station);
    
    if (isUnchanged) {
      Toast.show({
        type: 'info',
        text1: 'No Changes',
        text2: 'You haven\'t modified any fields.',
      });
      return; 
    }
  }
  setLoading(true);
  const result = isEdit 
    ? await updateStationApi(formData.id!, formData) 
    : await createStationApi(formData);

  setLoading(false);
  
  if (result.success) {
    Toast.show({ type: 'success', text1: 'Success', text2: 'Saved successfully.' });
    navigation.goBack();
  } else {
    Toast.show({ type: 'error', text1: 'Error', text2: result.error || 'Failed to save.' });
  }
};

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title={isEdit ? "Manage Authorized Drop Off Station" : 'Create Authorrized Drop Off Station'}
    />
      <Text style={[styles.groupTitle, { color: colors.textDarker}]}>General Information</Text>
      <InputGroup label="Station Name" defaultValue={formData.name} onChangeText={v => updateField('name', v)} />
      <InputGroup label="Address" defaultValue={formData.address} onChangeText={v => updateField('address', v)} />
      <InputGroup label="Contact Phone Number" defaultValue={formData.contactPerson} onChangeText={v => updateField('contactPerson', v)} />
      <InputGroup 
        label="Station Imaes (comma separated)" 
        defaultValue={formData.images.join(', ')} 
        onChangeText={v => updateField('images', v.split(',').map(s => s.trim()))} 
      />

      <Text style={[styles.groupTitle, { color: colors.textDarker}]}>Verification Settings</Text>
      <InputGroup label="Latitude" defaultValue={formData.latitude} onChangeText={v => updateField('latitude', v)} />
      <InputGroup label="Longitude" defaultValue={formData.longitude} onChangeText={v => updateField('longitude', v)} />
      <InputGroup label="Agent's iCampus ID" defaultValue={formData.agentId} onChangeText={v => updateField('agentId', v)} />

      <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, {backgroundColor: colors.btnColor}]} disabled={loading}>
        <Text style={[styles.saveBtnText, { color: colors.btnTextColor}]}>{loading ? "Saving..." : 'Save Configuration'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 15,
        paddingBottom: 40
    },
    groupTitle: { fontWeight: 'bold', fontSize: 18, marginVertical: 15 },
    label: {
        fontSize: 14
    },
    saveBtn: {
        width: '80%',
        alignSelf: 'center',
        paddingVertical: 15,
        borderRadius: 15,
        alignContent: 'center'
    },
    saveBtnText: { fontSize: 14, fontWeight: 'bold' }
})