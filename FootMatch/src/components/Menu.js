import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export function Section({ titre, children }) {
  const items = React.Children.toArray(children);
  return (
    <View style={s.section}>
      {!!titre && <Text style={s.titre}>{titre}</Text>}
      <View style={s.boite}>
        {items.map((c, i) => (
          <View key={i}>
            {c}
            {i < items.length - 1 && <View style={s.sep} />}
          </View>
        ))}
      </View>
    </View>
  );
}

export function Ligne({ icone, titre, sous, onPress, danger, droite }) {
  return (
    <TouchableOpacity style={s.ligne} onPress={onPress} disabled={!onPress} activeOpacity={0.6}>
      <Text style={s.icone}>{icone}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[s.texte, danger && { color: "#dc2626" }]}>{titre}</Text>
        {!!sous && <Text style={s.sous}>{sous}</Text>}
      </View>
      {droite ? droite : onPress ? <Text style={s.fleche}>›</Text> : null}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  section: { marginTop: 20, paddingHorizontal: 16 },
  titre: { color: "#6b7280", fontWeight: "bold", fontSize: 12, marginBottom: 6, marginLeft: 4, textTransform: "uppercase" },
  boite: { backgroundColor: "#fff", borderRadius: 14, overflow: "hidden" },
  sep: { height: 1, backgroundColor: "#f3f4f6", marginLeft: 52 },
  ligne: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
  icone: { fontSize: 22, width: 28, textAlign: "center" },
  texte: { fontSize: 16, color: "#111827" },
  sous: { color: "#6b7280", fontSize: 12, marginTop: 2 },
  fleche: { fontSize: 24, color: "#9ca3af" },
});