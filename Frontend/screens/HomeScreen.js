import React, { useCallback, useState } from 'react';
import { Alert, Image, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { clearStoredAccount, displayProfile, getStoredAccount, normalizeProfiles } from '../services/api';
import { getHighContrastPreference, setHighContrastPreference, theme } from '../services/accessibility';

export default function HomeScreen({ navigation, route }) {
  const [profile, setProfile] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [account, setAccount] = useState(null);
  const [highContrast, setHighContrast] = useState(false);

  const load = useCallback(async () => {
    const savedProfile = await AsyncStorage.getItem('PROFILE');
    const savedActiveProfile = await AsyncStorage.getItem('ACTIVE_PROFILE');
    const savedAccount = await getStoredAccount();
    if (!savedAccount) { navigation.replace('Login'); return; }
    setAccount(savedAccount);
    setProfile(savedProfile ? normalizeProfiles(JSON.parse(savedProfile)) : []);
    setActiveProfile(savedActiveProfile ? JSON.parse(savedActiveProfile) : null);
    setHighContrast(await getHighContrastPreference());
  }, [navigation]);

  useFocusEffect(useCallback(() => { load().catch(() => {}); }, [load]));

  React.useEffect(() => {
    if (route.params?.profile) setProfile(normalizeProfiles(route.params.profile));
    if (route.params?.activeProfile) setActiveProfile(route.params.activeProfile);
  }, [route.params]);

  const colors = theme(highContrast);
  const hasProfile = profile.length > 0;

  const toggleHighContrast = async () => {
    const next = !highContrast;
    setHighContrast(next);
    await setHighContrastPreference(next);
  };

  const logout = async () => {
    const confirmed = Platform.OS === 'web' ? window.confirm('Log out of this shared login?') : true;
    if (!confirmed) return;
    await clearStoredAccount();
    navigation.replace('Login');
  };

  const requireProfile = (screen) => {
    if (!hasProfile) {
      const msg = 'Please create or select a profile first so the feature can stay tied to one profile user.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Select profile', msg);
      navigation.navigate('Profile');
      return;
    }
    navigation.navigate(screen, { profile, selectedProfiles: profile });
  };

  return (
    <LinearGradient colors={colors.gradient} style={styles.flex}>
      <StatusBar barStyle={highContrast ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.topLine}>
            <Text style={[styles.accountText, { color: colors.muted }]}>Shared login: {account?.family_name || 'Unknown'}</Text>
            <Pressable onPress={logout}><Text style={[styles.logout, { color: colors.danger }]}>Log out</Text></Pressable>
          </View>
          <View style={[styles.logoBox, { backgroundColor: highContrast ? colors.card : '#fff', borderColor: colors.border }]}><Image source={require('../assets/NTlogo.png')} style={styles.logo} /></View>
          <Text style={[styles.title, { color: colors.text }]}>NutriLabel</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Analyse, learn, and track food choices</Text>

          <Pressable style={[styles.toggle, { backgroundColor: highContrast ? colors.primary : colors.card, borderColor: colors.border }]} onPress={toggleHighContrast}>
            <Ionicons name={highContrast ? 'contrast' : 'contrast-outline'} size={24} color={highContrast ? colors.primaryText : colors.secondary} />
            <View style={{ flex: 1 }}><Text style={[styles.toggleTitle, { color: highContrast ? colors.primaryText : colors.text }]}>High Contrast Mode</Text><Text style={[styles.toggleSub, { color: highContrast ? colors.primaryText : colors.muted }]}>{highContrast ? 'Enabled across the app' : 'Improve readability with stronger colours'}</Text></View>
            <Text style={[styles.toggleState, { color: highContrast ? colors.primaryText : colors.secondary }]}>{highContrast ? 'ON' : 'OFF'}</Text>
          </Pressable>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}><Ionicons name="person-circle" size={26} color={colors.primary} /><Text style={[styles.cardTitle, { color: colors.text }]}>{activeProfile?.profile_name || (hasProfile ? 'Selected Dietary Profile' : 'No profile selected')}</Text></View>
            {hasProfile ? <View style={styles.tagsWrap}>{profile.map((item) => <View key={item} style={[styles.tag, { backgroundColor: colors.card2, borderColor: colors.primary }]}><Text style={[styles.tagText, { color: colors.text }]}>{displayProfile(item)}</Text></View>)}</View> : <Text style={[styles.cardText, { color: colors.muted }]}>Create or select one of the six shared profiles before analysing products.</Text>}
          </View>

          <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('Profile')}><Ionicons name="people" size={24} color={colors.primaryText} /><View style={{ flex: 1 }}><Text style={[styles.primaryText, { color: colors.primaryText }]}>Manage Shared Profiles</Text><Text style={[styles.primarySub, { color: colors.primaryText }]}>Create, select, edit or delete up to 6 profiles</Text></View><Ionicons name="chevron-forward" size={24} color={colors.primaryText} /></Pressable>

          <View style={styles.row}><Tile colors={colors} icon="scan" label="Scan" onPress={() => requireProfile('Scan')} disabled={!hasProfile} /><Tile colors={colors} icon="create-outline" label="Manual" onPress={() => requireProfile('ManualInput')} disabled={!hasProfile} /></View>
          <View style={styles.row}><Tile colors={colors} icon="time" label="History" onPress={() => requireProfile('History')} disabled={!hasProfile} /><Tile colors={colors} icon="game-controller" label="Game" onPress={() => navigation.navigate('LearningGame')} /></View>
          <View style={styles.row}><Tile colors={colors} icon="bar-chart" label="Awareness" onPress={() => navigation.navigate('AwarenessDashboard')} /><Tile colors={colors} icon="nutrition" label="Nutrition" onPress={() => requireProfile('Nutrition')} disabled={!hasProfile} /></View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Tile({ colors, icon, label, onPress, disabled }) {
  return <Pressable style={[styles.quickButton, { backgroundColor: colors.card, borderColor: colors.border, opacity: disabled ? 0.55 : 1 }]} onPress={onPress}><Ionicons name={icon} size={30} color={colors.primary} /><Text style={[styles.quickText, { color: colors.text }]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, container: { padding: 24, paddingBottom: 40, alignItems: 'center' },
  topLine: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }, accountText: { fontWeight: '800' }, logout: { fontWeight: '900' },
  logoBox: { borderRadius: 24, padding: 18, borderWidth: 1, marginTop: 4, marginBottom: 14 }, logo: { width: 190, height: 76, resizeMode: 'contain' },
  title: { fontSize: 42, fontWeight: '900', letterSpacing: 1 }, subtitle: { fontSize: 14, fontWeight: '800', letterSpacing: 1, textAlign: 'center', marginBottom: 18 },
  card: { width: '100%', borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, elevation: 3 }, cardHeader: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 }, cardTitle: { fontSize: 18, fontWeight: '900' }, cardText: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  toggle: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 2 }, toggleTitle: { fontSize: 16, fontWeight: '900' }, toggleSub: { fontSize: 13, fontWeight: '600', marginTop: 2 }, toggleState: { fontWeight: '900' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }, tag: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 }, tagText: { fontWeight: '800' },
  primaryButton: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 20, marginBottom: 12 }, primaryText: { fontSize: 18, fontWeight: '900' }, primarySub: { fontSize: 13, opacity: 0.8, marginTop: 2 },
  row: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 12 }, quickButton: { flex: 1, alignItems: 'center', gap: 8, padding: 18, borderRadius: 20, borderWidth: 1 }, quickText: { fontWeight: '900' },
});
