import AsyncStorage from '@react-native-async-storage/async-storage';

export const HIGH_CONTRAST_KEY = 'HIGH_CONTRAST_MODE';

export async function getHighContrastPreference() {
  const value = await AsyncStorage.getItem(HIGH_CONTRAST_KEY);
  return value === 'true';
}

export async function setHighContrastPreference(value) {
  await AsyncStorage.setItem(HIGH_CONTRAST_KEY, String(Boolean(value)));
}

export function goBackSafely(navigation, fallback = 'Home') {
  if (navigation?.canGoBack?.()) {
    navigation.goBack();
  } else {
    navigation.navigate(fallback);
  }
}

export function getStatusConfig(status) {
  if (status === 'Safe' || status === 'Allowed') {
    return {
      label: 'Safe',
      color: '#4CAF50',
      bg: '#E8F5E9',
      icon: 'checkmark-circle',
      textIcon: '✅',
      meaning: 'This product has no direct conflict with the selected profile.',
    };
  }
  if (status === 'Restricted') {
    return {
      label: 'Restricted',
      color: '#EF5350',
      bg: '#FFEBEE',
      icon: 'close-circle',
      textIcon: '❌',
      meaning: 'This product has one or more conflicts with the selected profile.',
    };
  }
  return {
    label: 'Uncertain',
    color: '#FF9800',
    bg: '#FFF3E0',
    icon: 'help-circle',
    textIcon: '⚠️',
    meaning: 'This product needs further checking before use.',
  };
}

export function theme(highContrast) {
  if (highContrast) {
    return {
      isHC: true,
      gradient: ['#000000', '#111111', '#000000'],
      bg: '#000000',
      card: '#111111',
      card2: '#1b1b1b',
      text: '#FFFFFF',
      muted: '#E0E0E0',
      border: '#FFD700',
      primary: '#FFD700',
      primaryText: '#000000',
      secondary: '#FFFFFF',
      danger: '#FF6B6B',
    };
  }

  return {
    isHC: false,
    gradient: ['#FAFDF8', '#F5FAF0', '#EFF6E8'],
    bg: '#FAFDF8',
    card: '#FFFFFF',
    card2: '#F5F9F0',
    text: '#1B5E20',
    muted: '#5f6f52',
    border: '#DDECCF',
    primary: '#4CAF50',
    primaryText: '#FFFFFF',
    secondary: '#2E7D32',
    danger: '#EF5350',
  };
}
