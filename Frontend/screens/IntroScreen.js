import React, { useEffect, useRef } from 'react';
import { Animated, Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getStoredAccount } from '../services/api';

export default function IntroScreen({ navigation }) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.86)).current;
  const logoTranslate = useRef(new Animated.Value(26)).current;
  const arrowPulse = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
        Animated.timing(logoTranslate, { toValue: 0, duration: 650, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.sequence([
          Animated.timing(arrowPulse, { toValue: 1.08, duration: 260, useNativeDriver: true }),
          Animated.timing(arrowPulse, { toValue: 1, duration: 260, useNativeDriver: true }),
        ]),
        Animated.timing(contentOpacity, { toValue: 1, duration: 520, useNativeDriver: true }),
      ]),
    ]).start();

    const timer = setTimeout(async () => {
      const account = await getStoredAccount().catch(() => null);
      navigation.replace(account ? 'Home' : 'Login');
    }, 2100);
    return () => clearTimeout(timer);
  }, [navigation, logoOpacity, logoScale, logoTranslate, arrowPulse, contentOpacity]);

  return (
    <LinearGradient colors={['#F7FFF2', '#E3F3D8', '#B99D2A']} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.center}>
          <Animated.View style={[styles.logoCard, { opacity: logoOpacity, transform: [{ scale: logoScale }, { translateY: logoTranslate }] }]}>
            <Image source={require('../assets/NTlogo.png')} style={styles.logo} />
            <Animated.View style={[styles.arrowGlow, { transform: [{ scale: arrowPulse }] }]} />
          </Animated.View>
          <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
            <Text style={styles.title}>NutriLabel</Text>
            <Text style={styles.subtitle}>Scan, understand, learn, and track food choices through your own dietary profile.</Text>
            <Text style={styles.loading}>Preparing your food label assistant...</Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logoCard: { backgroundColor: '#fff', borderRadius: 32, paddingVertical: 28, paddingHorizontal: 24, elevation: 6, marginBottom: 24, position: 'relative', overflow: 'hidden' },
  logo: { width: 280, height: 112, resizeMode: 'contain' },
  arrowGlow: { position: 'absolute', width: 74, height: 74, borderRadius: 37, backgroundColor: 'rgba(185,157,42,0.18)', left: '50%', top: 44, marginLeft: -10 },
  content: { alignItems: 'center' },
  title: { fontSize: 44, fontWeight: '900', color: '#163C25', letterSpacing: 1 },
  subtitle: { marginTop: 10, textAlign: 'center', color: '#163C25', fontWeight: '800', lineHeight: 22, maxWidth: 330 },
  loading: { marginTop: 22, color: '#163C25', fontWeight: '900', opacity: 0.8 },
});
