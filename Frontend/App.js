import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import ScanScreen from './screens/ScanScreen';
import ManualInputScreen from './screens/ManualInputScreen';
import ResultScreen from './screens/ResultScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'NutriLabel' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Select Profiles' }} />
        <Stack.Screen name="Scan" component={ScanScreen} options={{ title: 'Barcode Lookup' }} />
        <Stack.Screen name="ManualInput" component={ManualInputScreen} options={{ title: 'Enter Ingredients' }} />
        <Stack.Screen name="Results" component={ResultScreen} options={{ title: 'Results' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
