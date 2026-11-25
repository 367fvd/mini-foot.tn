import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { statutMatch } from "../utils/matchUtils";
import { messageErreur } from "../utils/erreurs";
import { validerNoteAgent } from "../utils/validation";

export default function PlayerDetailScreen({ route }) {
  const { uid } = route.params;
  const { user } = useAuth();
  const [joueur, setJoueur] = useState(null);
  const [notes, setNotes] = useState([]);
  const [matchs, setMatchs] = useState([]);
  const [evals, setEvals] = useState([]);
  const [suivi, setSuivi] = useState(false);
  const [noteAgent, setNoteAgent] = useState("");

  const refSuivi = doc(db, "suivis", `${user.uid}_${uid}`);

  useEffect(() => {
    const charger = async () => {
      try {
        const j = await getDoc(doc(db, "users", uid));
        if (j.exists()) setJoueur(j.data());

        const r = await getDocs(query(collection(db, "ratings"), where("pour", "==", uid)));
        setNotes(r.docs.map((d) => d.data().note));

        const m = await getDocs(query(collection(db, "matches"), where("joueurs", "array-contains", uid)));
        setMatchs(m.docs.map((d) => ({ id: d.id, ...d.data() })));

        const e = await getDocs(
          query(collection(db, "evaluationsAgent"), where("agentId", "==", user.uid), where("joueurId", "==", uid))
        );
        setEvals(e.docs.map((d) => d.data()));

        const s = await getDoc(refSuivi);
        if (s.exists()) {
          setSuivi(true);
          setNoteAgent(s.data().note || "");
        }
      } catch (e) {
        Alert.alert("Erreur", messageErreur(e));
      }
    };
    charger();
  }, []);

  const suivre = async () => {
    const err = validerNoteAgent(noteAgent);
    if (err) return Alert.alert("Note invalide", err);
    try {
      await setDoc(refSuivi, { agentId: user.uid, joueurId: uid, note: noteAgent, createdAt: serverTimestamp() }, { merge: true });
      setSuivi(true);
      Alert.alert("Enregistré ✅", "Ce joueur est dans tes suivis. Ses matchs apparaissent dans ton Agenda.");
    } catch (e) {
      Alert.alert("Erreur", messageErreur(e));
    }
  };

  const nePlusSuivre = async () => {
    try {
      await deleteDoc(refSuivi);
      setSuivi(false);
      setNoteAgent("");
    } catch (e) {
      Alert.alert("Erreur", messageErreur(e));
    }
  };

  if (!joueur) return <Text style={{ padding: 20 }}>Chargement...</Text>;

  const joues = matchs.filter((m) => statutMatch(m) === "termine").length;
  const prochains = matchs
    .filter((m) => ["ouvert", "complet"].includes(statutMatch(m)))
    .sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));
  const dernieres = notes.slice(-10).join("  ·  ");
  const moyenneAgent = evals.length ? (evals.reduce((t, x) => t + x.note, 0) / evals.length).toFixed(1) : null;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.avatar}>👤</Text>
      <Text style={styles.nom}>{joueur.nom}</Text>
      <Text style={styles.sous}>{joueur.poste || "Poste non précisé"}{joueur.ville ? ` · ${joueur.ville}` : ""}</Text>

      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.valeur}>{joueur.noteMoyenne ?? 0}</Text><Text style={styles.label}>Note /10</Text></View>
        <View style={styles.stat}><Text style={styles.valeur}>{joueur.nbNotes ?? 0}</Text><Text style={styles.label}>Avis</Text></View>
        <View style={styles.stat}><Text style={styles.valeur}>{joues}</Text><Text style={styles.label}>Matchs joués</Text></View>
      </View>

      <Text style={styles.section}>Dernières notes reçues des joueurs</Text>
      <Text>{dernieres || "Aucune note pour le moment."}</Text>

      <Text style={styles.section}>Mes évaluations en tant qu'agent {moyenneAgent ? `(moyenne ${moyenneAgent}/10)` : ""}</Text>
      {evals.length === 0 && <Text style={styles.sous}>Tu ne l'as pas encore évalué. Marque-toi « présent » sur un de ses matchs, puis évalue-le après le match.</Text>}
      {evals.map((x, i) => (
        <View key={i} style={styles.match}>
          <Text style={{ fontWeight: "bold" }}>⭐ {x.note} / 10</Text>
          {!!x.commentaire && <Text>{x.commentaire}</Text>}
        </View>
      ))}

      <Text style={styles.section}>Prochains matchs ({prochains.length})</Text>
      {prochains.length === 0 && <Text style={styles.sous}>Aucun match prévu pour l'instant.</Text>}
      {prochains.map((m) => (
        <View key={m.id} style={styles.match}>
          <Text style={{ fontWeight: "bold" }}>⚽ {m.terrain}</Text>
          <Text>📍 {m.ville}</Text>
          <Text>📅 {m.date} à {m.heure}</Text>
        </View>
      ))}

      <Text style={styles.section}>Mes notes privées (visibles par toi seul)</Text>
      <TextInput
        style={styles.input}
        value={noteAgent}
        onChangeText={setNoteAgent}
        multiline
        maxLength={500}
        placeholder="Points forts, à revoir, contact pris..."
      />

      <TouchableOpacity style={styles.btn} onPress={suivre}>
        <Text style={styles.btnText}>{suivi ? "💾 Enregistrer ma note" : "⭐ Suivre ce joueur"}</Text>
      </TouchableOpacity>
      {suivi && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: "#dc2626" }]} onPress={nePlusSuivre}>
          <Text style={styles.btnText}>Ne plus suivre</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fff", flexGrow: 1, paddingBottom: 40 },
  avatar: { fontSize: 56, textAlign: "center" },
  nom: { fontSize: 24, fontWeight: "bold", textAlign: "center" },
  sous: { color: "#666", textAlign: "center" },
  stats: { flexDirection: "row", gap: 8, marginTop: 16 },
  stat: { flex: 1, backgroundColor: "#f3f4f6", borderRadius: 12, padding: 12, alignItems: "center" },
  valeur: { fontSize: 22, fontWeight: "bold", color: "#16a34a" },
  label: { color: "#666", fontSize: 12 },
  section: { fontSize: 16, fontWeight: "bold", marginTop: 20, marginBottom: 6 },
  match: { backgroundColor: "#f3f4f6", padding: 12, borderRadius: 8, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, minHeight: 80, textAlignVertical: "top" },
  btn: { backgroundColor: "#16a34a", padding: 14, borderRadius: 8, marginTop: 14 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold", fontSize: 16 },
});