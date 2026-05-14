import React, { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getActiveProfile, getStoredAccount } from '../services/api';
import { getHighContrastPreference, setHighContrastPreference, theme } from '../services/accessibility';
import MotionPressable from './MotionPressable';

const NAV_ITEMS = [
  { key: 'Home', label: 'Analyse', icon: 'scan-outline', route: 'Home' },
  { key: 'AwarenessDashboard', label: 'Learn', icon: 'analytics-outline', route: 'AwarenessDashboard' },
  { key: 'Nutrition', label: 'Track', icon: 'nutrition-outline', route: 'Nutrition' },
  { key: 'LearningGame', label: 'Game', icon: 'game-controller-outline', route: 'LearningGame' },
  { key: 'Profile', label: 'Profile', icon: 'person-outline', route: 'Profile' },
];

export default function AppScaffold({ navigation, current="Home", title, children, scroll = true, showTop = true, contentStyle }) {
  const [highContrast, setHighContrast] = useState(false);
  const [activeProfile, setActiveProfile] = useState(null);
  const [account, setAccount] = useState(null);
  const colors = theme(highContrast);

  const load = useCallback(async () => {
    setHighContrast(await getHighContrastPreference());
    setActiveProfile(await getActiveProfile());
    setAccount(await getStoredAccount());
  }, []);

  useFocusEffect(useCallback(() => { load().catch(() => {}); }, [load]));

  const toggleTheme = async () => {
    const next = !highContrast;
    setHighContrast(next);
    await setHighContrastPreference(next);
  };

  const top = showTop ? (
    <View style={styles.topBar}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.smallLabel, { color: colors.muted }]}>Selected profile</Text>
        <Text numberOfLines={1} style={[styles.profileName, { color: colors.text }]}>{activeProfile?.profile_name || 'No profile selected'}</Text>
      </View>
      <MotionPressable onPress={toggleTheme} style={[styles.themeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name={highContrast ? 'contrast' : 'contrast-outline'} size={20} color={colors.primary} />
      </MotionPressable>
    </View>
  ) : null;

  const body = (
    <>
      {top}
      {title ? <Text style={[styles.screenTitle, { color: colors.text }]}>{title}</Text> : null}
      {typeof children === 'function' ? children({ colors, highContrast, account, activeProfile, setHighContrast }) : children}
      <View style={{ height: 92 }} />
    </>
  );

  return (
    <LinearGradient colors={colors.gradient} style={styles.flex}>
      <StatusBar barStyle={highContrast ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.flex}>
        {scroll ? <ScrollView contentContainerStyle={[styles.container, contentStyle]}>{body}</ScrollView> : <View style={[styles.container, styles.flex, contentStyle]}>{body}</View>}
        <BottomNav navigation={navigation} colors={colors} current={current} />
      </SafeAreaView>
    </LinearGradient>
  );
}

function BottomNav({ navigation, colors, current }) {
  return (
    <View style={[styles.navWrap, { backgroundColor: colors.card, borderColor: colors.border }]}> 
      {NAV_ITEMS.map((item) => {
        const active = item.key === current;
        return (
          <MotionPressable key={item.key} onPress={() => navigation.navigate(item.route)} style={[styles.navItem, active && { backgroundColor: colors.primary }]} scaleTo={1.08}>
            <Ionicons name={item.icon} size={20} color={active ? colors.primaryText : colors.muted} />
            <Text style={[styles.navLabel, { color: active ? colors.primaryText : colors.muted }]}>{item.label}</Text>
          </MotionPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 0 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  smallLabel: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.9 },
  profileName: { fontSize: 18, fontWeight: '900', letterSpacing: -0.2 },
  themeBtn: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { fontSize: 29, fontWeight: '900', letterSpacing: -0.8, marginBottom: 14 },
  navWrap: { position: 'absolute', left: 14, right: 14, bottom: 14, borderRadius: 28, borderWidth: 1, padding: 8, flexDirection: 'row', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 20, gap: 2 },
  navLabel: { fontSize: 10, fontWeight: '900' },
});
