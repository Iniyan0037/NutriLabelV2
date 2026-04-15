import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { analyzeIngredients, extractIngredientsFromImage } from '../services/api';

export default function ManualInputScreen({ route, navigation }) {
  const { selectedProfiles = [] } = route.params || {};
  const [ingredientText, setIngredientText] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!ingredientText.trim()) {
      Alert.alert('Missing Input', 'Please enter ingredient text before analysing.');
      return;
    }
    try {
      setLoading(true);
      const analysis = await analyzeIngredients(ingredientText.trim(), selectedProfiles);
      navigation.navigate('Results', {
        result: {
          product_name: 'Manual Ingredient Input',
          barcode: '',
          ingredient_text: ingredientText.trim(),
          allergens_tags: [],
          additives_tags: [],
          analysis,
        },
        selectedProfiles,
      });
    } catch {
      Alert.alert('Analysis Failed', 'Could not analyze ingredients. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelection = async (mode) => {
    try {
      const permission = mode === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', mode === 'camera' ? 'Camera permission is required.' : 'Photo library permission is required.');
        return;
      }
      const pickerResult = mode === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: false })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: false });
      if (pickerResult.canceled) return;
      setOcrLoading(true);
      const response = await extractIngredientsFromImage(pickerResult.assets[0].uri);
      setIngredientText(response.ingredient_text || '');
      Alert.alert('OCR Complete', 'Ingredients text has been extracted. Please review it before analysing.');
    } catch {
      Alert.alert('OCR Failed', 'Could not extract text from the image. Please try another image or type the ingredients manually.');
    } finally {
      setOcrLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Enter Ingredients</Text>
      <Text style={styles.subtitle}>Type ingredients manually or extract them from an image.</Text>
      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>Selected Profiles:</Text>
        <Text style={styles.summaryText}>{selectedProfiles.length > 0 ? selectedProfiles.join(', ') : 'No profiles selected'}</Text>
      </View>
      <TextInput style={styles.input} multiline placeholder="Example: Wheat flour, sugar, milk solids, E471" value={ingredientText} onChangeText={setIngredientText} textAlignVertical="top" />
      <Text style={styles.helperText}>Separate ingredients with commas for best results. After OCR, review and correct the extracted text before analysing.</Text>
      <Pressable style={styles.secondaryButton} onPress={() => handleImageSelection('camera')} disabled={ocrLoading}>
        <Text style={styles.secondaryButtonText}>{ocrLoading ? 'Extracting Text...' : 'Take Photo for OCR'}</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={() => handleImageSelection('library')} disabled={ocrLoading}>
        <Text style={styles.secondaryButtonText}>{ocrLoading ? 'Extracting Text...' : 'Choose Image from Gallery'}</Text>
      </Pressable>
      <Pressable style={[styles.primaryButton, (!ingredientText.trim() || loading || ocrLoading) && styles.disabledButton]} onPress={handleAnalyze} disabled={!ingredientText.trim() || loading || ocrLoading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Analyse Ingredients</Text>}
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
  input: { minHeight: 180, borderWidth: 1, borderColor: '#ccc', borderRadius: 12, padding: 16, fontSize: 16, backgroundColor: '#fafafa' },
  helperText: { marginTop: 10, fontSize: 13, color: '#666' },
  primaryButton: { marginTop: 24, backgroundColor: '#222', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  secondaryButton: { marginTop: 12, borderWidth: 1, borderColor: '#222', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  disabledButton: { backgroundColor: '#9ca3af', borderColor: '#9ca3af' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButtonText: { color: '#222', fontSize: 16, fontWeight: '600' },
});
