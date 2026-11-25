import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { statutMatch } from "../utils/matchUtils";
import { messageErreur } from "../utils/erreurs";

export default function AgentAgendaScreen({ navigation }) {
  const { user } = useAuth();
  const [matchs, setMatchs] = useState([]);
  const [noms, setNoms] = useState({});
  const [suivisIds, setSuivisIds] = useState([]);
  const [consult, setConsult] = useState(new Set());
  const [vue, setVue] = useState("avenir");
  const [chargement, setChargement] = useState(true);

  const charger = async () => {
    try {
      const [s, c, m] = await Promise.all([
        getDocs(query(collection(db, "suivis"), where("agentId", "==", user.uid))),
        getDocs(query(collection(db, "consultations"), where("agentId", "==", user.uid))),
        getDocs(collection(db, "matches")),
      ]);
      const ids = s.docs.map((d) => d.data().joueurId);
      setSuivisIds(ids);
      setConsult(new Set(c.docs.map((d) => d.data().matchId)));
      setMatchs(m.docs.map((d) => ({ id: d.id, ...d.data() })).filter((x) => x.statut !== "annule"));

      const n = {};
      for (const id of ids) {
        try {
          const j = await getDoc(doc(db, "users", id));
          n[id] = j.exists() ? j.data().nom : "Joueur";
        } catch (e) {}
      }
      setNoms(n);
    } catch (e) {
      Alert.alert("Erreur", messageErreur(e));
    }
    setChargement(false);
  };

  useEffect(() => {
    charger();
    return navigation.addListener("focus", charger);
  }, []);

  const concerne = (m) => m.joueurs.some((id) => suivisIds.includes(id));
  const fini = (m) => statutMatch(m) === "termine";

  const liste = matchs
    .filter((m) => {
      if (vue === "avenir") return !fini(m) && concerne(m);
      if (vue === "tous") return !fini(m);
      return fini(m) && (consult.has(m.id) || concerne(m));
    })
    .sort((a, b) =>
      vue === "passes" ? (b.date + b.heure).localeCompare(a.date + a.heure) : (a.date + a.heure).localeCompare(b.date + b.heure)
    );

  const presence = async (m) => {
    const ref = doc(db, "consultations", `${m.id}_${user.uid}`);
    try {
      const copie = new Set(consult);
      if (consult.has(m.id)) {
        await deleteDoc(ref);
        copie.delete(m.id);
      } else {
        await setDoc(ref, {
          matchId: m.id,
          agentId: user.uid,
          terrain: m.terrain,
          date: m.date,
          heure: m.heure,
          createdAt: serverTimestamp(),
        });
        copie.add(m.id);
      }
      setConsult(copie);
    } catch (e) {
      Alert.alert("Erreur", messageErreur(e));
    }
  };

  const Onglet = ({ id, texte }) => (
    <TouchableOpacity style={[styles.onglet, vue === id && styles.actif]} onPress={() => setVue(id)}>
      <Text style={vue === id && styles.texteActif}>{texte}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.onglets}>
        <Onglet id="avenir" texte="Mes suivis" />
        <Onglet id="tous" texte="Tous les matchs" />
        <Onglet id="passes" texte="Passés" />
      </View>

      <FlatList
        data={liste}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 12 }}
        refreshing={chargement}
        onRefresh={charger}
        ListEmptyComponent={
          <Text style={styles.vide}>
            {vue === "avenir" && suivisIds.length === 0
              ? "Suis des joueurs pour voir leurs matchs ici."
              : vue === "passes"
              ? "Aucun match passé consulté."
              : "Aucun match à afficher."}
          </Text>
        }
        renderItem={({ item }) => {
          const concernes = item.joueurs.filter((id) => suivisIds.includes(id));
          const present = consult.has(item.id);
          const termine = fini(item);
          return (
            <View style={styles.card}>
              <Text style={styles.date}>📅 {item.date} à {item.heure}</Text>
              <Text style={styles.terrain}>{item.prive ? "🔒" : "⚽"} {item.terrain}</Text>
              <Text style={styles.info}>📍 {item.ville}</Text>
              <Text style={styles.info}>👥 {item.joueurs.length} / {item.nbJoueurs} joueurs</Text>
              <View style={styles.puces}>
                {concernes.map((id) => (
                  <TouchableOpacity key={id} style={styles.puce} onPress={() => navigation.navigate("PlayerDetail", { uid: id })}>
                    <Text style={styles.puceTexte}>⭐ {noms[id] || "..."}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {!termine && (
                <TouchableOpacity style={[styles.btn, present && { backgroundColor: "#6b7280" }]} onPress={() => presence(item)}>
                  <Text style={styles.btnText}>{present ? "✅ Présent (annuler)" : "👁 Je serai présent"}</Text>
                </TouchableOpacity>
              )}
              {termine && present && (
                <TouchableOpacity style={[styles.btn, { backgroundColor: "#2563eb" }]} onPress={() => navigation.navigate("AgentEvaluate", { matchId: item.id })}>
                  <Text style={styles.btnText}>⭐ Évaluer les joueurs</Text>
                </TouchableOpacity>
              )}
              {termine && !present && (
                <Text style={styles.sansConsult}>Tu n'étais pas inscrit comme présent : évaluation impossible.</Text>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  onglets: { flexDirection: "row", gap: 6, padding: 12, paddingBottom: 0 },
  onglet: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#16a34a", alignItems: "center", backgroundColor: "#fff" },
  actif: { backgroundColor: "#16a34a" },
  texteActif: { color: "#fff", fontWeight: "bold" },
  card: { backgroundColor: "#fff", padding: 14, borderRadius: 12, marginBottom: 10, gap: 2 },
  date: { fontWeight: "bold", color: "#16a34a", fontSize: 15 },
  terrain: { fontSize: 17, fontWeight: "bold" },
  info: { color: "#444" },
  puces: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  puce: { backgroundColor: "#dcfce7", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 14 },
  puceTexte: { color: "#15803d", fontWeight: "bold", fontSize: 12 },
  btn: { backgroundColor: "#16a34a", padding: 10, borderRadius: 8, marginTop: 10 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  sansConsult: { color: "#9ca3af", fontSize: 12, marginTop: 8 },
  vide: { textAlign: "center", color: "#666", marginTop: 60, fontSize: 16 },
});