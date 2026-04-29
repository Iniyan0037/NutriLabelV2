import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, Alert, SafeAreaView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { fetchProductByBarcode, displayProfile } from '../services/api';
import { getHighContrastPreference, goBackSafely, theme } from '../services/accessibility';

export default function ScanScreen({ route, navigation }) {
  const params = route.params || {};
  const selectedProfiles = params.selectedProfiles || params.profile || [];
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [webScannerActive, setWebScannerActive] = useState(false);
  const [webScannerLoading, setWebScannerLoading] = useState(false);
  const webScannerRef = useRef(null);
  const colors = theme(highContrast);

  useEffect(() => {
    getHighContrastPreference().then(setHighContrast).catch(() => {});
    if (Platform.OS !== 'web' && !permission) requestPermission();
    return () => { if (Platform.OS === 'web') stopWebScanner(); };
  }, [permission, requestPermission]);

  const cleanBarcode = (value) => String(value || '').replace(/[^0-9]/g, '');
  const handleBarcodeChange = (value) => setBarcode(cleanBarcode(value));

  const handleLookup = async (valueFromScanner = null) => {
    const trimmedBarcode = cleanBarcode(valueFromScanner || barcode).trim();
    if (!trimmedBarcode) {
      Alert.alert('Missing Barcode', 'Please enter or scan a barcode.');
      return;
    }
    try {
      setLoading(true);
      const productResult = await fetchProductByBarcode(trimmedBarcode, selectedProfiles);
      if (!productResult?.analysis) {
        Alert.alert('Lookup Failed', 'The product response was incomplete.');
        return;
      }
      if (!productResult.ingredient_text?.trim()) {
        Alert.alert('Ingredients Missing', 'Product found, but ingredient list is missing.');
      }
      navigation.navigate('Results', { result: productResult, selectedProfiles, productName: productResult.product_name, ingredientText: productResult.ingredient_text });
    } catch (error) {
      const msg = error?.message || '';
      if (msg.includes('404')) Alert.alert('Product Not Found', 'No product was found for this barcode.');
      else if (msg.includes('400')) Alert.alert('Invalid Barcode', 'Please enter digits only.');
      else Alert.alert('Lookup Failed', 'Could not fetch product details.');
    } finally { setLoading(false); }
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned || loading) return;
    const detected = cleanBarcode(data);
    if (!detected) return;
    setScanned(true);
    setShowCamera(false);
    setBarcode(detected);
    await handleLookup(detected);
  };

  const stopWebScanner = async () => {
    try {
      if (webScannerRef.current) {
        try { await webScannerRef.current.stop(); } catch {}
        try { await webScannerRef.current.clear(); } catch {}
        webScannerRef.current = null;
      }
    } finally {
      setWebScannerActive(false);
      setWebScannerLoading(false);
    }
  };

  const startWebScanner = async () => {
    if (Platform.OS !== 'web') return;
    try {
      setWebScannerLoading(true);
      const { Html5Qrcode } = await import('html5-qrcode');
      await stopWebScanner();
      const scanner = new Html5Qrcode('web-barcode-reader');
      webScannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 300, height: 180 }, aspectRatio: 1.777 },
        async (decodedText) => {
          const detected = cleanBarcode(decodedText);
          if (!detected || loading) return;
          await stopWebScanner();
          setBarcode(detected);
          await handleLookup(detected);
        },
        () => {}
      );
      setWebScannerActive(true);
    } catch {
      Alert.alert('Web Scanner Failed', 'Allow camera permission or type the barcode manually.');
      await stopWebScanner();
    } finally { setWebScannerLoading(false); }
  };

  const scanBarcodeFromImage = async () => {
    if (Platform.OS !== 'web') return;
    try {
      const pickerResult = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: false });
      if (pickerResult.canceled) return;
      const asset = pickerResult.assets[0];
      if (!asset?.file) {
        Alert.alert('Upload Failed', 'Could not read the uploaded image file.');
        return;
      }
      setWebScannerLoading(true);
      const { Html5Qrcode } = await import('html5-qrcode');
      const fileScanner = new Html5Qrcode('web-barcode-file-reader');
      const decodedText = await fileScanner.scanFile(asset.file, true);
      await fileScanner.clear();
      const detected = cleanBarcode(decodedText);
      if (!detected) {
        Alert.alert('Barcode Not Found', 'No numeric barcode was detected.');
        return;
      }
      setBarcode(detected);
      await handleLookup(detected);
    } catch {
      Alert.alert('Barcode Image Failed', 'Try a clearer image or type barcode manually.');
    } finally { setWebScannerLoading(false); }
  };

  const isLookupDisabled = !barcode.trim() || loading;

  return (
    <LinearGradient colors={colors.gradient} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => goBackSafely(navigation, 'Home')} accessibilityRole="button" accessibilityLabel="Back">
              <Ionicons name="arrow-back" size={26} color={colors.secondary} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Barcode Lookup</Text>
            <View style={{ width: 26 }} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Scan or Enter Barcode</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Lookup products using Open Food Facts and NutriLabel analysis.</Text>

          <View style={[styles.profileBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.boxTitle, { color: colors.text }]}>Active Profiles</Text>
            <View style={styles.tagsWrap}>{selectedProfiles.length ? selectedProfiles.map((profile) => <View key={profile} style={[styles.tag, { backgroundColor: colors.card2, borderColor: colors.primary }]}><Text style={[styles.tagText, { color: colors.text }]}>{displayProfile(profile)}</Text></View>) : <Text style={[styles.helper, { color: colors.muted }]}>No profiles selected</Text>}</View>
          </View>

          <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: barcode ? colors.primary : colors.border, color: colors.text }]} placeholder="Example: 3017620422003" placeholderTextColor={colors.muted} value={barcode} onChangeText={handleBarcodeChange} keyboardType="numeric" maxLength={20} accessibilityLabel="Barcode input" />
          <Text style={[styles.helper, { color: colors.muted }]}>Enter digits only.</Text>

          <Pressable style={[styles.primaryButton, { backgroundColor: isLookupDisabled ? '#9E9E9E' : colors.primary }]} onPress={() => handleLookup()} disabled={isLookupDisabled} accessibilityRole="button" accessibilityLabel="Lookup product">
            {loading ? <ActivityIndicator color={colors.primaryText} /> : <Text style={[styles.primaryText, { color: colors.primaryText }]}>Lookup Product</Text>}
          </Pressable>

          {Platform.OS === 'web' ? (
            <>
              <Pressable style={[styles.secondaryButton, { borderColor: colors.primary, backgroundColor: colors.card }]} onPress={webScannerActive ? stopWebScanner : startWebScanner} disabled={loading || webScannerLoading} accessibilityRole="button" accessibilityLabel={webScannerActive ? 'Close browser scanner' : 'Open browser barcode scanner'}>
                {webScannerLoading ? <ActivityIndicator color={colors.primary} /> : <Text style={[styles.secondaryText, { color: colors.secondary }]}>{webScannerActive ? 'Close Browser Scanner' : 'Open Browser Barcode Scanner'}</Text>}
              </Pressable>
              <Pressable style={[styles.secondaryButton, { borderColor: colors.primary, backgroundColor: colors.card }]} onPress={scanBarcodeFromImage} disabled={loading || webScannerLoading} accessibilityRole="button" accessibilityLabel="Upload barcode image"><Text style={[styles.secondaryText, { color: colors.secondary }]}>Upload Barcode Image</Text></Pressable>
              <View style={[styles.webScannerBox, { backgroundColor: colors.card2, borderColor: colors.border }]}><View nativeID="web-barcode-reader" style={styles.webScannerReader} /><View nativeID="web-barcode-file-reader" style={styles.hiddenReader} /></View>
            </>
          ) : (
            <>
              <Pressable style={[styles.secondaryButton, { borderColor: colors.primary, backgroundColor: colors.card }]} onPress={() => { setScanned(false); setShowCamera((current) => !current); }} disabled={loading} accessibilityRole="button" accessibilityLabel={showCamera ? 'Close camera scanner' : 'Open camera scanner'}><Text style={[styles.secondaryText, { color: colors.secondary }]}>{showCamera ? 'Close Camera Scanner' : 'Open Camera Scanner'}</Text></Pressable>
              {showCamera ? <View style={[styles.cameraWrapper, { backgroundColor: colors.card2, borderColor: colors.border }]}>{!permission ? <Text style={[styles.helper, { color: colors.muted }]}>Requesting camera permission...</Text> : !permission.granted ? <><Text style={[styles.helper, { color: colors.muted }]}>Camera permission is required.</Text><Pressable style={[styles.secondaryButton, { borderColor: colors.primary }]} onPress={requestPermission}><Text style={[styles.secondaryText, { color: colors.secondary }]}>Grant Permission</Text></Pressable></> : <><CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'] }} onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} /><Text style={[styles.helper, { color: colors.muted }]}>Point camera at a barcode.</Text></>}</View> : null}
            </>
          )}

          <Pressable style={[styles.secondaryButton, { borderColor: colors.primary, backgroundColor: colors.card }]} onPress={() => navigation.navigate('ManualInput', { selectedProfiles })} disabled={loading}><Text style={[styles.secondaryText, { color: colors.secondary }]}>Enter Ingredients Manually Instead</Text></Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '900' },
  title: { fontSize: 30, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
  profileBox: { borderRadius: 18, padding: 16, borderWidth: 1, marginBottom: 16 },
  boxTitle: { fontWeight: '900', marginBottom: 10 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  tagText: { fontWeight: '800', fontSize: 12 },
  input: { borderWidth: 2, borderRadius: 16, padding: 16, fontSize: 16 },
  helper: { marginTop: 8, marginBottom: 12, lineHeight: 20, textAlign: 'center' },
  primaryButton: { marginTop: 12, paddingVertical: 17, borderRadius: 18, alignItems: 'center' },
  primaryText: { fontWeight: '900', fontSize: 16 },
  secondaryButton: { marginTop: 12, borderWidth: 2, paddingVertical: 15, borderRadius: 18, alignItems: 'center' },
  secondaryText: { fontWeight: '900' },
  webScannerBox: { marginTop: 16, marginBottom: 8, borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  webScannerReader: { width: '100%', minHeight: 320 },
  hiddenReader: { height: 1, opacity: 0 },
  cameraWrapper: { marginTop: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  camera: { width: '100%', height: 320 },
});
