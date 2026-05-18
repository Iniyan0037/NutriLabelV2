import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { displayProfile, normalizeProfiles, updateProfile } from '../services/api';
import { getHighContrastPreference, goBackSafely, theme } from '../services/accessibility';

const ALL_RESTRICTIONS = [
  'vegan',
  'vegetarian',
  'eggetarian',
  'Jain',
  'halal',
  'nut-free',
  'dairy-free',
  'gluten-free',
];

const PROFILE_EXPLANATIONS = {
  vegan: 'Avoids animal-derived ingredients such as milk, egg, gelatin and honey.',
  vegetarian: 'Avoids meat, fish and animal slaughter-derived ingredients.',
  eggetarian: 'Allows eggs but avoids meat, fish and other non-egg animal-derived ingredients.',
  Jain: 'Avoids root vegetables and animal-derived ingredients that conflict with Jain restrictions.',
  halal: 'Requires ingredients to comply with halal dietary requirements.',
  'nut-free': 'Avoids nuts and nut-derived ingredients such as peanut, almond, cashew and hazelnut.',
  'dairy-free': 'Avoids dairy-derived ingredients such as milk, whey, casein and lactose.',
  'gluten-free': 'Avoids gluten-containing ingredients such as wheat, barley, rye and malt.',
};

export default function EditProfileScreen({ route, navigation }) {
  const originalProfile = route.params?.profile || {};
  const [profileName, setProfileName] = useState(originalProfile.profile_name || 'My Dietary Profile');
  const [restrictions, setRestrictions] = useState(normalizeProfiles(originalProfile.restrictions || []));
  const [loading, setLoading] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const colors = theme(highContrast);

  useEffect(() => {
    getHighContrastPreference().then(setHighContrast).catch(() => {});
  }, []);

  const selectedSummary = useMemo(() => {
    if (restrictions.length === 0) return 'No restrictions selected';
    return restrictions.map(displayProfile).join(', ');
  }, [restrictions]);

  const toggleRestriction = (restriction) => {
    setRestrictions((current) => {
      if (current.includes(restriction)) return current.filter((item) => item !== restriction);
      return [...current, restriction];
    });
  };

  const buildExplanation = () => {
    const existing = originalProfile.explanation || {};
    const explanation = {};

    restrictions.forEach((restriction) => {
      explanation[restriction] = existing[restriction] || PROFILE_EXPLANATIONS[restriction] || 'Added manually while editing the profile.';
    });

    return explanation;
  };

  const handleSave = async () => {
    const finalName = profileName.trim();
    const finalRestrictions = normalizeProfiles(restrictions);

    if (!finalName) {
      Alert.alert('Profile name required', 'Please enter a profile name.');
      return;
    }

    if (finalRestrictions.length === 0) {
      Alert.alert('No restrictions selected', 'Please choose at least one restriction.');
      return;
    }

    if (!originalProfile.id) {
      Alert.alert('Missing profile ID', 'This profile cannot be updated because it has no saved ID.');
      return;
    }

    try {
      setLoading(true);
      const updated = await updateProfile(originalProfile.id, finalName, finalRestrictions, buildExplanation());
      await AsyncStorage.setItem('PROFILE', JSON.stringify(finalRestrictions));
      await AsyncStorage.setItem('ACTIVE_PROFILE', JSON.stringify(updated));
      Alert.alert('Profile updated', 'Your profile changes have been saved.');
      navigation.navigate('Home', { profile: finalRestrictions, activeProfile: updated });
    } catch (error) {
      Alert.alert('Update failed', error.message || 'Could not update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={colors.gradient} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => goBackSafely(navigation, 'Profile')} accessibilityRole="button" accessibilityLabel="Back to saved profiles">
              <Ionicons name="arrow-back" size={26} color={colors.secondary} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
            <View style={{ width: 26 }} />
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card2, borderColor: colors.border, color: colors.text }]}
              value={profileName}
              onChangeText={setProfileName}
              placeholder="Example: Mum's Halal Profile"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Edit profile name"
            />
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Dietary Restrictions</Text>
            <Text style={[styles.helperText, { color: colors.muted }]}>Toggle restrictions directly. You do not need to repeat the questionnaire.</Text>

            <View style={styles.restrictionGrid}>
              {ALL_RESTRICTIONS.map((restriction) => {
                const selected = restrictions.includes(restriction);
                return (
                  <Pressable
                    key={restriction}
                    style={[styles.restrictionChip, { borderColor: colors.primary }, selected && { backgroundColor: colors.primary }]}
                    onPress={() => toggleRestriction(restriction)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${displayProfile(restriction)} restriction`}
                  >
                    <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={selected ? colors.primaryText : colors.primary} />
                    <Text style={[styles.restrictionChipText, { color: selected ? colors.primaryText : colors.secondary }]}>{displayProfile(restriction)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Current Selection</Text>
            <Text style={[styles.summaryText, { color: colors.muted }]}>{selectedSummary}</Text>
          </View>

          <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={loading} accessibilityRole="button" accessibilityLabel="Save updated profile">
            {loading ? <ActivityIndicator color={colors.primaryText} /> : <Text style={[styles.primaryText, { color: colors.primaryText }]}>Save Updated Profile</Text>}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  headerTitle: { fontSize: 22, fontWeight: '900' },
  card: { borderRadius: 22, padding: 18, gap: 12, elevation: 3, marginBottom: 18, borderWidth: 1 },
  sectionTitle: { fontSize: 19, fontWeight: '900' },
  input: { borderWidth: 2, borderRadius: 16, padding: 14, fontSize: 16, fontWeight: '700' },
  helperText: { lineHeight: 20, fontWeight: '600' },
  restrictionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  restrictionChip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 2, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  restrictionChipText: { fontWeight: '900' },
  summaryText: { lineHeight: 22, fontWeight: '700' },
  primaryButton: { marginTop: 8, borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
  primaryText: { fontSize: 17, fontWeight: '900' },
});
