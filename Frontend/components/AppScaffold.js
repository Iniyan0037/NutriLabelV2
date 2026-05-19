import React, { useCallback, useState } from 'react';
import { Alert, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { clearStoredAccount, getActiveProfile, getStoredAccount } from '../services/api';
import { getHighContrastPreference, setHighContrastPreference, theme } from '../services/accessibility';
import MotionPressable from './MotionPressable';

const NAV_ITEMS = [
  { key: 'Home', label: 'Home', icon: 'home-outline', route: 'Home', match: ['Home'] },
  { key: 'Analyze', label: 'Analyze', icon: 'scan-outline', route: 'Analyze', match: ['Analyze', 'Scan', 'ManualInput', 'Results', 'History'] },
  { key: 'Learn', label: 'Learn', icon: 'school-outline', route: 'AwarenessDashboard', match: ['AwarenessDashboard', 'AdditiveInfo', 'PersonalInsights', 'AwarenessTips', 'LearningGame'] },
  { key: 'Nutrition', label: 'Track', icon: 'nutrition-outline', route: 'Nutrition', match: ['Nutrition', 'AddFood', 'GoalSetting'] },
  { key: 'Profile', label: 'Profile', icon: 'person-outline', route: 'Profile', match: ['Profile', 'EditProfile', 'Questionnaire'] },
];

export default function AppScaffold({ navigation, current = 'Home', title, children, scroll = true, showTop = true, contentStyle }) {
  const [highContrast, setHighContrast] = useState(false);
  const [activeProfile, setActiveProfile] = useState(null);
  const [account, setAccount] = useState(null);
  const [showContrastTip, setShowContrastTip] = useState(false);
  const colors = theme(highContrast);

  const load = useCallback(async () => {
    setHighContrast(await getHighContrastPreference());
    setActiveProfile(await getActiveProfile());
    setAccount(await getStoredAccount());
    const seenTip = await AsyncStorage.getItem('NUTRILABEL_CONTRAST_HINT_SEEN');
    setShowContrastTip(!seenTip);
  }, []);

  useFocusEffect(useCallback(() => { load().catch(() => {}); }, [load]));

  const dismissContrastTip = async () => {
    setShowContrastTip(false);
    await AsyncStorage.setItem('NUTRILABEL_CONTRAST_HINT_SEEN', 'true');
  };

  const toggleTheme = async () => {
    const next = !highContrast;
    setHighContrast(next);
    await setHighContrastPreference(next);
    await dismissContrastTip();
  };

  const doLogout = async () => {
    await clearStoredAccount();
    navigation.replace('Login');
  };

  const logout = () => {
    const message = 'Are you sure you want to log out of this shared login?';
    if (Platform.OS === 'web') {
      if (window.confirm(message)) doLogout();
      return;
    }
    Alert.alert('Log out?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: doLogout },
    ]);
  };

  const top = showTop ? (
    <View style={styles.topBar}>
      <View style={styles.brandBlock}>
        <Text style={[styles.appName, { color: colors.text }]}>NutriLabel</Text>
        <Text numberOfLines={1} style={[styles.loginName, { color: colors.muted }]}>
          {account?.family_name ? `${account.family_name} login` : 'Shared login'}
        </Text>
      </View>

      <View style={styles.topRight}>
        <MotionPressable
          onPress={() => navigation.navigate('Profile')}
          scaleTo={1.02}
          style={[styles.profilePill, { backgroundColor: colors.card, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Open selected profile"
        >
          <Ionicons name="person-circle-outline" size={17} color={colors.primary} />
          <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.profilePillText, { color: colors.text }]}>{activeProfile?.profile_name || 'Profile'}</Text>
        </MotionPressable>

        <View style={styles.contrastWrap}>
          {showContrastTip ? (
            <MotionPressable
              onPress={dismissContrastTip}
              scaleTo={1.02}
              style={[styles.contrastTip, { backgroundColor: colors.card, borderColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Dismiss high contrast tip"
            >
              <Text style={[styles.contrastTipText, { color: colors.text }]}>High contrast available</Text>
              <Ionicons name="close" size={12} color={colors.muted} />
            </MotionPressable>
          ) : null}
          <MotionPressable
            onPress={toggleTheme}
            accessibilityRole="button"
            accessibilityLabel="Toggle high contrast theme"
            scaleTo={1.04}
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name={highContrast ? 'contrast' : 'contrast-outline'} size={20} color={colors.primary} />
          </MotionPressable>
        </View>

        <MotionPressable
          onPress={logout}
          accessibilityRole="button"
          accessibilityLabel="Log out"
          scaleTo={1.04}
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        </MotionPressable>
      </View>
    </View>
  ) : null;

  const body = (
    <View style={[styles.contentShell, contentStyle]}>
      {top}
      {title ? <Text style={[styles.screenTitle, { color: colors.text }]}>{title}</Text> : null}
      {typeof children === 'function' ? children({ colors, highContrast, account, activeProfile, setHighContrast }) : children}
      <View style={{ height: 96 }} />
    </View>
  );

  return (
    <LinearGradient colors={colors.gradient} style={styles.flex}>
      <StatusBar barStyle={highContrast ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.flex}>
        {scroll
          ? <ScrollView contentContainerStyle={styles.scrollContainer}>{body}</ScrollView>
          : <View style={[styles.scrollContainer, styles.flex]}>{body}</View>}
        <BottomNav navigation={navigation} colors={colors} current={current} />
      </SafeAreaView>
    </LinearGradient>
  );
}

function BottomNav({ navigation, colors, current }) {
  return (
    <View pointerEvents="box-none" style={styles.navOuter}>
      <View style={[styles.navWrap, { backgroundColor: colors.navBg || colors.card, borderColor: colors.border }]}> 
        {NAV_ITEMS.map((item) => {
          const active = item.match.includes(current) || item.key === current;
          return (
            <MotionPressable
              key={item.key}
              onPress={() => navigation.navigate(item.route)}
              style={styles.navItem}
              scaleTo={1.06}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.label}`}
            >
              <View style={[styles.navIconWrap, active && { backgroundColor: colors.navActiveBg || colors.card2, borderColor: colors.border }]}>
                <Ionicons name={item.icon} size={20} color={active ? colors.navActiveText || colors.primary : colors.muted} />
              </View>
              <Text numberOfLines={1} style={[styles.navLabel, { color: active ? colors.navActiveText || colors.primary : colors.muted }]}>{item.label}</Text>
              <View style={[styles.navDot, { backgroundColor: active ? colors.primary : 'transparent' }]} />
            </MotionPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContainer: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 0, alignItems: 'center' },
  contentShell: { width: '100%', maxWidth: 760 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 },
  brandBlock: { flex: 1, minWidth: 0 },
  appName: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  loginName: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 0 },
  profilePill: { width: 118, height: 38, paddingHorizontal: 9, borderRadius: 999, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  profilePillText: { flex: 1, fontSize: 12, lineHeight: 15, fontWeight: '900', textAlign: 'left' },
  contrastWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  contrastTip: { position: 'absolute', top: 42, right: -38, zIndex: 20, width: 172, minHeight: 34, borderRadius: 14, borderWidth: 1, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  contrastTipText: { flex: 1, fontSize: 10.5, lineHeight: 13, fontWeight: '900' },
  iconBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { fontSize: 30, fontWeight: '900', letterSpacing: -0.8, marginBottom: 14 },
  navOuter: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10 },
  navWrap: { width: '100%', maxWidth: 760, height: 76, borderRadius: 26, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  navItem: { flex: 1, minWidth: 0, height: 60, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  navIconWrap: { width: 34, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  navLabel: { fontSize: 10.5, lineHeight: 13, fontWeight: '900', marginTop: 1, textAlign: 'center' },
  navDot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
});
