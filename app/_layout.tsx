// Entry point for the app — sets up navigation and the dark background theme

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';

export default function RootLayout() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#151718' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="waiting" />
        <Stack.Screen name="staff-login" />
        <Stack.Screen name="[businessId]/index" />
        <Stack.Screen name="[businessId]/waiting" />
        <Stack.Screen name="[businessId]/dashboard" />
        <Stack.Screen name="admin/index" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151718',
  },
});
