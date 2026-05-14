import React, { useRef } from 'react';
import { Animated, Platform, Pressable } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function MotionPressable({ children, style, disabled, onPress, scaleTo = 1.025, ...props }) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      friction: 7,
      tension: 170,
    }).start();
  };

  return (
    <AnimatedPressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => !disabled && animateTo(scaleTo)}
      onPressOut={() => !disabled && animateTo(1)}
      onHoverIn={() => Platform.OS === 'web' && !disabled && animateTo(scaleTo)}
      onHoverOut={() => Platform.OS === 'web' && !disabled && animateTo(1)}
      style={[
        style,
        disabled ? { opacity: 0.52 } : null,
        { transform: [{ scale }] },
      ]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
