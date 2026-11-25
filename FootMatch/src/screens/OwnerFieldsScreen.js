import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { messageErreur } from "../utils/erreurs";

export default function OwnerFieldsScreen({ navigation }) {
  const { user } = useAuth();
  const [terrains, setTerrains] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "fields"), where("proprietaireId", "==", user.uid));
    return onSnapshot(
      q,
      (s) => setTerrains(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => Alert.alert("Erreur", messageErreur(e))
    );
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={terrains}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={styles.vide}>Tu n'as pas encore de terrain.{"\n"}Ajoute le premier : il apparaîtra sur la carte des joueurs.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.entete}>
              <Text style={styles.nom}>🏟️ {item.nom}</Text>
              <Text style={{ color: item.actif === false ? "#dc2626" : "#16a34a", fontWeight: "bold" }}>
                {item.actif === false ? "Fermé" : "Ouvert"}
              </Text>
            </View>
            <Text style={styles.info}>📍 {item.adresse}</Text>
            <Text style={styles.info}>💰 {item.prix} DT / heure · 🕒 {(item.creneaux || []).length} créneaux</Text>
            <View style={styles.rangee}>
              <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate("OwnerPlanning", { field: item })}>
                <Text style={styles.btnText}>📅 Planning</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: "#2563eb" }]} onPress={() => navigation.navigate("FieldForm", { field: item })}>
                <Text style={styles.btnText}>✏️ Modifier</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("FieldForm")}>
        <Text style={styles.fabText}>＋ Ajouter un terrain</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  card: { backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 12, gap: 4 },
  entete: { flexDirection: "row", justifyContent: "space-between" },
  nom: { fontSize: 18, fontWeight: "bold", flexShrink: 1 },
  info: { color: "#444" },
  rangee: { flexDirection: "row", gap: 8, marginTop: 8 },
  btn: { flex: 1, backgroundColor: "#16a34a", padding: 10, borderRadius: 8 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  vide: { textAlign: "center", color: "#666", marginTop: 60, fontSize: 16 },
  fab: { position: "absolute", right: 16, bottom: 20, backgroundColor: "#16a34a", paddingVertical: 14, paddingHorizontal: 20, borderRadius: 30, elevation: 5 },
  fabText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});