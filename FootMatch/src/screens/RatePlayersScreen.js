import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { statutMatch } from "../utils/matchUtils";
import { messageErreur } from "../utils/erreurs";

export default function RatePlayersScreen({ route }) {
  const { matchId } = route.params;
  const { user } = useAuth();
  const [joueurs, setJoueurs] = useState([]);
  const [notes, setNotes] = useState({});
  const [dejaNotes, setDejaNotes] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    const charger = async () => {
      try {
        const matchSnap = await getDoc(doc(db, "matches", matchId));
        const m = matchSnap.data();
        if (!m.joueurs.includes(user.uid)) return setMessage("Tu n'as pas joué ce match : tu ne peux noter personne.");
        if (statutMatch(m) !== "termine") return setMessage("Les notes s'ouvrent quand le match est terminé.");

        const autres = m.joueurs.filter((uid) => uid !== user.uid);
        const profils = await Promise.all(
          autres.map(async (uid) => {
            const snap = await getDoc(doc(db, "users", uid));
            const dejaSnap = await getDoc(doc(db, "ratings", `${matchId}_${user.uid}_${uid}`));
            return { uid, nom: snap.data()?.nom || "Joueur", deja: dejaSnap.exists() };
          })
        );
        setJoueurs(profils);
        const d = {};
        profils.forEach((p) => { if (p.deja) d[p.uid] = true; });
        setDejaNotes(d);
        if (profils.length === 0) setMessage("Aucun autre joueur à noter dans ce match.");
      } catch (e) {
        setMessage(messageErreur(e));
      }
    };
    charger();
  }, []);

  const envoyer = async (uidNote) => {
    const valeur = notes[uidNote];
    if (!Number.isInteger(valeur) || valeur < 1 || valeur > 10) {
      Alert.alert("Note manquante", "Choisis une note entre 1 et 10.");
      return;
    }
    try {
      const ratingRef = doc(db, "ratings", `${matchId}_${user.uid}_${uidNote}`);
      const userRef = doc(db, "users", uidNote);

      await runTransaction(db, async (tx) => {
        const existe = await tx.get(ratingRef);
        if (existe.exists()) throw new Error("Tu as déjà noté ce joueur.");

        const userSnap = await tx.get(userRef);
        const data = userSnap.data();
        const nb = data.nbNotes || 0;
        const total = (data.noteMoyenne || 0) * nb + valeur;
        const nouvelleMoyenne = Math.round((total / (nb + 1)) * 10) / 10;

        tx.set(ratingRef, { matchId, de: user.uid, pour: uidNote, note: valeur, createdAt: serverTimestamp() });
        tx.update(userRef, { noteMoyenne: nouvelleMoyenne, nbNotes: nb + 1 });
      });

      setDejaNotes((prev) => ({ ...prev, [uidNote]: true }));
    } catch (e) {
      Alert.alert("Erreur", messageErreur(e));
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={joueurs}
        keyExtractor={(j) => j.uid}
        ListEmptyComponent={<Text style={styles.empty}>{message || "Chargement..."}</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.nom}>👤 {item.nom}</Text>
            {dejaNotes[item.uid] ? (
              <Text style={styles.fait}>✅ Déjà noté</Text>
            ) : (
              <>
                <View style={styles.rangee}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={[styles.chiffre, notes[item.uid] === n && styles.chiffreActif]}
                      onPress={() => setNotes((prev) => ({ ...prev, [item.uid]: n }))}
                    >
                      <Text style={[styles.chiffreTexte, notes[item.uid] === n && { color: "#fff" }]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={styles.btn} onPress={() => envoyer(item.uid)}>
                  <Text style={styles.btnText}>Envoyer la note</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  card: { backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 12 },
  nom: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  rangee: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chiffre: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: "#16a34a", justifyContent: "center", alignItems: "center" },
  chiffreActif: { backgroundColor: "#16a34a" },
  chiffreTexte: { color: "#16a34a", fontWeight: "bold" },
  btn: { backgroundColor: "#16a34a", padding: 10, borderRadius: 8, marginTop: 12 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  fait: { color: "#16a34a", fontWeight: "bold" },
  empty: { textAlign: "center", marginTop: 60, color: "#666", paddingHorizontal: 20 },
});