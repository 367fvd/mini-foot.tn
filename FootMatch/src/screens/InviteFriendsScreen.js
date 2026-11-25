import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { inviterJoueur } from "../utils/matchActions";
import { messageErreur } from "../utils/erreurs";

export default function InviteFriendsScreen({ route }) {
  const { matchId } = route.params;
  const { user } = useAuth();
  const [amis, setAmis] = useState([]);
  const [match, setMatch] = useState(null);
  const [monNom, setMonNom] = useState("Joueur");

  useEffect(() => {
    const charger = async () => {
      try {
        const matchSnap = await getDoc(doc(db, "matches", matchId));
        const m = { id: matchSnap.id, ...matchSnap.data() };
        setMatch(m);

        const moi = await getDoc(doc(db, "users", user.uid));
        if (moi.exists()) setMonNom(moi.data().nom);

        const [s1, s2] = await Promise.all([
          getDocs(query(collection(db, "friends"), where("de", "==", user.uid))),
          getDocs(query(collection(db, "friends"), where("pour", "==", user.uid))),
        ]);
        const uids = [];
        s1.docs.forEach((d) => d.data().statut === "accepte" && uids.push(d.data().pour));
        s2.docs.forEach((d) => d.data().statut === "accepte" && uids.push(d.data().de));

        const liste = await Promise.all(
          uids.map(async (uid) => {
            const snap = await getDoc(doc(db, "users", uid));
            const deja = await getDoc(doc(db, "invitations", `${matchId}_${user.uid}_${uid}`));
            return {
              uid,
              nom: snap.exists() ? snap.data().nom : "Joueur",
              deja: deja.exists() && deja.data().statut === "en_attente",
              dansMatch: m.joueurs.includes(uid),
              exclu: (m.bannis || []).includes(uid),
            };
          })
        );
        setAmis(liste);
      } catch (e) {
        Alert.alert("Erreur", messageErreur(e));
      }
    };
    charger();
  }, []);

  const inviter = async (ami) => {
    try {
      await inviterJoueur(match, user.uid, monNom, ami.uid);
      setAmis((prev) => prev.map((a) => (a.uid === ami.uid ? { ...a, deja: true } : a)));
    } catch (e) {
      Alert.alert("Invitation impossible", e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.astuce}>💡 Pour inviter un joueur qui n'est pas ton ami, ouvre sa fiche depuis l'onglet Carte.</Text>
      <FlatList
        data={amis}
        keyExtractor={(a) => a.uid}
        ListEmptyComponent={<Text style={styles.empty}>Tu n'as pas encore d'amis.{"\n"}Ajoute-en dans l'onglet Amis.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.nom}>👤 {item.nom}</Text>
            {item.dansMatch ? (
              <Text style={styles.info}>✅ Déjà dans le match</Text>
            ) : item.exclu ? (
              <Text style={styles.info}>🚫 Exclu</Text>
            ) : item.deja ? (
              <Text style={styles.info}>⏳ Invité</Text>
            ) : (
              <TouchableOpacity style={styles.btn} onPress={() => inviter(item)}>
                <Text style={styles.btnText}>Inviter</Text>
              </TouchableOpacity>
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
  astuce: { color: "#666", fontSize: 12, padding: 12, paddingBottom: 0 },
  card: { backgroundColor: "#fff", padding: 14, borderRadius: 12, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nom: { fontSize: 16, fontWeight: "bold" },
  info: { color: "#666" },
  btn: { backgroundColor: "#16a34a", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  btnText: { color: "#fff", fontWeight: "bold" },
  empty: { textAlign: "center", marginTop: 60, color: "#666", fontSize: 16 },
});