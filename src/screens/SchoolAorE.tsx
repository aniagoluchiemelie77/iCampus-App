import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { InputGroup } from '../components/InputGroup'; 
import {updateInstitutionApi} from '../api/localPatchApis';
import{createInstitutionApi} from '../api/localPostApis';
import {RootStackParamList} from '../../App';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import {PageHeader} from '../components/PageHeader';
import { useTheme } from '../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'SchoolAorE'>;
interface InstitutionFormData {
  id?: string;
  name: string;
  contactEmail: string;
  countryCode: string;
  domainWhitelist: string[];
  isOperational: boolean;
  verificationMethod: 'SSO' | 'EXTERNAL_API' | 'SEEDED_DATABASE' | 'EMAIL_ONLY';
  logo: string;
  ssoConfig: {
    provider: 'OIDC' | 'SAML';
    issuerUrl: string;
    clientId: string;
    clientSecret: string;
  };
  externalApiConfig: {
    endpoint: string;
    sharedSecret: string;
    timeoutMs: number;
  };
}
const initialData: InstitutionFormData = {
    id: '',
  name: '',
  contactEmail: '',
  countryCode: 'NG',
  domainWhitelist: [],
  isOperational: false,
  verificationMethod: 'EMAIL_ONLY',
  logo: '',
  ssoConfig: {
    provider: 'OIDC',
    issuerUrl: '',
    clientId: '',
    clientSecret: '',
  },
  externalApiConfig: {
    endpoint: '',
    sharedSecret: '',
    timeoutMs: 5000,
  },
};


export const SchoolAorEScreen = ({ route, navigation }: Props) => {
  const isEdit = !!route.params?.item;
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<InstitutionFormData>(
    route.params?.item || initialData
  );

  const updateField = (key: keyof InstitutionFormData, value: any) => {
  setFormData((prev: InstitutionFormData) => ({ ...prev, [key]: value }));
};
  const handleSave = async () => {
    if (isEdit) {
    const isUnchanged = JSON.stringify(formData) === JSON.stringify(route.params?.item);
    
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
    ? await updateInstitutionApi(formData.id!, formData) 
    : await createInstitutionApi(formData);

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
        title={isEdit ? "Manage Authorized Institution" : 'Create Authorrized Institution'}
    />
      <Text style={[styles.groupTitle, { color: colors.textDarker}]}>General Information</Text>
      <InputGroup label="School Name" defaultValue={formData.name} onChangeText={v => updateField('name', v)} />
      <InputGroup label="Country Code" defaultValue={formData.countryCode} onChangeText={v => updateField('countryCode', v)} />
      <InputGroup label="Contact Email" defaultValue={formData.contactEmail} onChangeText={v => updateField('contactEmail', v)} />
      <InputGroup label="Logo" defaultValue={formData.logo} onChangeText={v => updateField('logo', v)} />
      <InputGroup 
        label="Domain Whitelist (comma separated)" 
        defaultValue={formData.domainWhitelist.join(', ')} 
        onChangeText={v => updateField('domainWhitelist', v.split(',').map(s => s.trim()))} 
      />
      <View style={styles.switchRow}>
        <Text style={[styles.label, {color: colors.text}]}>Is Operational: </Text>
        <Switch 
            value={formData.isOperational} 
            onValueChange={v => updateField('isOperational', v)} 
            trackColor={{ false: colors.primaryTint, true: colors.primary }}
            thumbColor={formData.isOperational ? colors.primary : colors.primaryTint}
            ios_backgroundColor={colors.border} 
        />
      </View>

      <Text style={[styles.groupTitle, { color: colors.textDarker}]}>Verification Settings</Text>
      <RNPickerSelect
        value={formData.verificationMethod}
        onValueChange={(v) => updateField('verificationMethod', v)}
        items={[
          { label: 'Email Only', value: 'EMAIL_ONLY' },
          { label: 'SSO', value: 'SSO' },
          { label: 'External API', value: 'EXTERNAL_API' },
          { label: 'Seeded Database', value: 'SEEDED_DATABASE' },
        ]}
        style={{
        inputIOS: { padding: 12, color: colors.text },
        inputAndroid: { padding: 12, color: colors.text },
        placeholder: { color: colors.inputTextHolder }
      }}
      useNativeAndroidPickerStyle={false}
      />

      {/* 3. Conditional Configs */}
      {formData.verificationMethod === 'SSO' && (
        <View style={{ marginTop: 10 }}>
          <RNPickerSelect
            value={formData.ssoConfig.provider}
            onValueChange={(v) => setFormData(p => ({...p, ssoConfig: {...p.ssoConfig, provider: v}}))}
            items={[{ label: 'OIDC', value: 'OIDC' }, { label: 'SAML', value: 'SAML' }]}
            style={{
        inputIOS: { padding: 12, color: colors.text },
        inputAndroid: { padding: 12, color: colors.text },
        placeholder: { color: colors.inputTextHolder }
      }}
      useNativeAndroidPickerStyle={false}
          />
          <InputGroup label="Issuer URL" defaultValue={formData.ssoConfig.issuerUrl} onChangeText={v => setFormData(p => ({...p, ssoConfig: {...p.ssoConfig, issuerUrl: v}}))} />
          <InputGroup label="Client ID" defaultValue={formData.ssoConfig.clientId} onChangeText={v => setFormData(p => ({...p, ssoConfig: {...p.ssoConfig, clientId: v}}))} />
        </View>
      )}

      {formData.verificationMethod === 'EXTERNAL_API' && (
        <>
          <InputGroup label="API Endpoint" defaultValue={formData.externalApiConfig.endpoint} onChangeText={v => setFormData(p => ({...p, externalApiConfig: {...p.externalApiConfig, endpoint: v}}))} />
          <InputGroup label="Shared Secret" defaultValue={formData.externalApiConfig.sharedSecret} onChangeText={v => setFormData(p => ({...p, externalApiConfig: {...p.externalApiConfig, sharedSecret: v}}))} />
        </>
      )}

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
    switchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
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