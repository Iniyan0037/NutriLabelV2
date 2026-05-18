import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AppScaffold from '../components/AppScaffold';
import MotionPressable from '../components/MotionPressable';
import { displayProfile, fetchAwarenessTips, getActiveProfile, normalizeProfiles } from '../services/api';

const FALLBACK_TIPS = [
  { id: 'check-may-contain', title: 'Read “may contain” statements', category: 'Allergen', body: 'For allergy profiles, the warning section can matter as much as the ingredient list.' },
  { id: 'scan-after-change', title: 'Scan again after packaging changes', category: 'Shopping', body: 'Recipes and suppliers can change, so do not rely only on an old result.' },
  { id: 'unknown-origin', title: 'Treat unclear origins as uncertain', category: 'Dietary', body: 'If an additive or flavour origin is not clear, check the package or manufacturer.' },
];

export default function AwarenessTipsScreen({ navigation }) {
  const [tips, setTips] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [done, setDone] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const profileList = normalizeProfiles(activeProfile?.restrictions || activeProfile?.profile || []);
  const storageKey = `TIPS_DONE_${activeProfile?.id || 'no_profile'}`;

  const load = async () => {
    try {
      setLoading(true);
      const profile = await getActiveProfile();
      setActiveProfile(profile);
      const selected = normalizeProfiles(profile?.restrictions || profile?.profile || []);
      const fetched = await fetchAwarenessTips(selected);
      const list = Array.isArray(fetched) ? fetched : fetched?.tips;
      setTips((list && list.length ? list : FALLBACK_TIPS).map((tip, index) => ({ id: tip.id || `tip_${index}`, title: tip.title || tip.tip_title || tip.category || 'Awareness tip', body: tip.body || tip.description || tip.tip_text || tip.text || '', category: tip.category || 'Tip' })));
      const raw = await AsyncStorage.getItem(`TIPS_DONE_${profile?.id || 'no_profile'}`);
      setDone(raw ? JSON.parse(raw) : {});
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load tips.');
      setTips(FALLBACK_TIPS);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const completed = useMemo(() => Object.values(done).filter(Boolean).length, [done]);
  const toggleTip = async (id) => {
    const next = { ...done, [id]: !done[id] };
    setDone(next);
    await AsyncStorage.setItem(storageKey, JSON.stringify(next));
  };

  return (
    <AppScaffold navigation={navigation} current="AwarenessDashboard" title="Tips">
      {({ colors }) => (
        <>
          <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={[styles.heroIcon, { backgroundColor: colors.card2, borderColor: colors.border }]}><Ionicons name="bulb-outline" size={25} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>Shopping checklist</Text>
              <Text style={[styles.heroText, { color: colors.muted }]}>Mark tips as done. The checklist is tied to the selected profile, so it becomes a practical habit instead of a static info page.</Text>
            </View>
          </View>

          <View style={[styles.progressCard, { backgroundColor: colors.primary }]}> 
            <Text style={[styles.progressValue, { color: colors.primaryText }]}>{completed}/{tips.length || 0}</Text>
            <Text style={[styles.progressText, { color: colors.primaryText }]}>tips checked for {profileList.length ? profileList.map(displayProfile).join(', ') : 'general food-label safety'}</Text>
          </View>

          {loading ? <ActivityIndicator color={colors.primary} /> : null}
          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

          {tips.map((tip) => {
            const checked = !!done[tip.id];
            return (
              <MotionPressable key={tip.id} onPress={() => toggleTip(tip.id)} style={[styles.tipCard, { backgroundColor: checked ? colors.card2 : colors.card, borderColor: checked ? colors.primary : colors.border }]}> 
                <View style={[styles.check, { backgroundColor: checked ? colors.primary : colors.card2, borderColor: checked ? colors.primary : colors.border }]}> 
                  <Ionicons name={checked ? 'checkmark' : 'ellipse-outline'} size={20} color={checked ? colors.primaryText : colors.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.category, { color: colors.primary }]}>{tip.category}</Text>
                  <Text style={[styles.tipTitle, { color: colors.text }]}>{tip.title}</Text>
                  <Text style={[styles.tipBody, { color: colors.muted }]}>{tip.body}</Text>
                </View>
              </MotionPressable>
            );
          })}
        </>
      )}
    </AppScaffold>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', gap: 14, borderWidth: 1, borderRadius: 26, padding: 16, marginBottom: 14 },
  heroIcon: { width: 52, height: 52, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 21, fontWeight: '900', letterSpacing: -0.4 },
  heroText: { fontSize: 13, lineHeight: 19, fontWeight: '700', marginTop: 5 },
  progressCard: { borderRadius: 24, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  progressValue: { fontSize: 28, fontWeight: '900' },
  progressText: { flex: 1, fontWeight: '800', lineHeight: 20 },
  error: { fontWeight: '900', marginBottom: 10 },
  tipCard: { flexDirection: 'row', gap: 13, borderWidth: 1, borderRadius: 22, padding: 15, marginBottom: 12 },
  check: { width: 38, height: 38, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  category: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7 },
  tipTitle: { fontSize: 16, fontWeight: '900', marginTop: 2 },
  tipBody: { fontSize: 13, lineHeight: 19, fontWeight: '700', marginTop: 5 },
});
