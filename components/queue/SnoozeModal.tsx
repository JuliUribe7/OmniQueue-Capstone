// SnoozeModal COMPONENT
// Popup modal with iOS-style scroll picker for selecting snooze time
// Allows users to push their spot back if they're running late

import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../constants/theme';
import { SNOOZE_OPTIONS } from '../../hooks/useQueue';

interface SnoozeModalProps {
  visible: boolean;
  onClose: () => void;
  onSnooze: (minutes: number) => void;
}

const ITEM_HEIGHT = 44; // Height of each option in the picker
const VISIBLE_ITEMS = 5; // How many items visible at once

export function SnoozeModal({ visible, onClose, onSnooze }: SnoozeModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Reset to first option when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedIndex(0);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [visible]);

  // Handle scroll end to snap to nearest item
  const handleScrollEnd = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const newIndex = Math.round(y / ITEM_HEIGHT);

    if (newIndex !== selectedIndex && newIndex >= 0 && newIndex < SNOOZE_OPTIONS.length) {
      setSelectedIndex(newIndex);
    }
  };

  // Handle snooze button press
  const handleSnooze = () => {
    const minutes = SNOOZE_OPTIONS[selectedIndex].value;
    onSnooze(minutes);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Dark overlay background */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        {/* Modal content - stop propagation so tapping inside doesn't close */}
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modal}
          onPress={() => {}} // Prevents closing when tapping modal
        >
          <Text style={styles.title}>Running Late?</Text>
          <Text style={styles.subtitle}>
            Select how much extra time you need. We'll move you back in the queue.
          </Text>

          {/* Scroll wheel picker */}
          <View style={styles.pickerContainer}>
            {/* Highlight bar for selected item */}
            <View style={styles.pickerHighlight} />

            <ScrollView
              ref={scrollViewRef}
              style={styles.picker}
              contentContainerStyle={styles.pickerContent}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              onMomentumScrollEnd={handleScrollEnd}
            >
              {/* Top padding so first item can be centered */}
              <View style={{ height: ITEM_HEIGHT * 2 }} />

              {/* Render each time option */}
              {SNOOZE_OPTIONS.map((option, index) => {
                const isSelected = index === selectedIndex;
                const distance = Math.abs(index - selectedIndex);

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.pickerItem}
                    onPress={() => {
                      setSelectedIndex(index);
                      scrollViewRef.current?.scrollTo({
                        y: index * ITEM_HEIGHT,
                        animated: true,
                      });
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        isSelected && styles.pickerItemTextSelected,
                        { opacity: distance === 0 ? 1 : distance === 1 ? 0.6 : 0.3 },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Bottom padding so last item can be centered */}
              <View style={{ height: ITEM_HEIGHT * 2 }} />
            </ScrollView>
          </View>

          {/* Snooze button */}
          <TouchableOpacity style={styles.snoozeButton} onPress={handleSnooze}>
            <Text style={styles.snoozeButtonText}>Snooze My Spot</Text>
          </TouchableOpacity>

          {/* Cancel button */}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Never mind</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modal: {
    backgroundColor: Colors.dark.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg + 4,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.dark.icon,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  pickerContainer: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    width: '100%',
    marginBottom: Spacing.lg,
    position: 'relative',
  },
  pickerHighlight: {
    position: 'absolute',
    top: '50%',
    left: '10%',
    right: '10%',
    height: ITEM_HEIGHT,
    marginTop: -ITEM_HEIGHT / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.sm + 2,
    zIndex: 1,
    pointerEvents: 'none',
  },
  picker: {
    flex: 1,
  },
  pickerContent: {
    alignItems: 'center',
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  pickerItemText: {
    fontSize: 22,
    color: Colors.dark.text,
  },
  pickerItemTextSelected: {
    fontWeight: '600',
  },
  snoozeButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    width: '100%',
    marginBottom: Spacing.sm + 4,
  },
  snoozeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    padding: Spacing.sm,
  },
  cancelButtonText: {
    color: Colors.dark.icon,
    fontSize: 14,
  },
});
