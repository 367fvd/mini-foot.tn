import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { messageErreur } from "../utils/erreurs";

export default function AgentFollowsScreen({ navigation }) {
  const { user } = useAuth();
  const [suivis, setSuivis] = useState([]);
  const [profils, setProfils] = useState({});

  useEffect(() => {
    const q = query(collection(db, "suivis"), where("agentId", "==", user.uid));
    return onSnapshot(
      q,
      (s) => setSuivis(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => Alert.alert("Erreur", messageErreur(e))
    );
  }, []);

  useEffect(() => {
    const charger = async () => {
      const nouveaux = {};
      for (const s of suivis) {
        try {
          const j = await getDoc(doc(db, "users", s.joueurId));
          if (j.exists()) nouveaux[s.joueurId] = j.data();
        } catch (e) {}
      }
      setProfils((p) => ({ ...p, ...nouveaux }));
    };
    charger();
  }, [suivis]);

  return (
    <FlatList
      style={styles.container}
      data={suivis}
      keyExtractor={(s) => s.id}
      contentContainerStyle={{ padding: 12 }}
      ListEmptyComponent={<Text style={styles.vide}>Tu ne suis aucun joueur.{"\n"}Ouvre l'onglet Joueurs et appuie sur ⭐ Suivre.</Text>}
      renderItem={({ item }) => {
        const p = profils[item.joueurId];
        return (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("PlayerDetail", { uid: item.joueurId })}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nom}>{p?.nom || "..."}</Text>
              <Text style={styles.info}>{p?.poste || "Poste non précisé"}{p?.ville ? ` · ${p.ville}` : ""}</Text>
              {!!item.note && <Text style={styles.noteAgent} numberOfLines={2}>📝 {item.note}</Text>}
            </View>
            <Text style={styles.note}>{p?.nbNotes > 0 ? `⭐ ${p.noteMoyenne}` : "—"}</Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", padding: 14, borderRadius: 12, marginBottom: 8 },
  nom: { fontSize: 16, fontWeight: "bold" },
  info: { color: "#666", fontSize: 12 },
  noteAgent: { color: "#444", marginTop: 4, fontSize: 13 },
  note: { fontSize: 18, fontWeight: "bold", color: "#16a34a" },
  vide: { textAlign: "center", color: "#666", marginTop: 60, fontSize: 16 },
});