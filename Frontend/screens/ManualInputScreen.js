import { useState, useRef, useEffect } from 'react';
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
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { analyzeIngredients, uploadImageForOCR } from '../services/api';

export default function ManualInputScreen({ route, navigation }) {
  const params = route.params || {};
  const selectedProfiles = params.selectedProfiles || params.profile || [];
  const [ingredientText, setIngredientText] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrMode, setOcrMode] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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

  const PROFILE_COLORS = {
    vegan: { color: '#4CAF50', bgColor: '#E8F5E9', icon: 'leaf' },
    vegetarian: { color: '#66BB6A', bgColor: '#F1F8E9', icon: 'nutrition' },
    eggetarian: { color: '#FFA726', bgColor: '#FFF3E0', icon: 'egg' },
    halal: { color: '#42A5F5', bgColor: '#E3F2FD', icon: 'moon' },
    Jain: { color: '#FF7043', bgColor: '#FBE9E7', icon: 'flower' },
    'nut-free': { color: '#EF5350', bgColor: '#FFEBEE', icon: 'close-circle' },
    'dairy-free': { color: '#29B6F6', bgColor: '#E1F5FE', icon: 'water' },
    'gluten-free': { color: '#AB47BC', bgColor: '#F3E5F5', icon: 'ban' },
  };

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={['#FAFDF8', '#F5FAF0', '#EFF6E8']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.leafDecor1}>
          <Ionicons name="leaf" size={100} color="rgba(139, 195, 74, 0.08)" />
        </View>
        <View style={styles.leafDecor2}>
          <Ionicons name="leaf" size={70} color="rgba(76, 175, 80, 0.06)" />
        </View>

        <ScrollView 
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <Pressable 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#2E7D32" />
            </Pressable>

            <View style={styles.headerIconContainer}>
              <View style={styles.headerIconBg}>
                <Ionicons name="create" size={36} color="#4CAF50" />
              </View>
            </View>
            <Text style={styles.title}>Manual Input</Text>
            <Text style={styles.subtitle}>
              Type or extract ingredients from image
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.profilesBox,
              {
                opacity: fadeAnim,
              }
            ]}
          >
            <View style={styles.profilesHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.profilesTitle}>Active Profiles</Text>
            </View>
            {selectedProfiles.length > 0 ? (
              <View style={styles.tagsContainer}>
                {selectedProfiles.map((profileId) => {
                  const profile = PROFILE_COLORS[profileId] || { color: '#757575', bgColor: '#F5F5F5', icon: 'ellipse' };
                  return (
                    <View key={profileId} style={[styles.tag, { backgroundColor: profile.bgColor }]}>
                      <Ionicons name={profile.icon} size={14} color={profile.color} />
                      <Text style={[styles.tagText, { color: profile.color }]}>{profileId}</Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyProfiles}>
                <Ionicons name="alert-circle-outline" size={18} color="#BDBDBD" />
                <Text style={styles.emptyText}>No profiles selected</Text>
              </View>
            )}
          </Animated.View>

          <Animated.View
            style={[
              styles.inputSection,
              {
                opacity: fadeAnim,
              }
            ]}
          >
            <View style={styles.inputHeader}>
              <Text style={styles.inputLabel}>Ingredients List</Text>
              <View style={styles.charCount}>
                <Text style={styles.charCountText}>{ingredientText.length}</Text>
              </View>
            </View>
            
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                multiline
                placeholder="Example: Wheat flour, sugar, milk solids, E471..."
                placeholderTextColor="#BDBDBD"
                value={ingredientText}
                onChangeText={setIngredientText}
                textAlignVertical="top"
              />
              {ingredientText.length > 0 && (
                <Pressable 
                  style={styles.clearInputButton}
                  onPress={() => setIngredientText('')}
                >
                  <Ionicons name="close-circle" size={24} color="#9E9E9E" />
                </Pressable>
              )}
            </View>

            <View style={styles.helperBox}>
              <Ionicons name="information-circle-outline" size={16} color="#757575" />
              <Text style={styles.helperText}>
                Separate with commas for best results
              </Text>
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.ocrSection,
              {
                opacity: fadeAnim,
              }
            ]}
          >
            <View style={styles.sectionHeader}>
              <Ionicons name="image" size={20} color="#2E7D32" />
              <Text style={styles.sectionTitle}>Extract from Image</Text>
            </View>

            {Platform.OS !== 'web' && (
              <>
                <Pressable
                  style={[styles.ocrButton, isCameraLoading && styles.disabledButton]}
                  onPress={() => handleImageSelection('camera')}
                  disabled={isAnyOcrLoading || loading}
                >
                  {isCameraLoading ? (
                    <ActivityIndicator color="#4CAF50" />
                  ) : (
                    <>
                      <View style={styles.ocrIconBg}>
                        <Ionicons name="camera" size={24} color="#4CAF50" />
                      </View>
                      <Text style={styles.ocrButtonText}>Take Photo</Text>
                      <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
                    </>
                  )}
                </Pressable>

                <Pressable
                  style={[styles.ocrButton, isGalleryLoading && styles.disabledButton]}
                  onPress={() => handleImageSelection('gallery')}
                  disabled={isAnyOcrLoading || loading}
                >
                  {isGalleryLoading ? (
                    <ActivityIndicator color="#4CAF50" />
                  ) : (
                    <>
                      <View style={styles.ocrIconBg}>
                        <Ionicons name="images" size={24} color="#4CAF50" />
                      </View>
                      <Text style={styles.ocrButtonText}>Choose from Gallery</Text>
                      <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
                    </>
                  )}
                </Pressable>
              </>
            )}

            {Platform.OS === 'web' && (
              <Pressable
                style={[styles.ocrButton, isWebLoading && styles.disabledButton]}
                onPress={() => handleImageSelection('gallery')}
                disabled={isAnyOcrLoading || loading}
              >
                {isWebLoading ? (
                  <ActivityIndicator color="#4CAF50" />
                ) : (
                  <>
                    <View style={styles.ocrIconBg}>
                      <Ionicons name="cloud-upload" size={24} color="#4CAF50" />
                    </View>
                    <Text style={styles.ocrButtonText}>Upload Image</Text>
                    <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
                  </>
                )}
              </Pressable>
            )}

            <View style={styles.ocrTip}>
              <Ionicons name="bulb-outline" size={16} color="#FFA726" />
              <Text style={styles.ocrTipText}>
                Crop tightly to ingredient list for best OCR results
              </Text>
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.analyzeSection,
              {
                opacity: fadeAnim,
              }
            ]}
          >
            <Pressable
              style={[
                styles.primaryButton,
                (!ingredientText.trim() || loading || isAnyOcrLoading) && styles.disabledButton,
              ]}
              onPress={handleAnalyze}
              disabled={!ingredientText.trim() || loading || isAnyOcrLoading}
            >
              <LinearGradient
                colors={(!ingredientText.trim() || loading || isAnyOcrLoading) ? ['#BDBDBD', '#9E9E9E'] : ['#4CAF50', '#388E3C']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="analytics" size={22} color="#fff" />
                    <Text style={styles.primaryButtonText}>Analyse Ingredients</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <View style={styles.footer}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#9E9E9E" />
            <Text style={styles.footerText}>Your data is private and secure</Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  leafDecor1: {
    position: 'absolute',
    top: 80,
    right: -20,
    transform: [{ rotate: '25deg' }],
    opacity: 0.6,
  },
  leafDecor2: {
    position: 'absolute',
    bottom: 150,
    left: -15,
    transform: [{ rotate: '-45deg' }],
    opacity: 0.5,
  },
  container: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerIconContainer: {
    marginBottom: 16,
  },
  headerIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2E7D32',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: '#757575',
    fontWeight: '500',
    textAlign: 'center',
  },
  profilesBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  profilesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  profilesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  emptyProfiles: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#BDBDBD',
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: 24,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
  },
  charCount: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  charCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4CAF50',
  },
  inputWrapper: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  input: {
    minHeight: 180,
    padding: 16,
    fontSize: 16,
    color: '#212121',
    fontWeight: '500',
  },
  clearInputButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  helperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  helperText: {
    fontSize: 13,
    color: '#757575',
    fontWeight: '500',
  },
  ocrSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
  },
  ocrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  ocrIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  ocrButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  ocrTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  ocrTipText: {
    flex: 1,
    fontSize: 13,
    color: '#F57C00',
    fontWeight: '500',
  },
  analyzeSection: {
    marginBottom: 20,
  },
   primaryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  disabledButton: {
    shadowOpacity: 0.1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  footerText: {
    fontSize: 13,
    color: '#9E9E9E',
    fontWeight: '500',
  },
});