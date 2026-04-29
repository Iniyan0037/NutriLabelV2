import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import {
  deleteProfile,
  displayProfile,
  fetchProfiles,
  normalizeProfiles,
} from '../services/api';
import {
  getHighContrastPreference,
  goBackSafely,
  theme,
} from '../services/accessibility';

export default function ProfileScreen({ navigation }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [highContrast, setHighContrast] = useState(false);

  const colors = theme(highContrast);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      setHighContrast(await getHighContrastPreference());

      const serverProfiles = await fetchProfiles();
      setProfiles(serverProfiles);
    } catch (error) {
      setProfiles([]);
      Alert.alert('Could not load profiles', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfiles();
    }, [])
  );

  const activateProfile = async (profile) => {
    const restrictions = normalizeProfiles(profile.restrictions || []);

    await AsyncStorage.setItem('PROFILE', JSON.stringify(restrictions));
    await AsyncStorage.setItem('ACTIVE_PROFILE', JSON.stringify(profile));

    navigation.navigate('Home', {
      profile: restrictions,
      activeProfile: profile,
    });
  };

  const handleDeleteProfile = (profile) => {
    Alert.alert(
      'Delete Profile',
      `Are you sure you want to delete "${profile.profile_name || 'this profile'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(profile.id);

              await deleteProfile(profile.id);

              const activeProfileRaw = await AsyncStorage.getItem('ACTIVE_PROFILE');
              const activeProfile = activeProfileRaw ? JSON.parse(activeProfileRaw) : null;

              if (activeProfile?.id === profile.id) {
                await AsyncStorage.removeItem('ACTIVE_PROFILE');
                await AsyncStorage.removeItem('PROFILE');
              }

              setProfiles((current) => current.filter((item) => item.id !== profile.id));
            } catch (error) {
              Alert.alert('Delete failed', error.message || 'Could not delete profile.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <LinearGradient colors={colors.gradient} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => goBackSafely(navigation, 'Home')}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name="arrow-back" size={26} color={colors.secondary} />
            </Pressable>

            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Saved Profiles
            </Text>

            <Pressable
              onPress={loadProfiles}
              accessibilityRole="button"
              accessibilityLabel="Refresh profiles"
            >
              <Ionicons name="refresh" size={24} color={colors.secondary} />
            </Pressable>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            Manage Profiles
          </Text>

          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Select an existing profile, edit it directly, delete profiles you no longer need,
            or create a new one.
          </Text>

          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Questionnaire')}
            accessibilityRole="button"
            accessibilityLabel="Create new dietary profile"
          >
            <Ionicons name="add-circle" size={24} color={colors.primaryText} />
            <Text style={[styles.primaryText, { color: colors.primaryText }]}>
              Create New Profile
            </Text>
          </Pressable>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.muted }]}>
                Loading profiles...
              </Text>
            </View>
          ) : profiles.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="person-circle-outline" size={72} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No Saved Profiles
              </Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Create a profile using the questionnaire. Saved profiles will appear here.
              </Text>
            </View>
          ) : (
            profiles.map((profile) => {
              const restrictions = normalizeProfiles(profile.restrictions || []);
              const isDeleting = deletingId === profile.id;

              return (
                <View
                  key={profile.id}
                  style={[
                    styles.profileCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  accessibilityLabel={`Profile ${profile.profile_name}`}
                >
                  <View style={styles.profileHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.profileTitle, { color: colors.text }]}>
                        {profile.profile_name || 'Unnamed Profile'}
                      </Text>
                      <Text style={[styles.profileSub, { color: colors.muted }]}>
                        {restrictions.length} restriction{restrictions.length === 1 ? '' : 's'}
                      </Text>
                    </View>

                    <Ionicons name="person" size={26} color={colors.primary} />
                  </View>

                  <View style={styles.tagsWrap}>
                    {restrictions.map((item) => (
                      <View
                        key={item}
                        style={[
                          styles.tag,
                          { backgroundColor: colors.card2, borderColor: colors.primary },
                        ]}
                      >
                        <Text style={[styles.tagText, { color: colors.text }]}>
                          {displayProfile(item)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.actionRow}>
                    <Pressable
                      style={[styles.smallButton, { backgroundColor: colors.primary }]}
                      onPress={() => activateProfile(profile)}
                      accessibilityRole="button"
                      accessibilityLabel={`Use profile ${profile.profile_name}`}
                      disabled={isDeleting}
                    >
                      <Text style={[styles.smallButtonText, { color: colors.primaryText }]}>
                        Use
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[styles.smallButtonOutline, { borderColor: colors.primary }]}
                      onPress={() => navigation.navigate('EditProfile', { profile })}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit profile ${profile.profile_name}`}
                      disabled={isDeleting}
                    >
                      <Text style={[styles.smallButtonOutlineText, { color: colors.secondary }]}>
                        Edit
                      </Text>
                    </Pressable>
                  </View>

                  <Pressable
                    style={[
                      styles.deleteButton,
                      {
                        borderColor: highContrast ? colors.border : '#EF5350',
                        backgroundColor: highContrast ? colors.card2 : '#FFEBEE',
                      },
                    ]}
                    onPress={() => handleDeleteProfile(profile)}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete profile ${profile.profile_name}`}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator color="#EF5350" />
                    ) : (
                      <>
                        <Ionicons name="trash" size={18} color="#EF5350" />
                        <Text style={styles.deleteButtonText}>Delete Profile</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: '900' },
  title: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
    marginBottom: 18,
  },
  primaryText: { fontSize: 17, fontWeight: '900' },
  centerBox: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, fontWeight: '700' },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 26,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 22, fontWeight: '900', marginTop: 12 },
  emptyText: { textAlign: 'center', lineHeight: 22, marginTop: 8 },
  profileCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileTitle: { fontSize: 20, fontWeight: '900' },
  profileSub: { marginTop: 3, fontWeight: '700' },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  tag: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  tagText: { fontWeight: '800', fontSize: 12 },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  smallButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  smallButtonText: { fontWeight: '900' },
  smallButtonOutline: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 2,
  },
  smallButtonOutlineText: { fontWeight: '900' },
  deleteButton: {
    marginTop: 12,
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  deleteButtonText: {
    color: '#EF5350',
    fontWeight: '900',
  },
});