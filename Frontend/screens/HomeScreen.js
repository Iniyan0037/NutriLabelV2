import React, { useCallback, useState } from 'react';
import { Alert, Image, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import AppScaffold from '../components/AppScaffold';
import MotionPressable from '../components/MotionPressable';
import { clearStoredAccount, displayProfile, getStoredAccount, normalizeProfiles } from '../services/api';

export default function HomeScreen({ navigation, route }) {
  const [profile, setProfile] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [account, setAccount] = useState(null);

  const load = useCallback(async () => {
    const savedAccount = await getStoredAccount();
    if (!savedAccount) {
      navigation.replace('Login');
      return;
    }
    setAccount(savedAccount);
    const savedProfile = await AsyncStorage.getItem('PROFILE');
    const savedActiveProfile = await AsyncStorage.getItem('ACTIVE_PROFILE');
    setProfile(savedProfile ? normalizeProfiles(JSON.parse(savedProfile)) : []);
    setActiveProfile(savedActiveProfile ? JSON.parse(savedActiveProfile) : null);
  }, [navigation]);

  useFocusEffect(useCallback(() => { load().catch(() => {}); }, [load]));

  React.useEffect(() => {
    if (route.params?.profile) setProfile(normalizeProfiles(route.params.profile));
    if (route.params?.activeProfile) setActiveProfile(route.params.activeProfile);
  }, [route.params]);

  const hasProfile = profile.length > 0;

  const logout = async () => {
    const confirmed = Platform.OS === 'web' ? window.confirm('Log out of this shared login?') : true;
    if (!confirmed) return;
    await clearStoredAccount();
    navigation.replace('Login');
  };

  const requireProfile = (screen, params = {}) => {
    if (!hasProfile) {
      const msg = 'Select or create a profile first. This keeps analysis, history, learning and nutrition tied to the correct person.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Profile required', msg);
      navigation.navigate('Profile');
      return;
    }
    navigation.navigate(screen, { profile, selectedProfiles: profile, ...params });
  };

  return (
    <AppScaffold navigation={navigation} current="Home" showTop={false}>
      {({ colors, highContrast }) => (
        <>
          <View style={styles.topLine}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kicker, { color: colors.muted }]}>NutriLabel</Text>
              <Text style={[styles.topName, { color: colors.text }]}>{account?.family_name || 'Shared student-household login'}</Text>
            </View>
            <MotionPressable onPress={logout} style={[styles.logoutBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            </MotionPressable>
          </View>

          <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Image source={require('../assets/NTlogo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.heroTitle, { color: colors.text }]}>Read the label. Know the risk. Track what matters.</Text>
            <Text style={[styles.heroSub, { color: colors.muted }]}>A cleaner flow for food decisions: analyse first, learn the reason, then log nutrition when needed.</Text>
          </View>

          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.profileTop}>
              <View style={[styles.avatar, { backgroundColor: colors.card2, borderColor: colors.border }]}>
                <Ionicons name="person" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.profileName, { color: colors.text }]}>{activeProfile?.profile_name || 'Choose a profile'}</Text>
                <Text style={[styles.profileSub, { color: colors.muted }]}>{hasProfile ? 'This profile controls results, history, game prompts and nutrition logs.' : 'Start here before using the app.'}</Text>
              </View>
              <MotionPressable onPress={() => navigation.navigate('Profile')} style={[styles.changeBtn, { backgroundColor: colors.primary }]}>
                <Text style={[styles.changeText, { color: colors.primaryText }]}>{hasProfile ? 'Change' : 'Set up'}</Text>
              </MotionPressable>
            </View>
            {hasProfile ? <View style={styles.tagsWrap}>{profile.map((item) => <View key={item} style={[styles.tag, { backgroundColor: colors.card2, borderColor: colors.border }]}><Text style={[styles.tagText, { color: colors.text }]}>{displayProfile(item)}</Text></View>)}</View> : null}
          </View>

          <View style={[styles.dailyCard, { backgroundColor: colors.primary, borderColor: colors.primary }]}> 
            <Ionicons name="flame-outline" size={26} color={colors.primaryText} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.dailyTitle, { color: colors.primaryText }]}>Today’s suggested step</Text>
              <Text style={[styles.dailySub, { color: colors.primaryText }]}>{hasProfile ? 'Play one memory round for this profile before shopping. It helps you remember hidden risky ingredients.' : 'Create a profile so NutriLabel can personalise every screen.'}</Text>
            </View>
            <MotionPressable onPress={() => hasProfile ? requireProfile('LearningGame') : navigation.navigate('Profile')} style={[styles.dailyAction, { backgroundColor: highContrast ? '#000000' : 'rgba(255,255,255,0.24)' }]}>
              <Text style={[styles.dailyActionText, { color: colors.primaryText }]}>{hasProfile ? 'Play' : 'Start'}</Text>
            </MotionPressable>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Analyse food</Text>
          <View style={styles.actionGrid}>
            <ActionCard colors={colors} icon="scan-outline" title="Scan or OCR" text="Barcode or label photo" onPress={() => requireProfile('Scan')} disabled={!hasProfile} />
            <ActionCard colors={colors} icon="create-outline" title="Manual input" text="Paste ingredients" onPress={() => requireProfile('ManualInput')} disabled={!hasProfile} />
            <ActionCard colors={colors} icon="time-outline" title="History" text="Saved to this profile" onPress={() => requireProfile('History')} disabled={!hasProfile} />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Improve decisions</Text>
          <View style={styles.actionGrid}>
            <ActionCard colors={colors} icon="analytics-outline" title="Awareness" text="Australian recall charts" onPress={() => navigation.navigate('AwarenessDashboard')} />
            <ActionCard colors={colors} icon="game-controller-outline" title="Memory game" text="Daily profile practice" onPress={() => requireProfile('LearningGame')} disabled={!hasProfile} />
            <ActionCard colors={colors} icon="nutrition-outline" title="Nutrition" text="Food log and macros" onPress={() => requireProfile('Nutrition')} disabled={!hasProfile} />
          </View>
        </>
      )}
    </AppScaffold>
  );
}

