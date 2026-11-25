import React, { useEffect, useState } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import { messageErreur } from "../utils/erreurs";

const POSTES = ["Gardien", "Défenseur", "Milieu", "Attaquant"];

export default function AgentPlayersScreen({ navigation }) {
  const [joueurs, setJoueurs] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [poste, setPoste] = useState("");
  const [fiables, setFiables] = useState(false);

  useEffect(() => {
    const charger = () =>
      getDocs(collection(db, "users"))
        .then((s) =>
          setJoueurs(
            s.docs
              .map((d) => ({ uid: d.id, ...d.data() }))
              .filter((u) => (u.role || "joueur") === "joueur")
          )
        )
        .catch((e) => Alert.alert("Erreur", messageErreur(e)));
    charger();
    return navigation.addListener("focus", charger);
  }, []);

  const liste = joueurs
    .filter((j) => !poste || j.poste === poste)
    .filter((j) => !fiables || (j.nbNotes || 0) >= 3)
    .filter((j) => !recherche.trim() || (j.nom || "").toLowerCase().includes(recherche.trim().toLowerCase()))
    .sort((a, b) => {
      const na = a.nbNotes || 0, nb = b.nbNotes || 0;
      if ((na > 0) !== (nb > 0)) return nb > 0 ? 1 : -1; // les joueurs notés d'abord
      return (b.noteMoyenne || 0) - (a.noteMoyenne || 0) || nb - na;
    });

  return (
    <View style={styles.container}>
      <View style={styles.filtres}>
        <TextInput style={styles.input} placeholder="🔍 Chercher un joueur" value={recherche} onChangeText={setRecherche} />
        <View style={styles.puces}>
          {POSTES.map((p) => (
            <TouchableOpacity key={p} style={[styles.puce, poste === p && styles.actif]} onPress={() => setPoste(poste === p ? "" : p)}>
              <Text style={poste === p && styles.texteActif}>{p}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.puce, fiables && styles.actif]} onPress={() => setFiables(!fiables)}>
            <Text style={fiables && styles.texteActif}>3+ avis</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={liste}
        keyExtractor={(j) => j.uid}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={styles.vide}>Aucun joueur trouvé.</Text>}
        renderItem={({ item, index }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("PlayerDetail", { uid: item.uid })}>
            <Text style={styles.rang}>{index + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.nom}>{item.nom || "Joueur"}</Text>
              <Text style={styles.info}>
                {item.poste || "Poste non précisé"}{item.ville ? ` · ${item.ville}` : ""}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.note}>{(item.nbNotes || 0) > 0 ? `⭐ ${item.noteMoyenne}` : "—"}</Text>
              <Text style={styles.info}>{item.nbNotes || 0} avis</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  filtres: { padding: 12, backgroundColor: "#fff", gap: 8 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10 },
  puces: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  puce: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: "#16a34a" },
  actif: { backgroundColor: "#16a34a" },
  texteActif: { color: "#fff", fontWeight: "bold" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", padding: 14, borderRadius: 12, marginBottom: 8 },
  rang: { fontSize: 18, fontWeight: "bold", color: "#9ca3af", width: 28 },
  nom: { fontSize: 16, fontWeight: "bold" },
  info: { color: "#666", fontSize: 12 },
  note: { fontSize: 18, fontWeight: "bold", color: "#16a34a" },
  vide: { textAlign: "center", color: "#666", marginTop: 40 },
});