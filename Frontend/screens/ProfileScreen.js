import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';

const PROFILE_OPTIONS = [
  'vegan',
  'vegetarian',
  'eggetarian',
  'halal',
  'Jain',
  'nut-free',
  'dairy-free',
  'gluten-free',
];

export default function ProfileScreen({ navigation }) {
  const [selectedProfiles, setSelectedProfiles] = useState([]);

  const toggleProfile = (profile) => {
    setSelectedProfiles((current) =>
      current.includes(profile)
        ? current.filter((item) => item !== profile)
        : [...current, profile]
    );
  };

  const selectedSummary = useMemo(() => {
    return selectedProfiles.length > 0
      ? selectedProfiles.join(', ')
      : 'None selected yet';
  }, [selectedProfiles]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile Selection</Text>
      <Text style={styles.subtitle}>
        Select one or more dietary restrictions
      </Text>

      <View style={styles.list}>
        {PROFILE_OPTIONS.map((profile) => {
          const isSelected = selectedProfiles.includes(profile);

          return (
            <Pressable
              key={profile}
              style={[styles.optionCard, isSelected && styles.optionCardSelected]}
              onPress={() => toggleProfile(profile)}
            >
              <View style={styles.optionRow}>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {profile}
                </Text>
                <Text style={[styles.optionState, isSelected && styles.optionStateSelected]}>
                  {isSelected ? 'Selected' : 'Tap to select'}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>Selected Profiles</Text>
        <Text style={styles.summaryText}>{selectedSummary}</Text>
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={() => navigation.navigate('Scan', { selectedProfiles })}
      >
        <Text style={styles.primaryButtonText}>Continue to Barcode Lookup</Text>
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('ManualInput', { selectedProfiles })}
      >
        <Text style={styles.secondaryButtonText}>Skip to Manual Input</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#444',
  },
  list: {
    gap: 12,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
  },
  optionCardSelected: {
    backgroundColor: '#222',
    borderColor: '#222',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    textTransform: 'capitalize',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  optionState: {
    fontSize: 12,
    color: '#666',
  },
  optionStateSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  summaryBox: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f2f2f2',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
  },
  primaryButton: {
    marginTop: 24,
    backgroundColor: '#222',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#222',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
  },
  secondaryButtonText: {
    color: '#222',
    fontSize: 16,
    fontWeight: '600',
  },
});
