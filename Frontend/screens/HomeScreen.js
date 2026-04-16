import { View, Text, StyleSheet, Pressable, Image } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/NTlogo.png')}
        style={styles.logo}
      />

      <Text style={styles.title}>NutriLabel</Text>
      <Text style={styles.subtitle}>
        Check packaged foods against dietary restrictions
      </Text>

      <Pressable
        style={styles.primaryButton}
        onPress={() => navigation.navigate('Profile')}
      >
        <Text style={styles.primaryButtonText}>Select Dietary Profiles</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 300,
    height: 80,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#444',
  },
  primaryButton: {
    backgroundColor: '#222',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});