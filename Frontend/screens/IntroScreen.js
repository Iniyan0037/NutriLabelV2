import React, { useEffect, useRef } from 'react';
import { Animated, Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getStoredAccount } from '../services/api';

export default function IntroScreen({ navigation }) {
  const scale = useRef(new Animated.Value(0.82)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(async () => {
      const account = await getStoredAccount().catch(() => null);
      navigation.replace(account ? 'Home' : 'Login');
    }, 1600);
    return () => clearTimeout(timer);
  }, [navigation, opacity, scale]);

  return (
    <LinearGradient colors={['#F7FFF2', '#E3F3D8', '#BFDFAE']} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.center}>
          <Animated.View style={[styles.logoCard, { opacity, transform: [{ scale }] }]}>
            <Image source={require('../assets/NTlogo.png')} style={styles.logo} />
          </Animated.View>
          <Animated.Text style={[styles.title, { opacity }]}>NutriLabel</Animated.Text>
          <Text style={styles.subtitle}>Family food awareness, profiles, and nutrition support</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logoCard: { backgroundColor: '#fff', borderRadius: 30, padding: 28, elevation: 5, marginBottom: 20 },
  logo: { width: 210, height: 92, resizeMode: 'contain' },
  title: { fontSize: 44, fontWeight: '900', color: '#1B5E20' },
  subtitle: { marginTop: 10, textAlign: 'center', color: '#52734D', fontWeight: '700', lineHeight: 22 },
});
