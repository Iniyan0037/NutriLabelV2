import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { fetchProductByBarcode } from '../services/api';

export default function ScanScreen({ route, navigation }) {
  const { selectedProfiles = [] } = route.params || {};
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission, requestPermission]);

  const handleBarcodeChange = (value) => setBarcode(value.replace(/[^0-9]/g, ''));

  const handleLookup = async (valueFromScanner = null) => {
    const trimmedBarcode = (valueFromScanner || barcode).trim();
    if (!trimmedBarcode) {
      Alert.alert('Missing Barcode', 'Please enter a barcode.');
      return;
    }
    try {
      setLoading(true);
      const productResult = await fetchProductByBarcode(trimmedBarcode, selectedProfiles);
      if (!productResult || !productResult.analysis) {
        Alert.alert('Lookup Failed', 'The product response was incomplete. Please try another barcode.');
        return;
      }
      if (!productResult.ingredient_text || !productResult.ingredient_text.trim()) {
        Alert.alert('Ingredients Missing', 'This product was found, but its ingredient list is missing in the current database record.');
      }
      navigation.navigate('Results', { result: productResult, selectedProfiles });
    } catch (error) {
      const message = error?.message || '';
      if (message.includes('404')) {
        Alert.alert('Product Not Found', 'No product was found for this barcode.');
      } else if (message.includes('400')) {
        Alert.alert('Invalid Barcode', 'Please enter digits only.');
      } else {
        Alert.alert('Lookup Failed', 'Could not fetch product details. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned || loading) return;
    setScanned(true);
    setShowCamera(false);
    await handleLookup(data);
  };

  const isLookupDisabled = !barcode.trim() || loading;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Barcode Lookup</Text>
      <Text style={styles.subtitle}>Scan a barcode with your camera or enter it manually.</Text>
      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>Selected Profiles:</Text>
        <Text style={styles.summaryText}>{selectedProfiles.length > 0 ? selectedProfiles.join(', ') : 'No profiles selected'}</Text>
      </View>
      <TextInput style={styles.input} placeholder="Example: 3017620422003" value={barcode} onChangeText={handleBarcodeChange} keyboardType="numeric" maxLength={20} />
      <Text style={styles.helperText}>Enter digits only. Barcode lookup uses Open Food Facts plus the NutriLabel rules database.</Text>
      <Pressable style={[styles.primaryButton, isLookupDisabled && styles.disabledButton]} onPress={() => handleLookup()} disabled={isLookupDisabled}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Lookup Product</Text>}
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={() => { setScanned(false); setShowCamera((current) => !current); }}>
        <Text style={styles.secondaryButtonText}>{showCamera ? 'Close Camera Scanner' : 'Open Camera Scanner'}</Text>
      </Pressable>
      {showCamera ? (
        <View style={styles.cameraWrapper}>
          {!permission ? (
            <Text style={styles.cameraText}>Requesting camera permission...</Text>
          ) : !permission.granted ? (
            <>
              <Text style={styles.cameraText}>Camera permission is required to scan barcodes.</Text>
              <Pressable style={styles.secondaryButton} onPress={requestPermission}>
                <Text style={styles.secondaryButtonText}>Grant Permission</Text>
              </Pressable>
            </>
          ) : (
            <>
              <CameraView style={styles.camera} barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'] }} onBarcodeScanned={handleBarCodeScanned} />
              <Text style={styles.cameraHint}>Point the camera at a barcode.</Text>
            </>
          )}
        </View>
      ) : null}
      <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('ManualInput', { selectedProfiles })}>
        <Text style={styles.secondaryButtonText}>Enter Ingredients Manually Instead</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  title: { fontSize: 28, fontWeight: 'bold', marginTop: 20, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 24, color: '#444' },
  summaryBox: { marginBottom: 20, padding: 16, borderRadius: 12, backgroundColor: '#f2f2f2' },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  summaryText: { fontSize: 15, lineHeight: 22 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 12, padding: 16, fontSize: 16, backgroundColor: '#fafafa', marginBottom: 10 },
  helperText: { fontSize: 13, color: '#666', marginBottom: 20 },
  primaryButton: { backgroundColor: '#222', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 14 },
  secondaryButton: { marginTop: 12, borderWidth: 1, borderColor: '#222', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  disabledButton: { backgroundColor: '#9ca3af' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButtonText: { color: '#222', fontSize: 16, fontWeight: '600' },
  cameraWrapper: { marginTop: 16, marginBottom: 8, borderRadius: 16, overflow: 'hidden', backgroundColor: '#f3f4f6' },
  camera: { width: '100%', height: 320 },
  cameraHint: { padding: 12, textAlign: 'center', color: '#444' },
  cameraText: { padding: 20, textAlign: 'center', color: '#444' },
});
