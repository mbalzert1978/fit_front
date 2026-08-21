import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Ausrichtungsrahmen, optional mit Scanlinie. Die Kamera kommt als `children`,
 * damit derselbe Rahmen für Barcode-Scan und Tabellen-Aufnahme dient.
 */
export function CameraFrame({
  children,
  height = 300,
  scanline = false,
  hint,
  style,
}: {
  children?: React.ReactNode;
  height?: number;
  scanline?: boolean;
  hint?: string;
  style?: ViewStyle;
}) {
  const t = useTheme();
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!scanline) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scanline, y]);

  return (
    <View style={[{ height, backgroundColor: t.color.cameraBg, overflow: 'hidden' }, style]}>
      {children}
      <View
        style={{
          position: 'absolute',
          left: 36,
          right: 36,
          top: height * 0.3,
          height: height * 0.4,
          borderWidth: 2,
          borderColor: 'rgba(255,255,255,0.9)',
        }}
      />
      {scanline ? (
        <Animated.View
          style={{
            position: 'absolute',
            left: 36,
            right: 36,
            height: 2,
            backgroundColor: t.color.accent,
            transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [height * 0.32, height * 0.68] }) }],
          }}
        />
      ) : null}
      {hint ? (
        <Text style={[t.font.label, { position: 'absolute', left: t.gutter, bottom: t.space[4], color: '#ffffff' }]}>{hint}</Text>
      ) : null}
    </View>
  );
}
