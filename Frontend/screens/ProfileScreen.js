import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useEffect } from 'react';

const PROFILE_OPTIONS = [
  { 
    id: 'vegan', 
    icon: 'leaf', 
    color: '#4CAF50',
    bgColor: '#E8F5E9',
    description: 'No animal products'
  },
  { 
    id: 'vegetarian', 
    icon: 'nutrition', 
    color: '#66BB6A',
    bgColor: '#F1F8E9',
    description: 'No meat or fish'
  },
  { 
    id: 'eggetarian', 
    icon: 'egg', 
    color: '#FFA726',
    bgColor: '#FFF3E0',
    description: 'Vegetarian + eggs'
  },
  { 
    id: 'halal', 
    icon: 'moon', 
    color: '#42A5F5',
    bgColor: '#E3F2FD',
    description: 'Islamic dietary laws'
  },
  { 
    id: 'Jain', 
    icon: 'flower', 
    color: '#FF7043',
    bgColor: '#FBE9E7',
    description: 'No root vegetables'
  },
  { 
    id: 'nut-free', 
    icon: 'close-circle', 
    color: '#EF5350',
    bgColor: '#FFEBEE',
    description: 'No nuts or peanuts'
  },
  { 
    id: 'dairy-free', 
    icon: 'water', 
    color: '#29B6F6',
    bgColor: '#E1F5FE',
    description: 'No milk products'
  },
  { 
    id: 'gluten-free', 
    icon: 'ban', 
    color: '#AB47BC',
    bgColor: '#F3E5F5',
    description: 'No wheat or gluten'
  },
];

