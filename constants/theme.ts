// shared colors, fonts, spacing and border radii
// add new colors here instead of hardcoding them in components

import { Platform } from 'react-native';

// Main color palette - teal accent with light/dark mode support
const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    // Additional colors for the queue UI
    cardBackground: '#fff',
    inputBorder: '#e2e8f0',
    successBackground: '#d1fae5',
    successText: '#065f46',
    warningBackground: '#fef3c7',
    warningText: '#92400e',
    dangerBackground: '#fee2e2',
    dangerText: '#991b1b',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    // Additional colors for the queue UI
    cardBackground: '#1e1e1e',
    inputBorder: '#3a3a3a',
    successBackground: '#064e3b',
    successText: '#d1fae5',
    warningBackground: '#78350f',
    warningText: '#fef3c7',
    dangerBackground: '#7f1d1d',
    dangerText: '#fee2e2',
  },
};

// Font families - matches the existing Fonts export
export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'Georgia',
    rounded: 'System',
    mono: 'Menlo',
  },
  android: {
    sans: 'Roboto',
    serif: 'serif',
    rounded: 'Roboto',
    mono: 'monospace',
  },
  default: {
    sans: 'System',
    serif: 'serif',
    rounded: 'System',
    mono: 'monospace',
  },
});

// Spacing scale for consistent layouts
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// Border radius scale
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
