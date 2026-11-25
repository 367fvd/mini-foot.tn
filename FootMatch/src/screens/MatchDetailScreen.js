import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { doc, onSnapshot, getDoc, updateDoc, deleteDoc, arrayRemove, arrayUnion } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { statutMatch, LIBELLES } from "../utils/matchUtils";
import { rejoindreMatch } from "../utils/matchActions";
import { messageErreur } from "../utils/erreurs";
import CodeModal from "../components/CodeModal";

export default function MatchDetailScreen({ route, navigation }) {
  const { matchId } = route.params;
  const { user } = useAuth();
  const [match, setMatch] = useState(null);
  const [joueurs, setJoueurs] = useState([]);
  const [code, setCode] = useState("");
  const [demandeCode, setDemandeCode] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "matches", matchId), (snap) => {
      if (snap.exists()) setMatch({ id: snap.id, ...snap.data() });
    });
    return unsub;
  }, [matchId]);

  useEffect(() => {
    if (match?.prive && match.createurId === user.uid) {
      getDoc(doc(db, "matches", matchId, "secret", "cle"))
        .then((s) => s.exists() && setCode(s.data().code))
        .catch(() => {});
    }
  }, [match?.prive]);

  useEffect(() => {
    if (!match) return;
    const charger = async () => {
      try {
        const profils = await Promise.all(
          match.joueurs.map(async (uid) => {
            const snap = await getDoc(doc(db, "users", uid));
            return { uid, ...(snap.exists() ? snap.data() : { nom: "Joueur" }) };
          })
        );
        setJoueurs(profils);
      } catch (e) {
        console.log("Chargement joueurs :", e.message);
      }
    };
    charger();
  }, [match?.joueurs?.join(",")]);

  if (!match) return <Text style={{ padding: 20 }}>Chargement...</Text>;

  const s = statutMatch(match);
  const lib = LIBELLES[s];
  const createur = match.createurId === user.uid;
  const inscrit = match.joueurs.includes(user.uid);
  const exclu = (match.bannis || []).includes(user.uid);
  const modifiable = s === "ouvert" || s === "complet";

  const tenter = async (saisie = "") => {
    try {
      await rejoindreMatch(match, user.uid, saisie);
    } catch (e) {
      Alert.alert("Impossible de rejoindre", e.message);
    }
  };

  const quitter = async () => {
    try {
      await updateDoc(doc(db, "matches", match.id), { joueurs: arrayRemove(user.uid) });
    } catch (e) {
      Alert.alert("Erreur", messageErreur(e));
    }
  };

  const exclure = (j) =>
    Alert.alert(
      `Exclure ${j.nom} ?`,
      "Il sera retiré du match et ne pourra plus le rejoindre, même avec une invitation.",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Exclure",
          style: "destructive",
          onPress: async () => {
            try {
              await updateDoc(doc(db, "matches", match.id), {
                joueurs: arrayRemove(j.uid),
                bannis: arrayUnion(j.uid),
              });
            } catch (e) {
              Alert.alert("Erreur", messageErreur(e));
            }
          },
        },
      ]
    );

  const annuler = () =>
    Alert.alert("Annuler le match ?", "Le créneau sera libéré pour les autres joueurs.", [
      { text: "Non", style: "cancel" },
      {
        text: "Oui, annuler",
        style: "destructive",
        onPress: async () => {
          try {
            await updateDoc(doc(db, "matches", match.id), { statut: "annule" });
            if (match.reservationId) await deleteDoc(doc(db, "reservations", match.reservationId));
            navigation.goBack();
          } catch (e) {
            Alert.alert("Erreur", messageErreur(e));
          }
        },
      },
    ]);

  return (
    <View style={styles.container}>
      <Text style={styles.terrain}>{match.prive ? "🔒" : "⚽"} {match.terrain}</Text>
      <Text>📍 {match.ville}</Text>
      <Text>📅 {match.date} à {match.heure}</Text>
      <Text style={{ color: lib.couleur, fontWeight: "bold" }}>{lib.texte}</Text>
      {match.prive && createur && !!code && <Text style={styles.code}>🔑 Mot de passe du match : {code}</Text>}
      {exclu && <Text style={styles.exclu}>🚫 L'organisateur t'a exclu de ce match.</Text>}

      <Text style={styles.section}>Joueurs ({match.joueurs.length} / {match.nbJoueurs})</Text>

      <FlatList
        data={joueurs}
        keyExtractor={(j) => j.uid}
        renderItem={({ item }) => (
          <View style={styles.joueur}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nom}>
                👤 {item.nom} {item.uid === match.createurId ? "👑" : ""}
                {item.poste ? `  · ${item.poste}` : ""}
              </Text>
              <Text style={styles.note}>⭐ {item.noteMoyenne ?? 0}</Text>
            </View>
            {createur && modifiable && item.uid !== user.uid && (
              <TouchableOpacity style={styles.btnExclure} onPress={() => exclure(item)}>
                <Text style={styles.btnExclureTexte}>Exclure</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      {inscrit && s !== "annule" && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: "#2563eb" }]} onPress={() => navigation.navigate("Chat", { matchId: match.id })}>
          <Text style={styles.btnText}>💬 Discussion du match</Text>
        </TouchableOpacity>
      )}

      {modifiable && !inscrit && !exclu && (
        <TouchableOpacity
          style={[styles.btn, s === "complet" && { backgroundColor: "#9ca3af" }]}
          disabled={s === "complet"}
          onPress={() => (match.prive ? setDemandeCode(true) : tenter())}
        >
          <Text style={styles.btnText}>{s === "complet" ? "Complet" : match.prive ? "🔒 Rejoindre avec le mot de passe" : "Rejoindre ce match"}</Text>
        </TouchableOpacity>
      )}

      {modifiable && inscrit && (
        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate("InviteFriends", { matchId: match.id })}>
          <Text style={styles.btnText}>📩 Inviter un joueur</Text>
        </TouchableOpacity>
      )}

      {modifiable && inscrit && !createur && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: "#dc2626" }]} onPress={quitter}>
          <Text style={styles.btnText}>Quitter le match</Text>
        </TouchableOpacity>
      )}

      {modifiable && createur && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: "#dc2626" }]} onPress={annuler}>
          <Text style={styles.btnText}>Annuler le match</Text>
        </TouchableOpacity>
      )}

      {s === "termine" && inscrit && (
        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate("RatePlayers", { matchId: match.id })}>
          <Text style={styles.btnText}>⭐ Noter les joueurs</Text>
        </TouchableOpacity>
      )}

      <CodeModal
        visible={demandeCode}
        onAnnuler={() => setDemandeCode(false)}
        onValider={(c) => { setDemandeCode(false); tenter(c); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff", gap: 4 },
  terrain: { fontSize: 24, fontWeight: "bold", marginBottom: 4 },
  code: { backgroundColor: "#fef3c7", padding: 10, borderRadius: 8, marginTop: 6, fontWeight: "bold" },
  exclu: { backgroundColor: "#fee2e2", color: "#b91c1c", padding: 10, borderRadius: 8, marginTop: 6, fontWeight: "bold" },
  section: { fontSize: 18, fontWeight: "bold", marginTop: 16, marginBottom: 8 },
  joueur: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: "#f3f4f6", borderRadius: 8, marginBottom: 6 },
  nom: { fontSize: 16 },
  note: { color: "#666" },
  btnExclure: { backgroundColor: "#dc2626", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  btnExclureTexte: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  btn: { backgroundColor: "#16a34a", padding: 14, borderRadius: 8, marginTop: 10 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
});