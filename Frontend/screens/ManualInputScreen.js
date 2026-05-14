import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { analyzeIngredients, uploadImageForOCR, displayProfile } from '../services/api';
import { getHighContrastPreference, goBackSafely, theme } from '../services/accessibility';

export default function ManualInputScreen({ route, navigation }) {
  const params = route.params || {};
  const selectedProfiles = params.selectedProfiles || params.profile || [];
  const [ingredientText, setIngredientText] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrMode, setOcrMode] = useState(null);
  const [highContrast, setHighContrast] = useState(false);
  const colors = theme(highContrast);
  const webStreamRef = useRef(null);
  const webVideoRef = useRef(null);
  const [webCameraActive, setWebCameraActive] = useState(false);

  useEffect(() => {
    getHighContrastPreference().then(setHighContrast).catch(() => {});
    return () => stopWebCamera();
  }, []);

  const handleAnalyze = async () => {
    if (!ingredientText.trim()) {
      Alert.alert('Missing Input', 'Please enter ingredient text before analysing.');
      return;
    }
    try {
      setLoading(true);
      const result = await analyzeIngredients(ingredientText.trim(), selectedProfiles);
      navigation.navigate('Results', { apiResult: result, selectedProfiles, ingredientText: ingredientText.trim() });
    } catch (error) {
      Alert.alert('Analysis Failed', error.message || 'Could not analyse ingredients.');
    } finally {
      setLoading(false);
    }
  };

  const compressImageForOCR = async (asset) => {
    if (Platform.OS === 'web') return asset;
    const manipulated = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width: 700 } }], { compress: 0.2, format: ImageManipulator.SaveFormat.JPEG, base64: false });
    return { uri: manipulated.uri, fileName: 'ingredients.jpg', mimeType: 'image/jpeg' };
  };

  const processOCRImage = async (imageSource) => {
    const response = await uploadImageForOCR(imageSource);
    const extractedText = response.ingredient_text || response.text || response.extracted_text || response.raw_text || '';
    if (extractedText.trim()) setIngredientText(extractedText);
    Alert.alert('OCR Complete', 'Ingredient text has been extracted. Please review it before analysing.');
  };

  const handleImageSelection = async (mode) => {
    try {
      const permission = mode === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', mode === 'camera' ? 'Camera permission is required.' : 'Photo library permission is required.');
        return;
      }
      const pickerResult = mode === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.25, allowsEditing: true, aspect: [4, 3] })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: Platform.OS === 'web' ? 1 : 0.4, allowsEditing: true });
      if (pickerResult.canceled) return;
      setOcrMode(mode);
      const preparedImage = await compressImageForOCR(pickerResult.assets[0]);
      await processOCRImage(preparedImage);
    } catch (error) {
      Alert.alert('OCR Failed', error.message || 'Could not extract text from the image.');
    } finally {
      setOcrMode(null);
    }
  };

  const stopWebCamera = () => {
    if (webStreamRef.current) {
      webStreamRef.current.getTracks().forEach((track) => track.stop());
      webStreamRef.current = null;
    }
    if (Platform.OS === 'web') {
      const container = document.getElementById('web-ocr-camera-container');
      if (container) container.innerHTML = '';
    }
    webVideoRef.current = null;
    setWebCameraActive(false);
  };

  const startWebCamera = async () => {
    if (Platform.OS !== 'web') return;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        Alert.alert('Camera Not Supported', 'Please upload an image instead.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      webStreamRef.current = stream;
      setWebCameraActive(true);
      setTimeout(() => {
        const container = document.getElementById('web-ocr-camera-container');
        if (!container) return;
        container.innerHTML = '';
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.style.width = '100%';
        video.style.maxHeight = '360px';
        video.style.borderRadius = '14px';
        video.style.backgroundColor = '#111';
        container.appendChild(video);
        webVideoRef.current = video;
      }, 100);
    } catch {
      Alert.alert('Camera Failed', 'Please allow camera permission or upload an image instead.');
      stopWebCamera();
    }
  };

  const captureWebCameraImage = async () => {
    try {
      if (!webVideoRef.current) {
        Alert.alert('Camera Not Ready', 'Please wait for camera preview to load.');
        return;
      }
      setOcrMode('web-camera');
      const video = webVideoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
      const file = new File([blob], 'ingredients-camera.jpg', { type: 'image/jpeg' });
      await processOCRImage({ file });
      stopWebCamera();
    } catch (error) {
      Alert.alert('Capture Failed', error.message || 'Could not capture image.');
    } finally {
      setOcrMode(null);
    }
  };

  const hasText = ingredientText.trim().length > 0;

  return (
    <LinearGradient colors={colors.gradient} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => goBackSafely(navigation, 'Home')} accessibilityRole="button" accessibilityLabel="Back">
              <Ionicons name="arrow-back" size={26} color={colors.secondary} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Manual Input</Text>
            <View style={{ width: 26 }} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Enter Ingredients</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Type ingredients manually or extract them from an image.</Text>

          <View style={[styles.profileBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.boxTitle, { color: colors.text }]}>Active Profiles</Text>
            <View style={styles.tagsWrap}>{selectedProfiles.length ? selectedProfiles.map((profile) => <View key={profile} style={[styles.tag, { backgroundColor: colors.card2, borderColor: colors.primary }]}><Text style={[styles.tagText, { color: colors.text }]}>{displayProfile(profile)}</Text></View>) : <Text style={[styles.helper, { color: colors.muted }]}>No profiles selected</Text>}</View>
          </View>

          <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: hasText ? colors.primary : colors.border, color: colors.text }]} value={ingredientText} onChangeText={setIngredientText} placeholder="Example: milk, sugar, soy lecithin" placeholderTextColor={colors.muted} multiline textAlignVertical="top" accessibilityLabel="Ingredient text input" />
          <Text style={[styles.helper, { color: colors.muted }]}>Review OCR text before analysing.</Text>

          {Platform.OS === 'web' ? (
            <>
              <Pressable style={[styles.secondaryButton, { borderColor: colors.primary, backgroundColor: colors.card }]} onPress={() => handleImageSelection('gallery')} disabled={Boolean(ocrMode)} accessibilityRole="button" accessibilityLabel="Upload image for OCR">
                {ocrMode === 'gallery' ? <ActivityIndicator color={colors.primary} /> : <><Ionicons name="image" size={22} color={colors.primary} /><Text style={[styles.secondaryText, { color: colors.secondary }]}>Upload Image for OCR</Text></>}
              </Pressable>
              <Pressable style={[styles.secondaryButton, { borderColor: colors.primary, backgroundColor: colors.card }]} onPress={webCameraActive ? stopWebCamera : startWebCamera} accessibilityRole="button" accessibilityLabel={webCameraActive ? 'Close browser camera' : 'Use browser camera for OCR'}>
                <Ionicons name={webCameraActive ? 'close-circle' : 'camera'} size={22} color={colors.primary} /><Text style={[styles.secondaryText, { color: colors.secondary }]}>{webCameraActive ? 'Close Browser Camera' : 'Use Browser Camera for OCR'}</Text>
              </Pressable>
              {webCameraActive ? <View style={[styles.webCameraBox, { backgroundColor: colors.card2, borderColor: colors.border }]}><View nativeID="web-ocr-camera-container" style={styles.webCameraContainer} /><Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={captureWebCameraImage}><Text style={[styles.primaryText, { color: colors.primaryText }]}>Capture Image for OCR</Text></Pressable></View> : null}
            </>
          ) : (
            <>
              <Pressable style={[styles.secondaryButton, { borderColor: colors.primary, backgroundColor: colors.card }]} onPress={() => handleImageSelection('camera')} disabled={Boolean(ocrMode)}><Ionicons name="camera" size={22} color={colors.primary} /><Text style={[styles.secondaryText, { color: colors.secondary }]}>Take Photo for OCR</Text></Pressable>
              <Pressable style={[styles.secondaryButton, { borderColor: colors.primary, backgroundColor: colors.card }]} onPress={() => handleImageSelection('gallery')} disabled={Boolean(ocrMode)}><Ionicons name="image" size={22} color={colors.primary} /><Text style={[styles.secondaryText, { color: colors.secondary }]}>Choose Image from Gallery</Text></Pressable>
            </>
          )}

          <Pressable style={[styles.primaryButton, { backgroundColor: hasText && !loading ? colors.primary : '#9E9E9E' }]} onPress={handleAnalyze} disabled={!hasText || loading || Boolean(ocrMode)} accessibilityRole="button" accessibilityLabel="Analyse ingredients">
            {loading ? <ActivityIndicator color={colors.primaryText} /> : <Text style={[styles.primaryText, { color: colors.primaryText }]}>Analyse Ingredients</Text>}
          </Pressable>
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
  input: { minHeight: 180, borderWidth: 2, borderRadius: 16, padding: 16, fontSize: 16 },
  helper: { marginTop: 8, marginBottom: 12, lineHeight: 20 },
  secondaryButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 12, borderWidth: 2, paddingVertical: 15, borderRadius: 18 },
  secondaryText: { fontWeight: '900' },
  primaryButton: { marginTop: 18, paddingVertical: 17, borderRadius: 18, alignItems: 'center' },
  primaryText: { fontWeight: '900', fontSize: 16 },
  webCameraBox: { marginTop: 16, padding: 12, borderRadius: 16, borderWidth: 1 },
  webCameraContainer: { width: '100%', minHeight: 280, borderRadius: 14, overflow: 'hidden', backgroundColor: '#111' },
});
