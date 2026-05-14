import React, { useRef } from 'react';
import { Animated, Platform, Pressable } from 'react-native';

export default function MotionPressable({ children, style, disabled, onPress, scaleTo = 1.035, ...props }) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      friction: 5,
      tension: 190,
    }).start();
  };

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => !disabled && animateTo(scaleTo)}
      onPressOut={() => !disabled && animateTo(1)}
      onHoverIn={() => Platform.OS === 'web' && !disabled && animateTo(scaleTo)}
      onHoverOut={() => Platform.OS === 'web' && !disabled && animateTo(1)}
      style={({ pressed }) => [disabled ? { opacity: 0.52 } : null, pressed ? { opacity: 0.94 } : null]}
      {...props}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
