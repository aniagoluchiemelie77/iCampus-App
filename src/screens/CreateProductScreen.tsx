import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import DropDownPicker from 'react-native-dropdown-picker';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
interface StepHeaderProps {
  number: number;
  title: string;
  currentStep: number;
  toggleStep: (step: number) => void;
}
const StepHeader = ({
  number,
  title,
  currentStep,
  toggleStep,
}: StepHeaderProps) => (
  <TouchableOpacity
    onPress={() => toggleStep(number)}
    style={[
      styles.stepHeader,
      currentStep === number && styles.activeStepHeader,
    ]}
  >
    <View style={styles.headerLead}>
      <View
        style={[styles.stepBadge, currentStep === number && styles.activeBadge]}
      >
        <Text
          style={[
            styles.stepNumber,
            currentStep === number && styles.activeStepNumber,
          ]}
        >
          {number}
        </Text>
      </View>
      <Text
        style={[
          styles.stepTitle,
          currentStep === number && styles.activeStepTitle,
        ]}
      >
        {title}
      </Text>
    </View>
    <MaterialIcons
      name={
        currentStep === number ? 'keyboard-arrow-up' : 'keyboard-arrow-down'
      }
      size={24}
      color={PRIMARY_COLOR}
    />
  </TouchableOpacity>
);
export const CreateProductScreen = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [productType, setProductType] = useState<
    'physical' | 'course' | 'file'
  >('physical');
  const [nicheOpen, setNicheOpen] = useState(false);
  const [nicheValue, setNicheValue] = useState(null);
  const [nicheItems, setNicheItems] = useState([
    { label: 'Electronics', value: 'Electronics' },
    { label: 'Courses', value: 'Courses' },
    { label: 'Document', value: 'Documents' },
    { label: 'Fashion', value: 'Fashion' },
    { label: 'Stationery', value: 'Stationery' },
    { label: 'Snacks and Deserts', value: 'Snacks and Deserts' },
    { label: 'Food', value: 'Food' },
  ]);

  const toggleStep = (step: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveStep(activeStep === step ? 0 : step);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.mainTitle}>Create New Listing</Text>
      {/* --- STEP 1: GENERAL INFO --- */}
      <View style={styles.card}>
        <StepHeader
          number={1}
          title="General Information"
          currentStep={activeStep}
          toggleStep={toggleStep}
        />
        {activeStep === 1 && (
          <View style={styles.expandedContent}>
            <Text style={styles.label}>Product Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Shoes, bags, wristwatch..."
              placeholderTextColor={PRIMARY_COLOR_TINT}
            />
            <Text style={styles.label}>Product Description</Text>
            <TextInput
              style={styles.bioInput}
              multiline
              placeholder="A brief description of your listing (optional)."
              placeholderTextColor={PRIMARY_COLOR_TINT}
            />
            <Text style={styles.label}>Niche (Category)</Text>
            <View style={{ zIndex: 2000 }}>
              <DropDownPicker
                open={nicheOpen}
                value={nicheValue}
                items={nicheItems}
                setOpen={setNicheOpen}
                setValue={setNicheValue}
                setItems={setNicheItems}
                placeholder="Select a category"
                listMode="SCROLLVIEW"
                style={styles.dropdownPicker}
                dropDownContainerStyle={styles.dropdownList}
                textStyle={styles.dropdownText}
                labelStyle={{ fontWeight: '600', color: PRIMARY_COLOR }}
                placeholderStyle={{ color: PRIMARY_COLOR_TINT }}
              />
            </View>

            <Text style={styles.label}>Price (iCash)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Product Type</Text>
            <View style={styles.typeSelector}>
              {['physical', 'course', 'file'].map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setProductType(t as any)}
                  style={[
                    styles.typeBtn,
                    productType === t && styles.activeTypeBtn,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      productType === t && styles.activeTypeBtnText,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
      {/* --- STEP 2: MEDIA UPLOAD --- */}
      <View style={styles.card}>
        <StepHeader
          number={2}
          title="Media & Photos"
          currentStep={activeStep}
          toggleStep={toggleStep}
        />
        {activeStep === 2 && (
          <View style={styles.expandedContent}>
            <View style={styles.uploadPlaceholder}>
              <MaterialIcons
                name="cloud-upload"
                size={40}
                color={PRIMARY_COLOR_TINT}
              />
              <Text style={styles.uploadText}>Tap to upload images</Text>
            </View>
          </View>
        )}
      </View>
      {/* --- STEP 3: TYPE-SPECIFIC DETAILS --- */}
      <View style={styles.card}>
        <StepHeader
          number={3}
          toggleStep={toggleStep}
          title={`${
            productType.charAt(0).toUpperCase() + productType.slice(1)
          } Details`}
          currentStep={activeStep}
        />
        {activeStep === 3 && (
          <View style={styles.expandedContent}>
            {productType === 'physical' && (
              <View>
                <Text style={styles.label}>Weight (Kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.5"
                  keyboardType="numeric"
                />
                <Text style={styles.label}>Shipping Options</Text>
                {/* Map Gateways here */}
              </View>
            )}
            {productType === 'course' && (
              <View>
                <Text style={styles.label}>Course Instructor IDs</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Separate with commas"
                />
              </View>
            )}
            {productType === 'file' && (
              <View>
                <Text style={styles.label}>File Format</Text>
                <TextInput style={styles.input} placeholder="PDF, ZIP, etc." />
              </View>
            )}
          </View>
        )}
      </View>

      {/* --- STEP 4: AVAILABILITY & STOCK --- */}
      <View style={styles.card}>
        <StepHeader
          number={4}
          toggleStep={toggleStep}
          title="Inventory & Stock"
          currentStep={activeStep}
        />
        {activeStep === 4 && (
          <View style={styles.expandedContent}>
            <Text style={styles.label}>Quantity in Stock</Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              keyboardType="numeric"
            />

            <TouchableOpacity style={styles.submitButton}>
              <Text style={styles.submitButtonText}>Publish Product</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  mainTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  activeStepHeader: { backgroundColor: '#fadccc' },
  headerLead: { flexDirection: 'row', alignItems: 'center' },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activeBadge: { backgroundColor: PRIMARY_COLOR },
  stepNumber: { fontSize: 14, fontWeight: 'bold', color: PRIMARY_COLOR },
  activeStepNumber: { color: '#fff' },
  stepTitle: { fontSize: 14, fontWeight: '600', color: '#222', flex: 1 },
  activeStepTitle: { color: PRIMARY_COLOR },
  expandedContent: {
    padding: 18,
    paddingTop: 0,
    borderTopWidth: 0.8,
    borderTopColor: PRIMARY_COLOR_TINT,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2222',
    marginVertical: 15,
  },
  input: {
    backgroundColor: '#fadccc',
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 8,
    padding: 15,
    fontSize: 14,
  },
  typeSelector: { flexDirection: 'row', marginTop: 5 },
  typeBtn: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginRight: 8,
  },
  activeTypeBtn: { borderColor: PRIMARY_COLOR, backgroundColor: '#F0F7FF' },
  typeBtnText: {
    textTransform: 'capitalize',
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeTypeBtnText: { color: PRIMARY_COLOR },
  uploadPlaceholder: {
    height: 120,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  uploadText: { color: PRIMARY_COLOR_TINT, marginTop: 8, fontSize: 13 },
  submitButton: {
    backgroundColor: PRIMARY_COLOR,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 25,
  },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  bioInput: {
    height: 120,
    backgroundColor: '#fadccc',
    padding: 15,
    textAlignVertical: 'top',
    fontSize: 14,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 8,
  },
  dropdownPicker: {
    backgroundColor: '#fadccc',
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 8,
    borderWidth: 0.8,
    paddingHorizontal: 12,
    minHeight: 50,
  },
  dropdownList: {
    backgroundColor: '#fadccc',
    borderColor: PRIMARY_COLOR_TINT,
    elevation: 5,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownText: {
    fontSize: 14,
    color: '#2222',
  },
});