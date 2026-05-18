import React, { useCallback, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import AppScaffold from '../components/AppScaffold';
import MotionPressable from '../components/MotionPressable';
import { normalizeProfiles } from '../services/api';

export default function AnalyzeScreen({ navigation }) {
  const [profile, setProfile] = useState([]);

  const load = useCallback(async () => {
    const savedProfile = await AsyncStorage.getItem('PROFILE');
    setProfile(savedProfile ? normalizeProfiles(JSON.parse(savedProfile)) : []);
  }, []);

  useFocusEffect(useCallback(() => { load().catch(() => {}); }, [load]));

  const hasProfile = profile.length > 0;

  const requireProfile = (screen, params = {}) => {
    if (!hasProfile) {
      const msg = 'Create or select a profile first.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Profile required', msg);
      navigation.navigate('Profile');
      return;
    }
    navigation.navigate(screen, { profile, selectedProfiles: profile, ...params });
  };

  return (
    <AppScaffold navigation={navigation} current="Analyze" title="Analyze food">
      {({ colors }) => (
        <>
          <Text style={[styles.intro, { color: colors.muted }]}>Choose one clear path. Barcode lookup is for packaged products, while manual input includes OCR for ingredient labels.</Text>

          <ActionRow
            colors={colors}
            icon="barcode-outline"
            title="Scan barcode"
            text="Use the product barcode to fetch ingredients, nutrition and product images."
            onPress={() => requireProfile('Scan')}
            disabled={!hasProfile}
          />
          <ActionRow
            colors={colors}
            icon="document-text-outline"
            title="Manual ingredients or OCR label"
            text="Type ingredients manually or use OCR to extract ingredient text from a label image."
            onPress={() => requireProfile('ManualInput')}
            disabled={!hasProfile}
          />
          <ActionRow
            colors={colors}
            icon="time-outline"
            title="Profile history"
            text="Review previous results for the selected profile only."
            onPress={() => requireProfile('History')}
            disabled={!hasProfile}
          />

          {!hasProfile ? (
            <View style={[styles.warning, { backgroundColor: colors.card, borderColor: colors.danger }]}> 
              <Ionicons name="alert-circle-outline" size={22} color={colors.danger} />
              <Text style={[styles.warningText, { color: colors.text }]}>Set up a profile first so the analysis can apply the right restrictions.</Text>
            </View>
          ) : null}
        </>
      )}
    </AppScaffold>
  );
}

function ActionRow({ colors, icon, title, text, onPress, disabled }) {
  return (
    <MotionPressable disabled={disabled} onPress={onPress} scaleTo={1.03} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border, opacity: disabled ? 0.65 : 1 }]}> 
      <View style={[styles.iconBox, { backgroundColor: colors.card2, borderColor: colors.border }]}> 
        <Ionicons name={icon} size={25} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.rowText, { color: colors.muted }]}>{text}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.muted} />
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, lineHeight: 21, fontWeight: '700', marginBottom: 14 },
  row: { borderWidth: 1, borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  iconBox: { width: 52, height: 52, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 17, fontWeight: '900', letterSpacing: -0.2 },
  rowText: { fontSize: 13, lineHeight: 19, fontWeight: '700', marginTop: 3 },
  warning: { borderWidth: 1.5, borderRadius: 20, padding: 14, marginTop: 6, flexDirection: 'row', gap: 10, alignItems: 'center' },
  warningText: { flex: 1, fontWeight: '800', lineHeight: 20 },
});
