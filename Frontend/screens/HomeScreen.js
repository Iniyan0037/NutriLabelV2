import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Image,
  ScrollView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { displayProfile, normalizeProfiles } from '../services/api';
import { getHighContrastPreference, setHighContrastPreference, theme } from '../services/accessibility';

export default function HomeScreen({ navigation, route }) {
  const [profile, setProfile] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const load = async () => {
      const savedProfile = await AsyncStorage.getItem('PROFILE');
      const savedActiveProfile = await AsyncStorage.getItem('ACTIVE_PROFILE');
      if (savedProfile) setProfile(normalizeProfiles(JSON.parse(savedProfile)));
      if (savedActiveProfile) setActiveProfile(JSON.parse(savedActiveProfile));
      setHighContrast(await getHighContrastPreference());
    };
    load().catch(() => {});
  }, []);

  useEffect(() => {
    if (route.params?.profile) setProfile(normalizeProfiles(route.params.profile));
    if (route.params?.activeProfile) setActiveProfile(route.params.activeProfile);
  }, [route.params]);

  const colors = theme(highContrast);

  const toggleHighContrast = async () => {
    const next = !highContrast;
    setHighContrast(next);
    await setHighContrastPreference(next);
  };

  const hasProfile = profile.length > 0;
  const activeProfileName = activeProfile?.profile_name || (hasProfile ? 'Selected Dietary Profile' : 'No profile selected');

  return (
    <LinearGradient colors={colors.gradient} style={styles.flex}>
      <StatusBar barStyle={highContrast ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={[styles.logoBox, { backgroundColor: highContrast ? colors.card : '#fff', borderColor: colors.border }]}> 
            <Image source={require('../assets/NTlogo.png')} style={styles.logo} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>NutriLabel</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Smart Food Analysis</Text>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={styles.cardHeader}>
              <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Your Health Guardian</Text>
            </View>
            <Text style={[styles.cardText, { color: colors.muted }]}>Create named dietary profiles, analyse food products, save results, and revisit past decisions anytime.</Text>
          </View>

          <Pressable
            style={[styles.toggle, { backgroundColor: highContrast ? colors.primary : colors.card, borderColor: colors.border }]}
            onPress={toggleHighContrast}
            accessibilityRole="switch"
            accessibilityState={{ checked: highContrast }}
            accessibilityLabel="High contrast mode"
          >
            <Ionicons name={highContrast ? 'contrast' : 'contrast-outline'} size={24} color={highContrast ? colors.primaryText : colors.secondary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleTitle, { color: highContrast ? colors.primaryText : colors.text }]}>High Contrast Mode</Text>
              <Text style={[styles.toggleSub, { color: highContrast ? colors.primaryText : colors.muted }]}>{highContrast ? 'Enabled across the app' : 'Improve readability with stronger colours'}</Text>
            </View>
            <Text style={[styles.toggleState, { color: highContrast ? colors.primaryText : colors.secondary }]}>{highContrast ? 'ON' : 'OFF'}</Text>
          </Pressable>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={styles.cardHeader}>
              <Ionicons name="person-circle" size={26} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>{activeProfileName}</Text>
            </View>
            {hasProfile ? (
              <View style={styles.tagsWrap}>
                {profile.map((item) => (
                  <View key={item} style={[styles.tag, { backgroundColor: colors.card2, borderColor: colors.primary }]}> 
                    <Text style={[styles.tagText, { color: colors.text }]}>{displayProfile(item)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.cardText, { color: colors.muted }]}>Create or select a profile before analysing products.</Text>
            )}
          </View>

          <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('Profile')} accessibilityRole="button" accessibilityLabel="Manage saved profiles">
            <Ionicons name={hasProfile ? 'people' : 'add-circle'} size={24} color={colors.primaryText} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.primaryText, { color: colors.primaryText }]}>{hasProfile ? 'Manage Profiles' : 'Create Profile'}</Text>
              <Text style={[styles.primarySub, { color: colors.primaryText }]}>{hasProfile ? 'Select or edit saved profiles' : 'Set up dietary preferences'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.primaryText} />
          </Pressable>

          <Pressable style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.navigate('History')} accessibilityRole="button" accessibilityLabel="View history">
            <Ionicons name="time" size={24} color={colors.secondary} />
            <Text style={[styles.secondaryText, { color: colors.text }]}>View History</Text>
          </Pressable>

          <View style={styles.row}>
            <Pressable style={[styles.quickButton, { backgroundColor: colors.card, borderColor: colors.border, opacity: hasProfile ? 1 : 0.55 }]} onPress={() => hasProfile ? navigation.navigate('Scan', { profile, selectedProfiles: profile }) : navigation.navigate('Profile')} accessibilityRole="button" accessibilityLabel="Scan barcode">
              <Ionicons name="scan" size={30} color={colors.primary} />
              <Text style={[styles.quickText, { color: colors.text }]}>Scan</Text>
            </Pressable>
            <Pressable style={[styles.quickButton, { backgroundColor: colors.card, borderColor: colors.border, opacity: hasProfile ? 1 : 0.55 }]} onPress={() => hasProfile ? navigation.navigate('ManualInput', { profile, selectedProfiles: profile }) : navigation.navigate('Profile')} accessibilityRole="button" accessibilityLabel="Manual input">
              <Ionicons name="create-outline" size={30} color={colors.primary} />
              <Text style={[styles.quickText, { color: colors.text }]}>Manual</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, paddingBottom: 40, alignItems: 'center' },
  logoBox: { borderRadius: 24, padding: 20, borderWidth: 1, marginTop: 20, marginBottom: 18 },
  logo: { width: 200, height: 80, resizeMode: 'contain' },
  title: { fontSize: 46, fontWeight: '900', letterSpacing: 1 },
  subtitle: { fontSize: 15, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 22 },
  card: { width: '100%', borderRadius: 20, padding: 18, marginBottom: 18, borderWidth: 1, elevation: 3 },
  cardHeader: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '900' },
  cardText: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  toggle: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 16, marginBottom: 18, borderWidth: 2 },
  toggleTitle: { fontSize: 16, fontWeight: '900' },
  toggleSub: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  toggleState: { fontWeight: '900' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tag: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  tagText: { fontWeight: '800' },
  primaryButton: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 20, marginBottom: 12 },
  primaryText: { fontSize: 18, fontWeight: '900' },
  primarySub: { fontSize: 13, opacity: 0.8, marginTop: 2 },
  secondaryButton: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
  secondaryText: { fontSize: 17, fontWeight: '900' },
  row: { flexDirection: 'row', gap: 12, width: '100%' },
  quickButton: { flex: 1, alignItems: 'center', gap: 8, padding: 18, borderRadius: 20, borderWidth: 1 },
  quickText: { fontWeight: '900' },
});
