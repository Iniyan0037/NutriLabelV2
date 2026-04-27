import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, Alert, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { fetchProductByBarcode } from '../services/api';
import { useRef } from 'react';

export default function ScanScreen({ route, navigation }) {
  const params = route.params || {};
  const selectedProfiles = params.selectedProfiles || params.profile || [];
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [scanned, setScanned] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (!permission) requestPermission();
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
      navigation.navigate('Results', { result: productResult, selectedProfiles, productName: productResult.product_name, ingredientText: productResult.ingredient_text });
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
                <Ionicons name="scan" size={36} color="#4CAF50" />
              </View>
            </View>
            <Text style={styles.title}>Barcode Lookup</Text>
            <Text style={styles.subtitle}>
              Scan a barcode or enter it manually
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
            <Text style={styles.inputLabel}>Enter Barcode</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="barcode-outline" size={24} color="#9E9E9E" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Example: 3017620422003" 
                placeholderTextColor="#BDBDBD"
                value={barcode} 
                onChangeText={handleBarcodeChange} 
                keyboardType="numeric" 
                maxLength={20} 
              />
              {barcode.length > 0 && (
                <Pressable onPress={() => setBarcode('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color="#9E9E9E" />
                </Pressable>
              )}
            </View>
            <View style={styles.helperBox}>
              <Ionicons name="information-circle-outline" size={16} color="#757575" />
              <Text style={styles.helperText}>
                Uses Open Food Facts + NutriLabel database
              </Text>
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.buttonsSection,
              {
                opacity: fadeAnim,
              }
            ]}
          >
            <Pressable 
              style={[styles.primaryButton, isLookupDisabled && styles.disabledButton]} 
              onPress={() => handleLookup()} 
              disabled={isLookupDisabled}
            >
              <LinearGradient
                colors={isLookupDisabled ? ['#BDBDBD', '#9E9E9E'] : ['#4CAF50', '#388E3C']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="search" size={22} color="#fff" />
                    <Text style={styles.primaryButtonText}>Lookup Product</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable 
              style={styles.secondaryButton} 
              onPress={() => { 
                setScanned(false); 
                setShowCamera((current) => !current); 
              }}
            >
              <Ionicons name={showCamera ? "close-circle-outline" : "camera-outline"} size={22} color="#4CAF50" />
              <Text style={styles.secondaryButtonText}>
                {showCamera ? 'Close Camera' : 'Open Camera Scanner'}
              </Text>
            </Pressable>
          </Animated.View>

          {showCamera && (
            <Animated.View
              style={[
                styles.cameraSection,
                {
                  opacity: fadeAnim,
                }
              ]}
            >
              {!permission ? (
                <View style={styles.cameraPlaceholder}>
                  <ActivityIndicator size="large" color="#4CAF50" />
                  <Text style={styles.cameraText}>Requesting camera permission...</Text>
                </View>
              ) : !permission.granted ? (
                <View style={styles.cameraPlaceholder}>
                  <Ionicons name="camera-off" size={48} color="#BDBDBD" />
                  <Text style={styles.cameraText}>Camera permission required</Text>
                  <Pressable style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.permissionButtonText}>Grant Permission</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.cameraWrapper}>
                  <CameraView 
                    style={styles.camera} 
                    barcodeScannerSettings={{ 
                      barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'] 
                    }} 
                    onBarcodeScanned={handleBarCodeScanned} 
                  />
                  <View style={styles.scanOverlay}>
                    <View style={styles.scanFrame} />
                  </View>
                  <View style={styles.cameraHintBox}>
                    <Ionicons name="scan" size={20} color="#fff" />
                    <Text style={styles.cameraHint}>Point camera at barcode</Text>
                  </View>
                </View>
              )}
            </Animated.View>
          )}

          <Pressable 
            style={styles.tertiaryButton} 
            onPress={() => navigation.navigate('ManualInput', { selectedProfiles })}
          >
            <Ionicons name="create-outline" size={20} color="#757575" />
            <Text style={styles.tertiaryButtonText}>Enter Ingredients Manually</Text>
          </Pressable>

          <View style={styles.footer}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#9E9E9E" />
            <Text style={styles.footerText}>Secure and private scanning</Text>
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
  inputLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#212121',
    fontWeight: '500',
  },
  clearButton: {
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
  buttonsSection: {
    marginBottom: 20,
  },
  primaryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
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
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 14,
    paddingVertical: 18,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  secondaryButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cameraSection: {
    marginBottom: 20,
  },
  cameraWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
  },
  camera: {
    width: '100%',
    height: 320,
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 150,
    borderWidth: 3,
    borderColor: '#4CAF50',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  cameraHintBox: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 12,
  },
  cameraHint: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  cameraPlaceholder: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cameraText: {
    fontSize: 15,
    color: '#757575',
    fontWeight: '500',
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  tertiaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 20,
  },
  tertiaryButtonText: {
    color: '#757575',
    fontSize: 15,
    fontWeight: '600',
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