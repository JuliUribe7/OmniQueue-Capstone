// Staff Login — PIN entry screen for admins and staff
// Access the dashboard by entering the staff PIN

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Vibration,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { BorderRadius, Spacing } from '@/constants/theme';

const STAFF_PIN = '1234';

export default function StaffLogin() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  function handlePress(digit: string) {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      if (newPin === STAFF_PIN) {
        router.replace('/dashboard');
      } else {
        Vibration.vibrate(400);
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 800);
      }
    }
  }

  function handleDelete() {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  }

  const dots = [0, 1, 2, 3];
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', '⌫'],
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.inner}>
        <Text style={styles.title}>Staff Access</Text>
        <Text style={styles.subtitle}>Enter your PIN to continue</Text>

        {/* PIN dots */}
        <View style={styles.dotsRow}>
          {dots.map(i => (
            <View
              key={i}
              style={[
                styles.dot,
                pin.length > i && styles.dotFilled,
                error && styles.dotError,
              ]}
            />
          ))}
        </View>

        {error && <Text style={styles.errorText}>Incorrect PIN</Text>}

        {/* Keypad */}
        <View style={styles.keypad}>
          {keys.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keyRow}>
              {row.map((key, keyIndex) => {
                if (key === '') {
                  return <View key={keyIndex} style={styles.keyEmpty} />;
                }
                return (
                  <TouchableOpacity
                    key={keyIndex}
                    style={styles.key}
                    onPress={() => key === '⌫' ? handleDelete() : handlePress(key)}
                    activeOpacity={0.6}
                  >
                    <Text style={key === '⌫' ? styles.keyTextDelete : styles.keyText}>
                      {key}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151718',
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 15,
    marginTop: -Spacing.md,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginVertical: Spacing.md,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#3a3a3a',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  dotError: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: -Spacing.sm,
  },
  keypad: {
    gap: Spacing.md,
    width: '100%',
    maxWidth: 300,
    marginTop: Spacing.md,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  key: {
    flex: 1,
    aspectRatio: 1.4,
    backgroundColor: '#1e1e1e',
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  keyEmpty: {
    flex: 1,
    aspectRatio: 1.4,
  },
  keyText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
  },
  keyTextDelete: {
    color: '#9ba1a6',
    fontSize: 22,
  },
});