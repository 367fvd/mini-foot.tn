import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from "react-native";

export default function VillePicker({ label = "Ville", value, options = [], onChange, erreur, desactive }) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <View style={{ marginTop: 12 }}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.select, !!erreur && styles.erreurBord, desactive && { opacity: 0.5 }]}
        disabled={desactive}
        onPress={() => setOuvert(true)}
      >
        <Text style={{ color: value ? "#111827" : "#9ca3af" }}>
          {value || (desactive ? "Choisis d'abord un gouvernorat" : "Choisir une ville")}
        </Text>
        <Text>▼</Text>
      </TouchableOpacity>
      {!!erreur && <Text style={styles.erreur}>⚠️ {erreur}</Text>}

      <Modal visible={ouvert} animationType="slide" transparent onRequestClose={() => setOuvert(false)}>
        <View style={styles.fond}>
          <View style={styles.feuille}>
            <Text style={styles.titre}>Choisis ta ville</Text>
            <FlatList
              data={options}
              keyExtractor={(v) => v}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.ligne} onPress={() => { onChange(item); setOuvert(false); }}>
                  <Text style={[styles.texte, item === value && { color: "#16a34a", fontWeight: "bold" }]}>
                    {item === value ? "✓ " : ""}{item}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.fermer} onPress={() => setOuvert(false)}>
              <Text style={{ fontWeight: "bold" }}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: "bold", marginBottom: 4 },
  select: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, flexDirection: "row", justifyContent: "space-between", backgroundColor: "#fff" },
  erreurBord: { borderColor: "#dc2626", borderWidth: 2 },
  erreur: { color: "#dc2626", fontSize: 12, marginTop: 4 },
  fond: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  feuille: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "75%", padding: 16 },
  titre: { fontSize: 18, fontWeight: "bold", marginBottom: 8, textAlign: "center" },
  ligne: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  texte: { fontSize: 16 },
  fermer: { padding: 14, alignItems: "center", marginTop: 8 },
});