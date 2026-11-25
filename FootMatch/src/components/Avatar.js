import React from "react";
import { View, Text } from "react-native";

export default function Avatar({ nom = "", taille = 84, fond = "#16a34a" }) {
  const initiales = nom.trim().split(/\s+/).slice(0, 2).map((m) => (m[0] || "").toUpperCase()).join("") || "?";
  return (
    <View style={{ width: taille, height: taille, borderRadius: taille / 2, backgroundColor: fond, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ color: "#fff", fontSize: taille * 0.38, fontWeight: "bold" }}>{initiales}</Text>
    </View>
  );
}