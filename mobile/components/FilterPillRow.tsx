import React from "react";
import { ScrollView, StyleSheet, ViewStyle } from "react-native";
import { PillButton } from "./PillButton";

interface FilterPillRowProps<T extends string> {
  options: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
  style?: ViewStyle;
}

export function FilterPillRow<T extends string>({
  options,
  selected,
  onSelect,
  style,
}: FilterPillRowProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, style]}
      keyboardShouldPersistTaps="handled"
    >
      {options.map((opt) => (
        <PillButton
          key={opt}
          label={opt}
          selected={selected === opt}
          onPress={() => onSelect(opt)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});
