import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { rejoindreMatch } from "../utils/matchActions";
import { messageErreur } from "../utils/erreurs";
import CodeModal from "../components/CodeModal";

export default function InvitationsScreen() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [attente, setAttente] = useState(null); // { inv, match } d'un match privé

  useEffect(() => {
    const q = query(collection(db, "invitations"), where("pour", "==", user.uid));
    return onSnapshot(
      q,
      (snap) =>
        setInvitations(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((i) => i.statut === "en_attente")),
      (e) => Alert.alert("Erreur", messageErreur(e))
    );
  }, []);

  const finaliser = async (inv, match, code = "") => {
    try {
      await rejoindreMatch(match, user.uid, code);
      await updateDoc(doc(db, "invitations", inv.id), { statut: "accepte" });
      Alert.alert("C'est bon !", "Tu as rejoint le match ⚽");
    } catch (e) {
      Alert.alert("Impossible de rejoindre", e.message);
    }
  };

  const accepter = async (inv) => {
    try {
      const snap = await getDoc(doc(db, "matches", inv.matchId));
      if (!snap.exists()) {
        Alert.alert("Match introuvable", "Ce match n'existe plus.");
        await deleteDoc(doc(db, "invitations", inv.id));
        return;
      }
      const match = { id: snap.id, ...snap.data() };
      if (match.prive && !match.joueurs.includes(user.uid)) {
        setAttente({ inv, match });
        return;
      }
      await finaliser(inv, match);
    } catch (e) {
      Alert.alert("Erreur", messageErreur(e));
    }
  };

  const refuser = (inv) => deleteDoc(doc(db, "invitations", inv.id)).catch((e) => Alert.alert("Erreur", messageErreur(e)));

  return (
    <View style={styles.container}>
      <FlatList
        data={invitations}
        keyExtractor={(i) => i.id}
        ListEmptyComponent={<Text style={styles.empty}>Aucune invitation pour le moment.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.titre}>{item.deNom} t'invite à jouer ⚽</Text>
            <Text>📍 {item.terrain}</Text>
            <Text>📅 {item.date} à {item.heure}</Text>
            <View style={styles.rangee}>
              <TouchableOpacity style={styles.btn} onPress={() => accepter(item)}>
                <Text style={styles.btnText}>Accepter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: "#dc2626" }]} onPress={() => refuser(item)}>
                <Text style={styles.btnText}>Refuser</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={{ padding: 16 }}
      />

      <CodeModal
        visible={!!attente}
        onAnnuler={() => setAttente(null)}
        onValider={(code) => { const a = attente; setAttente(null); finaliser(a.inv, a.match, code); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  card: { backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 12, gap: 4 },
  titre: { fontSize: 17, fontWeight: "bold", marginBottom: 4 },
  rangee: { flexDirection: "row", gap: 8, marginTop: 8 },
  btn: { backgroundColor: "#16a34a", paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  btnText: { color: "#fff", fontWeight: "bold" },
  empty: { textAlign: "center", marginTop: 60, color: "#666", fontSize: 16 },
});