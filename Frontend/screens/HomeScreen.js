import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  StatusBar,
  SafeAreaView,
  Image,
  Dimensions,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation, route }) {

  const [profile, setProfile] = useState([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const saved = await AsyncStorage.getItem('PROFILE');
        if (saved) {
          setProfile(JSON.parse(saved));
        }
      } catch (e) {}
    };
    loadProfile();
  }, []);

  useEffect(() => {
    if (route.params?.profile) {
      setProfile(route.params.profile);
    }
  }, [route.params]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 20000, useNativeDriver: true })
    ).start();
  }, []);

  const floatInterpolate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const PROFILE_COLORS = {
    vegetarian: { color: '#66BB6A', bgColor: '#F1F8E9', icon: 'leaf' },
    vegan: { color: '#4CAF50', bgColor: '#E8F5E9', icon: 'leaf' },
    halal: { color: '#42A5F5', bgColor: '#E3F2FD', icon: 'moon' },
    kosher: { color: '#AB47BC', bgColor: '#F3E5F5', icon: 'star' },
    'dairy free': { color: '#29B6F6', bgColor: '#E1F5FE', icon: 'water' },
    'gluten free': { color: '#FFA726', bgColor: '#FFF3E0', icon: 'ban' },
    'nut free': { color: '#EF5350', bgColor: '#FFEBEE', icon: 'close-circle' },
    'no restriction': { color: '#78909C', bgColor: '#ECEFF1', icon: 'checkmark-circle' },
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <LinearGradient
        colors={['#F5F9F0', '#E8F3DC', '#C8E0B8', '#A8D098', '#6B9B5C']}
        style={styles.background}
      >

        <Animated.View 
          pointerEvents="none" 
          style={[
            styles.decorCircle1, 
            { transform: [{ translateY: floatInterpolate }, { rotate: rotateInterpolate }] }
          ]} 
        />
        <Animated.View 
          pointerEvents="none" 
          style={[
            styles.decorCircle2, 
            { transform: [{ translateY: floatInterpolate }] }
          ]} 
        />
        <View pointerEvents="none" style={styles.decorCircle3} />

        <SafeAreaView style={styles.safeArea}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
          >

            <Animated.View 
              style={[
                styles.content, 
                { 
                  opacity: fadeAnim, 
                  transform: [{ translateY: slideAnim }] 
                }
              ]}
            >

              <Animated.View 
                style={[
                  styles.logoContainer, 
                  { transform: [{ scale: pulseAnim }] }
                ]}
              >
                <View style={styles.logoBg}>
                  <Image 
                    source={require('../assets/NTlogo.png')} 
                    style={styles.logo} 
                  />
                </View>
              </Animated.View>

              <Animated.View 
                style={[
                  styles.titleSection, 
                  { transform: [{ scale: scaleAnim }] }
                ]}
              >
                <Text style={styles.mainTitle}>NutriLabel</Text>
                <View style={styles.titleUnderline} />
                <Text style={styles.subtitle}>Smart Food Analysis</Text>
              </Animated.View>

              <View style={styles.descriptionCard}>
                <View style={styles.descriptionIconRow}>
                  <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
                  <Text style={styles.descriptionTitle}>Your Health Guardian</Text>
                </View>
                <Text style={styles.description}>
                  Create your personalized dietary profile{'\n'}and analyze food products instantly
                </Text>
              </View>

              {profile.length > 0 && (
                <Animated.View 
                  style={[
                    styles.profileSection, 
                    { opacity: fadeAnim }
                  ]}
                >
                  <View style={styles.profileHeader}>
                    <Ionicons name="person-circle" size={20} color="#2E7D32" />
                    <Text style={styles.profileHeaderText}>Your Profile</Text>
                    <View style={styles.profileBadge}>
                      <Text style={styles.profileBadgeText}>{profile.length}</Text>
                    </View>
                  </View>

                  <View style={styles.tagsContainer}>
                    {profile.map((item, index) => {
                      const config = PROFILE_COLORS[item.toLowerCase()] || {
                        color: '#757575',
                        bgColor: '#F5F5F5',
                        icon: 'ellipse'
                      };

                      return (
                        <View 
                          key={index} 
                          style={[
                            styles.tag, 
                            { 
                              backgroundColor: config.bgColor, 
                              borderColor: config.color 
                            }
                          ]}
                        >
                          <Ionicons name={config.icon} size={16} color={config.color} />
                          <Text style={[styles.tagText, { color: config.color }]}>
                            {item}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </Animated.View>
              )}

              <View style={styles.buttonsContainer}>
                <Pressable 
                  style={styles.mainButton} 
                  onPress={() => navigation.navigate('Questionnaire')}
                >
                  <LinearGradient 
                    colors={['#0C2B54', '#1A4278']} 
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <View style={styles.buttonIconBg}>
                      <Ionicons 
                        name={profile.length > 0 ? 'create' : 'add-circle'} 
                        size={24} 
                        color="#fff" 
                      />
                    </View>
                    <View style={styles.buttonTextContainer}>
                      <Text style={styles.buttonText}>
                        {profile.length > 0 ? 'Update Profile' : 'Create Profile'}
                      </Text>
                      <Text style={styles.buttonSubtext}>
                        {profile.length > 0 ? 'Modify your dietary preferences' : 'Set up your dietary preferences'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#fff" />
                  </LinearGradient>
                </Pressable>

                <Pressable 
                  style={styles.mainButton} 
                  onPress={() => navigation.navigate('History')}
                >
                  <LinearGradient 
                    colors={['#4CAF50', '#66BB6A']} 
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <View style={styles.buttonIconBg}>
                      <Ionicons name="time" size={24} color="#fff" />
                    </View>
                    <View style={styles.buttonTextContainer}>
                      <Text style={styles.buttonText}>View History</Text>
                      <Text style={styles.buttonSubtext}>Check your scan history</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#fff" />
                  </LinearGradient>
                </Pressable>

                <View style={styles.quickActionsRow}>
                  <Pressable 
                    style={styles.quickActionButton}
                    onPress={() => navigation.navigate('Scan', { profile })}
                  >
                    <View style={styles.quickActionIconBg}>
                      <Ionicons name="scan" size={28} color="#4CAF50" />
                    </View>
                    <Text style={styles.quickActionText}>Scan</Text>
                  </Pressable>

                  <Pressable 
                    style={styles.quickActionButton}
                    onPress={() => navigation.navigate('ManualInput', { profile })}
                  >
                    <View style={styles.quickActionIconBg}>
                      <Ionicons name="create-outline" size={28} color="#2196F3" />
                    </View>
                    <Text style={styles.quickActionText}>Manual</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.footer}>
                <Ionicons name="leaf" size={16} color="#558B2F" />
                <Text style={styles.footerText}>Powered by AI • Safe & Secure</Text>
              </View>

            </Animated.View>

          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  background: { 
    flex: 1 
  },
  safeArea: { 
    flex: 1 
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  content: { 
    flexGrow: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 24 
  },
  decorCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    top: -100,
    right: -100,
  },
  decorCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    bottom: -50,
    left: -50,
  },
  decorCircle3: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: height * 0.4,
    left: -30,
  },
  logoContainer: { 
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  logoBg: { 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    padding: 24,
  },
  logo: { 
    width: 200, 
    height: 80, 
    resizeMode: 'contain' 
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mainTitle: { 
    fontSize: 48, 
    fontWeight: '900', 
    color: '#1B5E20',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  titleUnderline: {
    width: 80,
    height: 4,
    backgroundColor: '#4CAF50',
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#558B2F',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  descriptionCard: { 
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  descriptionIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2E7D32',
    letterSpacing: 0.3,
  },
  description: { 
    textAlign: 'center',
    fontSize: 15,
    color: '#616161',
    lineHeight: 24,
    fontWeight: '500',
  },
  profileSection: { 
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F5E9',
  },
  profileHeaderText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2E7D32',
    flex: 1,
    letterSpacing: 0.3,
  },
  profileBadge: {
    backgroundColor: '#4CAF50',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
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
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1.5,
  },
  tagText: { 
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  mainButton: { 
    width: '100%', 
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 14,
  },
  buttonIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  buttonSubtext: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontWeight: '500',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#424242',
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    opacity: 0.8,
  },
  footerText: {
    fontSize: 13,
    color: '#558B2F',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});