export default function ProfileScreen({ navigation }) {
  const [selectedProfiles, setSelectedProfiles] = useState([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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
    <View style={styles.wrapper}>
      <LinearGradient
        colors={['#FAFDF8', '#F5FAF0', '#EFF6E8']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.leafDecor1}>
          <Ionicons name="leaf" size={120} color="rgba(139, 195, 74, 0.08)" />
        </View>
        <View style={styles.leafDecor2}>
          <Ionicons name="leaf" size={80} color="rgba(76, 175, 80, 0.06)" />
        </View>
        <View style={styles.leafDecor3}>
          <Ionicons name="leaf" size={100} color="rgba(139, 195, 74, 0.05)" />
        </View>
        
        <ScrollView 
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <View style={styles.headerIconContainer}>
              <View style={styles.headerIconBg}>
                <Ionicons name="restaurant" size={36} color="#4CAF50" />
              </View>
            </View>
            <Text style={styles.title}>Dietary Profiles</Text>
            <Text style={styles.subtitle}>
              Choose your dietary preferences and restrictions
            </Text>
          </Animated.View>

          <Animated.View 
            style={[
              styles.list,
              {
                opacity: fadeAnim,
              }
            ]}
          >
            {PROFILE_OPTIONS.map((profile, index) => {
              const isSelected = selectedProfiles.includes(profile.id);

              return (
                <Animated.View
                  key={profile.id}
                  style={{
                    opacity: fadeAnim,
                    transform: [{
                      translateX: slideAnim.interpolate({
                        inputRange: [0, 30],
                        outputRange: [0, index % 2 === 0 ? -30 : 30],
                      })
                    }]
                  }}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.optionCard,
                      isSelected && styles.optionCardSelected,
                      pressed && styles.optionCardPressed,
                    ]}
                    onPress={() => toggleProfile(profile.id)}
                  >
                    <View style={styles.optionContent}>
                      <View style={styles.optionLeft}>
                        <View style={[
                          styles.iconBox,
                          { backgroundColor: profile.bgColor }
                        ]}>
                          <Ionicons 
                            name={profile.icon} 
                            size={28} 
                            color={profile.color} 
                          />
                        </View>
                        
                        <View style={styles.textContainer}>
                          <Text style={styles.optionText}>
                            {profile.id}
                          </Text>
                          <Text style={styles.optionDescription}>
                            {profile.description}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.optionRight}>
                        {isSelected ? (
                          <View style={styles.checkmark}>
                            <Ionicons name="checkmark-circle" size={28} color="#FFB300" />
                          </View>
                        ) : (
                          <View style={styles.unchecked}>
                            <Ionicons name="ellipse-outline" size={28} color="#E0E0E0" />
                          </View>
                        )}
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </Animated.View>

          <View style={styles.summaryBox}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>Selected Profiles</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{selectedProfiles.length}</Text>
              </View>
            </View>
            
            <View style={styles.summaryContent}>
              {selectedProfiles.length > 0 ? (
                <View style={styles.tagsContainer}>
                  {selectedProfiles.map((profileId) => {
                    const profile = PROFILE_OPTIONS.find(p => p.id === profileId);
                    return (
                      <View key={profileId} style={[styles.tag, { backgroundColor: profile.bgColor }]}>
                        <Ionicons name={profile.icon} size={14} color={profile.color} />
                        <Text style={[styles.tagText, { color: profile.color }]}>{profileId}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="hand-left-outline" size={20} color="#BDBDBD" />
                  <Text style={styles.emptyText}>Tap options above to select</Text>
                </View>
              )}
            </View>
            
            <View style={styles.summaryLeafDecor}>
              <Ionicons name="leaf" size={60} color="rgba(139, 195, 74, 0.12)" />
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              selectedProfiles.length === 0 && styles.buttonDisabled,
            ]}
            onPress={() => navigation.navigate('Scan', { selectedProfiles })}
            disabled={selectedProfiles.length === 0}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="scan" size={22} color="#fff" />
              <Text style={styles.primaryButtonText}>Continue to Barcode Lookup</Text>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryButtonPressed,
            ]}
            onPress={() => navigation.navigate('ManualInput', { selectedProfiles })}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="create-outline" size={22} color="#4CAF50" />
              <Text style={styles.secondaryButtonText}>Skip to Manual Input</Text>
            </View>
          </Pressable>

          <View style={styles.footer}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#9E9E9E" />
            <Text style={styles.footerText}>Your data is private and secure</Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  leafDecor1: {
    position: 'absolute',
    top: 100,
    right: -30,
    transform: [{ rotate: '25deg' }],
    opacity: 0.6,
  },
  leafDecor2: {
    position: 'absolute',
    bottom: 200,
    left: -20,
    transform: [{ rotate: '-45deg' }],
    opacity: 0.5,
  },
  leafDecor3: {
    position: 'absolute',
    top: '50%',
    left: 20,
    transform: [{ rotate: '15deg' }],
    opacity: 0.4,
  },
  container: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  headerIconContainer: {
    marginBottom: 16,
  },
  headerIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2E7D32',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: '#757575',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 30,
  },
  list: {
    gap: 14,
    marginBottom: 24,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#F5F5F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  optionCardSelected: {
    borderColor: '#FFB300',
    shadowColor: '#FFB300',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  optionCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    textTransform: 'capitalize',
    marginBottom: 3,
  },
  optionDescription: {
    fontSize: 13,
    color: '#9E9E9E',
    fontWeight: '500',
  },
  optionRight: {
    marginLeft: 12,
  },
  checkmark: {
    opacity: 1,
  },
  unchecked: {
    opacity: 1,
  },
  summaryBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
  },
  countBadge: {
    backgroundColor: '#4CAF50',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  summaryContent: {
    minHeight: 50,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#BDBDBD',
    fontWeight: '500',
  },
  summaryLeafDecor: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    transform: [{ rotate: '-20deg' }],
    opacity: 0.8,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    paddingVertical: 18,
    marginBottom: 14,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.5,
    backgroundColor: '#BDBDBD',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 14,
    paddingVertical: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  secondaryButtonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: '#F1F8E9',
  },
  secondaryButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  footerText: {
    fontSize: 13,
    color: '#9E9E9E',
    fontWeight: '500',
  },
});