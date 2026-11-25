import React, { useEffect, useState } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { statutMatch } from "../utils/matchUtils";
import { messageErreur } from "../utils/erreurs";

export default function AgentEvaluateScreen({ route }) {
  const { matchId } = route.params;
  const { user } = useAuth();
  const [joueurs, setJoueurs] = useState([]);
  const [notes, setNotes] = useState({});
  const [commentaires, setCommentaires] = useState({});
  const [enregistres, setEnregistres] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    const charger = async () => {
      try {
        const c = await getDoc(doc(db, "consultations", `${matchId}_${user.uid}`));
        if (!c.exists()) return setMessage("Tu n'as pas consulté ce match : évaluation impossible.");

        const ms = await getDoc(doc(db, "matches", matchId));
        const m = ms.data();
        if (statutMatch(m) !== "termine") return setMessage("Tu pourras évaluer les joueurs quand le match sera terminé.");

        const profils = await Promise.all(
          m.joueurs.map(async (uid) => {
            const s = await getDoc(doc(db, "users", uid));
            return { uid, nom: s.exists() ? s.data().nom : "Joueur", poste: s.exists() ? s.data().poste : "" };
          })
        );
        setJoueurs(profils);

        const ev = await getDocs(
          query(collection(db, "evaluationsAgent"), where("agentId", "==", user.uid), where("matchId", "==", matchId))
        );
        const n = {}, cm = {}, ok = {};
        ev.docs.forEach((d) => {
          const x = d.data();
          n[x.joueurId] = x.note;
          cm[x.joueurId] = x.commentaire || "";
          ok[x.joueurId] = true;
        });
        setNotes(n); setCommentaires(cm); setEnregistres(ok);
      } catch (e) {
        setMessage(messageErreur(e));
      }
    };
    charger();
  }, []);

  const enregistrer = async (joueurId) => {
    const note = notes[joueurId];
    const commentaire = (commentaires[joueurId] || "").trim();
    if (!Number.isInteger(note) || note < 1 || note > 10) return Alert.alert("Note manquante", "Choisis une note entre 1 et 10.");
    if (commentaire.length > 300) return Alert.alert("Commentaire trop long", "300 caractères maximum.");
    try {
      await setDoc(doc(db, "evaluationsAgent", `${matchId}_${user.uid}_${joueurId}`), {
        matchId, agentId: user.uid, joueurId, note, commentaire, updatedAt: serverTimestamp(),
      });
      setEnregistres((p) => ({ ...p, [joueurId]: true }));
      Alert.alert("Enregistré ✅", "Ton évaluation est sauvegardée.");
    } catch (e) {
      Alert.alert("Erreur", messageErreur(e));
    }
  };

  return (
    <FlatList
      style={styles.container}
      data={joueurs}
      keyExtractor={(j) => j.uid}
      contentContainerStyle={{ padding: 16 }}
      ListEmptyComponent={<Text style={styles.vide}>{message || "Chargement..."}</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.nom}>👤 {item.nom}{item.poste ? ` · ${item.poste}` : ""}</Text>
          {enregistres[item.uid] && <Text style={styles.ok}>✅ Évalué (tu peux modifier)</Text>}
          <View style={styles.rangee}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.chiffre, notes[item.uid] === n && styles.chiffreActif]}
                onPress={() => setNotes((p) => ({ ...p, [item.uid]: n }))}
              >
                <Text style={[styles.chiffreTexte, notes[item.uid] === n && { color: "#fff" }]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Ton avis sur son niveau (300 car. max)"
            value={commentaires[item.uid] || ""}
            onChangeText={(t) => setCommentaires((p) => ({ ...p, [item.uid]: t }))}
            multiline
            maxLength={300}
          />
          <TouchableOpacity style={styles.btn} onPress={() => enregistrer(item.uid)}>
            <Text style={styles.btnText}>Enregistrer l'évaluation</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  card: { backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 12 },
  nom: { fontSize: 18, fontWeight: "bold", marginBottom: 6 },
  ok: { color: "#16a34a", marginBottom: 6 },
  rangee: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chiffre: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: "#16a34a", justifyContent: "center", alignItems: "center" },
  chiffreActif: { backgroundColor: "#16a34a" },
  chiffreTexte: { color: "#16a34a", fontWeight: "bold" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, minHeight: 60, textAlignVertical: "top", marginTop: 12 },
  btn: { backgroundColor: "#16a34a", padding: 10, borderRadius: 8, marginTop: 10 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  vide: { textAlign: "center", color: "#666", marginTop: 60, paddingHorizontal: 20 },
});