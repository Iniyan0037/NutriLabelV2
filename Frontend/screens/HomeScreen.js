import { View, Text, StyleSheet, Pressable, Image } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Image source={require('../assets/NTlogo.png')} style={styles.logo} />
      <Text style={styles.title}>NutriLabel</Text>
      <Text style={styles.subtitle}>Check packaged foods against dietary restrictions</Text>

      <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Profile')}>
        <Text style={styles.primaryButtonText}>Select Dietary Profiles</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('ManualInput', { selectedProfiles: [] })}>
        <Text style={styles.secondaryButtonText}>Go Straight to Manual Input</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', padding: 20 },
  logo: { width: 300, height: 80, resizeMode: 'contain', marginBottom: 20 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 30, color: '#444' },
  primaryButton: { backgroundColor: '#222', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, width: '100%', alignItems: 'center', marginBottom: 14 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: { borderWidth: 1, borderColor: '#222', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, width: '100%', alignItems: 'center' },
  secondaryButtonText: { color: '#222', fontSize: 16, fontWeight: '600' },
});