function ActionCard({ colors, icon, title, text, onPress, disabled }) {
  return (
    <MotionPressable disabled={disabled} onPress={onPress} style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.actionIcon, { backgroundColor: colors.card2, borderColor: colors.border }]}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <Text style={[styles.actionTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.actionText, { color: colors.muted }]}>{text}</Text>
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  topLine: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  kicker: { fontSize: 12, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  topName: { fontSize: 19, fontWeight: '900', letterSpacing: -0.3 },
  logoutBtn: { width: 44, height: 44, borderWidth: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: 30, borderWidth: 1, padding: 20, marginBottom: 14 },
  logo: { width: 190, height: 68, alignSelf: 'center', marginBottom: 12 },
  heroTitle: { fontSize: 27, lineHeight: 32, fontWeight: '900', textAlign: 'center', letterSpacing: -0.8 },
  heroSub: { fontSize: 14, lineHeight: 21, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  profileCard: { borderRadius: 24, borderWidth: 1, padding: 16, marginBottom: 14 },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: 18, fontWeight: '900' },
  profileSub: { fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 2 },
  changeBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  changeText: { fontWeight: '900', fontSize: 12 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  tagText: { fontWeight: '900', fontSize: 12 },
  dailyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 24, borderWidth: 1, padding: 16, marginBottom: 18 },
  dailyTitle: { fontSize: 16, fontWeight: '900' },
  dailySub: { fontSize: 12, lineHeight: 17, fontWeight: '700', opacity: 0.92, marginTop: 2 },
  dailyAction: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 16 },
  dailyActionText: { fontWeight: '900' },
  sectionTitle: { fontSize: 19, fontWeight: '900', letterSpacing: -0.2, marginBottom: 10, marginTop: 2 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  actionCard: { width: '31%', minWidth: 104, flexGrow: 1, borderWidth: 1, borderRadius: 22, padding: 14, minHeight: 132 },
  actionIcon: { width: 42, height: 42, borderWidth: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actionTitle: { fontSize: 15, fontWeight: '900', letterSpacing: -0.2 },
  actionText: { fontSize: 11, lineHeight: 16, fontWeight: '700', marginTop: 4 },
});
