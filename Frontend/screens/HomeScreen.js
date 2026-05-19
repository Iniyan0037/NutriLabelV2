import React, { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import AppScaffold from '../components/AppScaffold';
import MotionPressable from '../components/MotionPressable';
import { displayProfile, getStoredAccount, normalizeProfiles } from '../services/api';

export default function HomeScreen({ navigation, route }) {
  const [profile, setProfile] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);

  const load = useCallback(async () => {
    const savedAccount = await getStoredAccount();
    if (!savedAccount) {
      navigation.replace('Login');
      return;
    }
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

  const hasProfile = Boolean(activeProfile?.id || activeProfile?.profile_name);

  return (
    <AppScaffold navigation={navigation} current="Home">
      {({ colors }) => (
        <>
          <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Image source={require('../assets/NTlogo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.heroTitle, { color: colors.text }]}>Understand food labels before you eat.</Text>
            <Text style={[styles.heroSub, { color: colors.muted }]}>NutriLabel checks ingredients, allergens, additives and nutrition against the selected profile.</Text>
          </View>

          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: colors.card2, borderColor: colors.border }]}> 
                <Ionicons name="person-outline" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardLabel, { color: colors.muted }]}>Current profile</Text>
                <Text numberOfLines={1} style={[styles.profileName, { color: colors.text }]}>{activeProfile?.profile_name || 'No profile selected'}</Text>
              </View>
              <MotionPressable onPress={() => navigation.navigate('Profile')} style={[styles.smallBtn, { backgroundColor: colors.primary }]}> 
                <Text style={[styles.smallBtnText, { color: colors.primaryText }]}>{hasProfile ? 'Change' : 'Set up'}</Text>
              </MotionPressable>
            </View>
            {hasProfile ? (
              profile.length > 0 ? (
                <View style={styles.tagsWrap}>
                  {profile.map((item) => (
                    <View key={item} style={[styles.tag, { backgroundColor: colors.card2, borderColor: colors.border }]}> 
                      <Text numberOfLines={1} style={[styles.tagText, { color: colors.text }]}>{displayProfile(item)}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={[styles.noRestrictionPill, { backgroundColor: colors.card2, borderColor: colors.border }]}> 
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
                  <Text style={[styles.noRestrictionText, { color: colors.text }]}>No dietary restrictions selected</Text>
                </View>
              )
            ) : (
              <Text style={[styles.profileNote, { color: colors.muted }]}>Create or select a profile so results, history, learning progress and nutrition logs stay separate.</Text>
            )}
          </View>

          <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: colors.card2, borderColor: colors.border }]}> 
                <Ionicons name="today-outline" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardLabel, { color: colors.muted }]}>Today’s suggested steps</Text>
                <Text style={[styles.planTitle, { color: colors.text }]}>{hasProfile ? 'Use NutriLabel in this order' : 'Start with a profile'}</Text>
              </View>
            </View>

            <Step
              colors={colors}
              number="1"
              text={hasProfile ? 'Warm up with the profile memory game.' : 'Create or select your profile.'}
              icon={hasProfile ? 'game-controller-outline' : 'person-add-outline'}
              actionLabel={hasProfile ? 'Game' : 'Profile'}
              onPress={() => navigation.navigate(hasProfile ? 'LearningGame' : 'Profile')}
            />
            <Step
              colors={colors}
              number="2"
              text={hasProfile ? 'Check the next packaged food before deciding.' : 'Return to the home screen once a profile is active.'}
              icon={hasProfile ? 'barcode-outline' : 'home-outline'}
              actionLabel={hasProfile ? 'Scan' : 'Home'}
              onPress={() => navigation.navigate(hasProfile ? 'Scan' : 'Home')}
            />
            <Step
              colors={colors}
              number="3"
              text={hasProfile ? 'Log the food after consumption.' : 'Use the bottom tabs to analyse, learn and track.'}
              icon={hasProfile ? 'analytics-outline' : 'nutrition-outline'}
              actionLabel={hasProfile ? 'Track' : 'Track'}
              onPress={() => navigation.navigate('Nutrition')}
            />
          </View>
        </>
      )}
    </AppScaffold>
  );
}

function Step({ colors, number, text, icon, actionLabel, onPress }) {
  return (
    <View style={styles.stepRow}>
      <View style={[styles.stepCircle, { backgroundColor: colors.primary }]}><Text style={[styles.stepNumber, { color: colors.primaryText }]}>{number}</Text></View>
      <Text style={[styles.stepText, { color: colors.text }]}>{text}</Text>
      <MotionPressable
        onPress={onPress}
        scaleTo={1.05}
        style={[styles.stepAction, { backgroundColor: colors.card2, borderColor: colors.primary }]}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
      >
        <Ionicons name={icon} size={18} color={colors.primary} />
        <Text numberOfLines={1} style={[styles.stepActionText, { color: colors.primary }]}>{actionLabel}</Text>
      </MotionPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 30, borderWidth: 1, padding: 20, marginBottom: 14 },
  logo: { width: 184, height: 66, alignSelf: 'center', marginBottom: 10 },
  heroTitle: { fontSize: 25, lineHeight: 31, fontWeight: '900', textAlign: 'center', letterSpacing: -0.7 },
  heroSub: { fontSize: 13.5, lineHeight: 21, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  profileCard: { borderRadius: 24, borderWidth: 1, padding: 16, marginBottom: 14 },
  planCard: { borderRadius: 24, borderWidth: 1, padding: 16, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardIcon: { width: 46, height: 46, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  profileName: { fontSize: 19, fontWeight: '900', marginTop: 2 },
  planTitle: { fontSize: 18, fontWeight: '900', marginTop: 2, lineHeight: 23 },
  smallBtn: { width: 76, minHeight: 40, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  smallBtnText: { fontWeight: '900', fontSize: 12 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, maxWidth: '47%' },
  tagText: { fontWeight: '900', fontSize: 12 },
  noRestrictionPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  noRestrictionText: { fontWeight: '900', fontSize: 12 },
  profileNote: { fontWeight: '700', lineHeight: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  stepCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', paddingTop: 0 },
  stepNumber: { fontWeight: '900', fontSize: 14, lineHeight: 30, textAlign: 'center', includeFontPadding: false, textAlignVertical: 'center' },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '800' },
  stepAction: { minWidth: 72, minHeight: 42, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, gap: 1 },
  stepActionText: { fontSize: 10.5, fontWeight: '900' },
});
