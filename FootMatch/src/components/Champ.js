import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";

export default function Champ({ label, erreur, aide, ...props }) {
  return (
    <View style={{ marginTop: 12 }}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        placeholderTextColor="#9ca3af"
        {...props}
        style={[styles.input, !!erreur && styles.erreurBord]}
      />
      {!!erreur ? (
        <Text style={styles.erreur}>⚠️ {erreur}</Text>
      ) : !!aide ? (
        <Text style={styles.aide}>{aide}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: "bold", marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, backgroundColor: "#fff" },
  erreurBord: { borderColor: "#dc2626", borderWidth: 2 },
  erreur: { color: "#dc2626", fontSize: 12, marginTop: 4 },
  aide: { color: "#666", fontSize: 12, marginTop: 4 },
});