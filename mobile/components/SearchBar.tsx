import React from "react";
import { View, TextInput, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../services/theme";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: object;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = "Search...",
  style,
}) => {
  const { colors, clayInputStyle } = useTheme();

  return (
    <View style={[styles.wrapper, style]}>
      <View style={[clayInputStyle, styles.container]}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }]}
        />
        {value.length > 0 && (
          <Pressable onPress={() => onChangeText("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
});
