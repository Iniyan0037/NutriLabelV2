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
    if (!savedAccount) {
      navigation.replace('Login');
      return;
    }
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
  const firstName = activeProfile?.profile_name || 'Profile needed';

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

  const requireProfile = (screen, params = {}) => {
    if (!hasProfile) {
      const msg = 'Create or select a profile first. This keeps results, history, learning and nutrition tied to the correct person.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Profile required', msg);
      navigation.navigate('Profile');
      return;
    }
    navigation.navigate(screen, { profile, selectedProfiles: profile, ...params });
  };

  const nextStep = !hasProfile ? {
    title: 'Start with your dietary profile',
    body: 'Set up one profile before scanning. NutriLabel will then personalise analysis, history, games and nutrition tracking.',
    action: 'Create / select profile',
    icon: 'person-add-outline',
    onPress: () => navigation.navigate('Profile'),
  } : {
    title: `Ready for ${firstName}`,
    body: 'Scan a barcode, capture a label with OCR, or type ingredients manually. Your results will save only to this selected profile.',
    action: 'Scan or OCR a product',
    icon: 'scan-outline',
    onPress: () => requireProfile('Scan'),
  };

  return (
    <LinearGradient colors={colors.gradient} style={styles.flex}>
      <StatusBar barStyle={highContrast ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.topLine}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.accountText, { color: colors.muted }]}>Shared login</Text>
              <Text style={[styles.accountName, { color: colors.text }]}>{account?.family_name || 'Student household'}</Text>
            </View>
            <Pressable style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={toggleHighContrast}>
              <Ionicons name={highContrast ? 'contrast' : 'contrast-outline'} size={22} color={colors.primary} />
            </Pressable>
            <Pressable style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={logout}>
              <Ionicons name="log-out-outline" size={22} color={colors.danger} />
            </Pressable>
          </View>

          <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={styles.heroTop}>
              <Image source={require('../assets/NTlogo.png')} style={styles.logo} />
              <View style={[styles.statusPill, { backgroundColor: highContrast ? colors.primary : colors.card2, borderColor: colors.border }]}> 
                <Text style={[styles.statusPillText, { color: highContrast ? colors.primaryText : colors.text }]}>{hasProfile ? 'Profile active' : 'Setup needed'}</Text>
              </View>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Your food-label assistant</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Follow one simple flow: choose profile → analyse product → learn the risk → log nutrition if you ate it.</Text>
          </View>

          <View style={[styles.nextCard, { backgroundColor: colors.primary, borderColor: colors.primary }]}> 
            <View style={styles.nextIcon}><Ionicons name={nextStep.icon} size={25} color={colors.primaryText} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.nextTitle, { color: colors.primaryText }]}>{nextStep.title}</Text>
              <Text style={[styles.nextBody, { color: colors.primaryText }]}>{nextStep.body}</Text>
              <Pressable style={[styles.nextButton, { backgroundColor: highContrast ? '#000' : 'rgba(255,255,255,0.22)' }]} onPress={nextStep.onPress}>
                <Text style={[styles.nextButtonText, { color: colors.primaryText }]}>{nextStep.action}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.primaryText} />
              </Pressable>
            </View>
          </View>

          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={styles.cardHeader}>
              <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{firstName}</Text>
                <Text style={[styles.cardText, { color: colors.muted }]}>{hasProfile ? 'All screens will use this selected profile.' : 'Profiles are separate users under the same shared login.'}</Text>
              </View>
            </View>
            {hasProfile ? <View style={styles.tagsWrap}>{profile.map((item) => <View key={item} style={[styles.tag, { backgroundColor: colors.card2, borderColor: colors.primary }]}><Text style={[styles.tagText, { color: colors.text }]}>{displayProfile(item)}</Text></View>)}</View> : null}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>Main actions</Text>
          <View style={styles.grid}>
            <ActionCard colors={colors} icon="people-outline" title="Profiles" text="Create, select or edit" onPress={() => navigation.navigate('Profile')} />
            <ActionCard colors={colors} icon="scan-outline" title="Scan / OCR" text="Barcode or label photo" onPress={() => requireProfile('Scan')} disabled={!hasProfile} />
            <ActionCard colors={colors} icon="create-outline" title="Manual" text="Paste ingredients" onPress={() => requireProfile('ManualInput')} disabled={!hasProfile} />
            <ActionCard colors={colors} icon="time-outline" title="History" text="Profile-only results" onPress={() => requireProfile('History')} disabled={!hasProfile} />
          </View>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>Learn and improve</Text>
          <View style={styles.grid}>
            <ActionCard colors={colors} icon="game-controller-outline" title="Memory Game" text="Practice your profile risks" onPress={() => requireProfile('LearningGame')} disabled={!hasProfile} />
            <ActionCard colors={colors} icon="analytics-outline" title="Awareness" text="Australian recall insights" onPress={() => navigation.navigate('AwarenessDashboard')} />
            <ActionCard colors={colors} icon="nutrition-outline" title="Nutrition" text="Log macros and goals" onPress={() => requireProfile('Nutrition')} disabled={!hasProfile} />
            <ActionCard colors={colors} icon="bulb-outline" title="Tips" text="Shopping guidance" onPress={() => navigation.navigate('AwarenessTips')} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function ActionCard({ colors, icon, title, text, onPress, disabled }) {
  return (
    <Pressable style={[styles.actionCard, { backgroundColor: colors.card, borderColor: disabled ? colors.border : colors.border, opacity: disabled ? 0.5 : 1 }]} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: colors.card2, borderColor: colors.border }]}><Ionicons name={icon} size={24} color={colors.primary} /></View>
      <Text style={[styles.actionTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.actionText, { color: colors.muted }]}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  accountText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  accountName: { fontSize: 18, fontWeight: '900' },
  iconBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  hero: { borderWidth: 1, borderRadius: 28, padding: 20, marginBottom: 14 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  logo: { width: 145, height: 58, resizeMode: 'contain' },
  statusPill: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  statusPillText: { fontWeight: '900', fontSize: 12 },
  title: { fontSize: 30, fontWeight: '900', lineHeight: 36 },
  subtitle: { fontSize: 15, fontWeight: '700', lineHeight: 22, marginTop: 8 },
  nextCard: { borderWidth: 1, borderRadius: 24, padding: 18, flexDirection: 'row', gap: 14, marginBottom: 14 },
  nextIcon: { width: 42, height: 42, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.22)' },
  nextTitle: { fontSize: 18, fontWeight: '900' },
  nextBody: { fontSize: 13, fontWeight: '700', lineHeight: 20, marginTop: 4, opacity: 0.92 },
  nextButton: { alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 4 },
  nextButtonText: { fontWeight: '900' },
  profileCard: { borderRadius: 22, padding: 16, marginBottom: 18, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '900' },
  cardText: { fontSize: 13, fontWeight: '700', lineHeight: 19, marginTop: 2 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  tag: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  tagText: { fontWeight: '900', fontSize: 12 },
  sectionLabel: { fontSize: 18, fontWeight: '900', marginBottom: 10, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  actionCard: { width: '47.9%', minHeight: 142, borderWidth: 1, borderRadius: 22, padding: 14 },
  actionIcon: { width: 46, height: 46, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actionTitle: { fontSize: 16, fontWeight: '900' },
  actionText: { fontSize: 12, fontWeight: '700', lineHeight: 18, marginTop: 5 },
});
