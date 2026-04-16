import { useState } from 'react';
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { analyzeIngredients, uploadImageForOCR } from '../services/api';

export default function ManualInputScreen({ route, navigation }) {
  const { selectedProfiles = [] } = route.params || {};
  const [ingredientText, setIngredientText] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrMode, setOcrMode] = useState(null); // 'camera' | 'gallery' | 'web-upload' | null

  const handleAnalyze = async () => {
    if (!ingredientText.trim()) {
      Alert.alert('Missing Input', 'Please enter ingredient text before analysing.');
      return;
    }

    try {
      setLoading(true);

      const result = await analyzeIngredients(ingredientText.trim(), selectedProfiles);

      navigation.navigate('Results', {
        apiResult: result,
        selectedProfiles,
        ingredientText: ingredientText.trim(),
      });
    } catch (error) {
      Alert.alert(
        'Analysis Failed',
        error.message || 'Could not analyze ingredients. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const compressImageForOCR = async (asset) => {
    if (Platform.OS === 'web') {
      return asset;
    }

    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 700 } }],
      {
        compress: 0.2,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: false,
      }
    );

    return {
      uri: manipulated.uri,
      fileName: 'ingredients.jpg',
      mimeType: 'image/jpeg',
    };
  };

  const handleImageSelection = async (mode) => {
    try {
      const permission =
        mode === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          mode === 'camera'
            ? 'Camera permission is required.'
            : 'Photo library permission is required.'
        );
        return;
      }

      const pickerResult =
        mode === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              quality: 0.25,
              allowsEditing: true,
              aspect: [4, 3],
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: Platform.OS === 'web' ? 1 : 0.4,
              allowsEditing: true,
            });

      if (pickerResult.canceled) {
        return;
      }

      setOcrMode(Platform.OS === 'web' ? 'web-upload' : mode);

      const asset = pickerResult.assets[0];
      const preparedImage = await compressImageForOCR(asset);

      const response = await uploadImageForOCR(preparedImage);

      setIngredientText(response.ingredient_text || '');

      if (response.warning) {
        Alert.alert('OCR Warning', response.warning);
      } else {
        Alert.alert(
          'OCR Complete',
          'Ingredients text has been extracted. Please review it before analysing.'
        );
      }
    } catch (error) {
      Alert.alert(
        'OCR Failed',
        error.message ||
          'Could not extract text from the image. Please crop tightly to the ingredients list and try again.'
      );
    } finally {
      setOcrMode(null);
    }
  };

  const isCameraLoading = ocrMode === 'camera';
  const isGalleryLoading = ocrMode === 'gallery';
  const isWebLoading = ocrMode === 'web-upload';
  const isAnyOcrLoading = ocrMode !== null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Enter Ingredients</Text>
      <Text style={styles.subtitle}>
        Type ingredients manually or extract them from an image.
      </Text>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>Selected Profiles:</Text>
        <Text style={styles.summaryText}>
          {selectedProfiles.length > 0
            ? selectedProfiles.join(', ')
            : 'No profiles selected'}
        </Text>
      </View>

      <TextInput
        style={styles.input}
        multiline
        placeholder="Example: Wheat flour, sugar, milk solids, E471"
        value={ingredientText}
        onChangeText={setIngredientText}
        textAlignVertical="top"
      />

      <Text style={styles.helperText}>
        Separate ingredients with commas for best results. For OCR, crop tightly to the
        ingredient list only before uploading.
      </Text>

      {Platform.OS !== 'web' && (
        <>
          <Pressable
            style={[styles.secondaryButton, isCameraLoading && styles.disabledButton]}
            onPress={() => handleImageSelection('camera')}
            disabled={isAnyOcrLoading || loading}
          >
            {isCameraLoading ? (
              <ActivityIndicator color="#222" />
            ) : (
              <Text style={styles.secondaryButtonText}>Take Photo for OCR</Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.secondaryButton, isGalleryLoading && styles.disabledButton]}
            onPress={() => handleImageSelection('gallery')}
            disabled={isAnyOcrLoading || loading}
          >
            {isGalleryLoading ? (
              <ActivityIndicator color="#222" />
            ) : (
              <Text style={styles.secondaryButtonText}>Choose Image from Gallery</Text>
            )}
          </Pressable>
        </>
      )}

      {Platform.OS === 'web' && (
        <Pressable
          style={[styles.secondaryButton, isWebLoading && styles.disabledButton]}
          onPress={() => handleImageSelection('gallery')}
          disabled={isAnyOcrLoading || loading}
        >
          {isWebLoading ? (
            <ActivityIndicator color="#222" />
          ) : (
            <Text style={styles.secondaryButtonText}>Upload Image for OCR</Text>
          )}
        </Pressable>
      )}

      <Pressable
        style={[
          styles.primaryButton,
          (!ingredientText.trim() || loading || isAnyOcrLoading) && styles.disabledButton,
        ]}
        onPress={handleAnalyze}
        disabled={!ingredientText.trim() || loading || isAnyOcrLoading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Analyse Ingredients</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#444',
  },
  summaryBox: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f2f2f2',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    minHeight: 180,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  helperText: {
    marginTop: 10,
    fontSize: 13,
    color: '#666',
  },
  primaryButton: {
    marginTop: 24,
    backgroundColor: '#222',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#222',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    borderColor: '#9ca3af',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#222',
    fontSize: 16,
    fontWeight: '600',
  },
});
