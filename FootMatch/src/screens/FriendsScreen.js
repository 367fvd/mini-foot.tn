import React, { useEffect, useState } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, getDocs, getDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";

export default function FriendsScreen() {
  const { user } = useAuth();
  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState([]);
  const [envoyees, setEnvoyees] = useState([]);   // invitations que j'ai envoyées
  const [recues, setRecues] = useState([]);       // invitations reçues
  const [noms, setNoms] = useState({});           // { uid: nom }

  // Écouter les invitations envoyées et reçues en temps réel
  useEffect(() => {
    const q1 = query(collection(db, "friends"), where("de", "==", user.uid));
    const q2 = query(collection(db, "friends"), where("pour", "==", user.uid));

    const u1 = onSnapshot(q1, (s) => setEnvoyees(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(q2, (s) => setRecues(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, []);

  // Charger les noms des personnes concernées
  useEffect(() => {
    const charger = async () => {
      const uids = new Set();
      envoyees.forEach((r) => uids.add(r.pour));
      recues.forEach((r) => uids.add(r.de));
      const nouveaux = {};
      for (const uid of uids) {
        if (noms[uid]) continue;
        try {
          const snap = await getDoc(doc(db, "users", uid));
          nouveaux[uid] = snap.exists() ? snap.data().nom : "Joueur";
        } catch (e) {}
      }
      if (Object.keys(nouveaux).length) setNoms((prev) => ({ ...prev, ...nouveaux }));
    };
    charger();
  }, [envoyees, recues]);

  // Rechercher un joueur par nom (exact, sensible à la casse)
  const chercher = async () => {
    if (!recherche.trim()) return;
    try {
      const q = query(collection(db, "users"), where("nom", "==", recherche.trim()));
      const snap = await getDocs(q);
      const liste = snap.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .filter((u) => u.uid !== user.uid);
      setResultats(liste);
      if (liste.length === 0) Alert.alert("Aucun résultat", "Aucun joueur avec ce nom.");
    } catch (e) {
      Alert.alert("Erreur", e.message);
    }
  };

  // Relation existante avec un joueur ?
  const relationAvec = (uid) =>
    envoyees.find((r) => r.pour === uid) || recues.find((r) => r.de === uid);

  const inviter = async (uid) => {
    if (relationAvec(uid)) {
      Alert.alert("Déjà fait", "Une invitation existe déjà avec ce joueur.");
      return;
    }
    try {
      await addDoc(collection(db, "friends"), {
        de: user.uid,
        pour: uid,
        statut: "en_attente",
        createdAt: serverTimestamp(),
      });
      Alert.alert("Envoyée", "Invitation envoyée !");
    } catch (e) {
      Alert.alert("Erreur", e.message);
    }
  };

  const accepter = (id) => updateDoc(doc(db, "friends", id), { statut: "accepte" });
  const refuser = (id) => deleteDoc(doc(db, "friends", id));

  // Listes dérivées
  const invitationsRecues = recues.filter((r) => r.statut === "en_attente");
  const amis = [
    ...envoyees.filter((r) => r.statut === "accepte").map((r) => ({ id: r.id, uid: r.pour })),
    ...recues.filter((r) => r.statut === "accepte").map((r) => ({ id: r.id, uid: r.de })),
  ];

  return (
    <FlatList
      style={styles.container}
      data={amis}
      keyExtractor={(a) => a.id}
      ListHeaderComponent={
        <View>
          {/* Recherche */}
          <Text style={styles.section}>🔍 Chercher un joueur</Text>
          <View style={styles.rangee}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Nom exact du joueur" maxLength={30}
              value={recherche}
              onChangeText={setRecherche}
            />
            <TouchableOpacity style={styles.btnPetit} onPress={chercher}>
              <Text style={styles.btnText}>OK</Text>
            </TouchableOpacity>
          </View>

          {resultats.map((u) => {
            const rel = relationAvec(u.uid);
            return (
              <View key={u.uid} style={styles.card}>
                <Text style={styles.nom}>👤 {u.nom}  ⭐ {u.noteMoyenne ?? 0}</Text>
                {rel ? (
                  <Text style={styles.info}>
                    {rel.statut === "accepte" ? "✅ Déjà ami" : "⏳ Invitation en attente"}
                  </Text>
                ) : (
                  <TouchableOpacity style={styles.btnPetit} onPress={() => inviter(u.uid)}>
                    <Text style={styles.btnText}>Inviter</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* Invitations reçues */}
          {invitationsRecues.length > 0 && (
            <>
              <Text style={styles.section}>📩 Invitations reçues</Text>
              {invitationsRecues.map((r) => (
                <View key={r.id} style={styles.card}>
                  <Text style={styles.nom}>👤 {noms[r.de] || "..."}</Text>
                  <View style={styles.rangee}>
                    <TouchableOpacity style={styles.btnPetit} onPress={() => accepter(r.id)}>
                      <Text style={styles.btnText}>Accepter</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btnPetit, { backgroundColor: "#dc2626" }]} onPress={() => refuser(r.id)}>
                      <Text style={styles.btnText}>Refuser</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          <Text style={styles.section}>👥 Mes amis ({amis.length})</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.nom}>👤 {noms[item.uid] || "..."}</Text>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.empty}>Pas encore d'amis. Cherche un joueur ci-dessus !</Text>}
      contentContainerStyle={{ padding: 16 }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  section: { fontSize: 18, fontWeight: "bold", marginTop: 16, marginBottom: 8 },
  rangee: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, backgroundColor: "#fff" },
  card: { backgroundColor: "#fff", padding: 14, borderRadius: 12, marginTop: 8, gap: 8 },
  nom: { fontSize: 16, fontWeight: "bold" },
  info: { color: "#666" },
  btnPetit: { backgroundColor: "#16a34a", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  btnText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  empty: { color: "#666", marginTop: 8 },
});