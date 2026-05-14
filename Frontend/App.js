import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import IntroScreen from './screens/IntroScreen';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import AnalyzeScreen from './screens/AnalyzeScreen';
import ProfileScreen from './screens/ProfileScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import QuestionnaireScreen from './screens/QuestionnaireScreen';
import ScanScreen from './screens/ScanScreen';
import ManualInputScreen from './screens/ManualInputScreen';
import ResultScreen from './screens/ResultScreen';
import HistoryScreen from './screens/HistoryScreen';
import LearningGameScreen from './screens/LearningGameScreen';
import AwarenessDashboardScreen from './screens/AwarenessDashboardScreen';
import AdditiveInfoScreen from './screens/AdditiveInfoScreen';
import PersonalInsightsScreen from './screens/PersonalInsightsScreen';
import AwarenessTipsScreen from './screens/AwarenessTipsScreen';
import NutritionScreen from './screens/NutritionScreen';
import AddFoodScreen from './screens/AddFoodScreen';
import GoalSettingScreen from './screens/GoalSettingScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Intro" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Intro" component={IntroScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Analyze" component={AnalyzeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Questionnaire" component={QuestionnaireScreen} />
        <Stack.Screen name="Scan" component={ScanScreen} />
        <Stack.Screen name="ManualInput" component={ManualInputScreen} />
        <Stack.Screen name="Results" component={ResultScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="LearningGame" component={LearningGameScreen} />
        <Stack.Screen name="AwarenessDashboard" component={AwarenessDashboardScreen} />
        <Stack.Screen name="AdditiveInfo" component={AdditiveInfoScreen} />
        <Stack.Screen name="PersonalInsights" component={PersonalInsightsScreen} />
        <Stack.Screen name="AwarenessTips" component={AwarenessTipsScreen} />
        <Stack.Screen name="Nutrition" component={NutritionScreen} />
        <Stack.Screen name="AddFood" component={AddFoodScreen} />
        <Stack.Screen name="GoalSetting" component={GoalSettingScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
