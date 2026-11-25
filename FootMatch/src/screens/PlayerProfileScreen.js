import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { statutMatch } from "../utils/matchUtils";
import { inviterJoueur } from "../utils/matchActions";
import { separerNom } from "../utils/nomUtils";
import { messageErreur } from "../utils/erreurs";

export default function PlayerProfileScreen({ route }) {
  const { uid } = route.params;
  const { user } = useAuth();
  const [joueur, setJoueur] = useState(null);
  const [joues, setJoues] = useState(0);
  const [mesMatchs, setMesMatchs] = useState([]);
  const [monNom, setMonNom] = useState("Joueur");
  const [relation, setRelation] = useState(null); // null | "en_attente" | "accepte"
  const [choix, setChoix] = useState(false);

  useEffect(() => {
    const charger = async () => {
      try {
        const j = await getDoc(doc(db, "users", uid));
        if (j.exists()) setJoueur(j.data());

        const moi = await getDoc(doc(db, "users", user.uid));
        if (moi.exists()) setMonNom(moi.data().nom);

        const sesMatchs = await getDocs(query(collection(db, "matches"), where("joueurs", "array-contains", uid)));
        setJoues(sesMatchs.docs.filter((d) => statutMatch(d.data()) === "termine").length);

        const miens = await getDocs(query(collection(db, "matches"), where("joueurs", "array-contains", user.uid)));
        setMesMatchs(
          miens.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((m) => statutMatch(m) === "ouvert")
            .filter((m) => !m.joueurs.includes(uid) && !(m.bannis || []).includes(uid))
            .sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure))
        );

        const [r1, r2] = await Promise.all([
          getDocs(query(collection(db, "friends"), where("de", "==", user.uid), where("pour", "==", uid))),
          getDocs(query(collection(db, "friends"), where("de", "==", uid), where("pour", "==", user.uid))),
        ]);
        const rel = [...r1.docs, ...r2.docs][0];
        if (rel) setRelation(rel.data().statut);
      } catch (e) {
        Alert.alert("Erreur", messageErreur(e));
      }
    };
    charger();
  }, []);

  const ajouterAmi = async () => {
    try {
      await addDoc(collection(db, "friends"), { de: user.uid, pour: uid, statut: "en_attente", createdAt: serverTimestamp() });
      setRelation("en_attente");
      Alert.alert("Envoyée ✅", "Ta demande d'ami a été envoyée.");
    } catch (e) {
      Alert.alert("Erreur", messageErreur(e));
    }
  };

  const inviter = async (match) => {
    try {
      await inviterJoueur(match, user.uid, monNom, uid);
      setChoix(false);
      Alert.alert("Invitation envoyée ✅", `${joueur.nom} a reçu ton invitation pour le match à ${match.terrain}.`);
    } catch (e) {
      Alert.alert("Invitation impossible", e.message);
    }
  };

  if (!joueur) return <Text style={{ padding: 20 }}>Chargement...</Text>;

  const n = separerNom(joueur);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.avatar}>👤</Text>
      <Text style={styles.nom}>{joueur.nom}</Text>
      <Text style={styles.sous}>{joueur.poste || "Poste non précisé"}{joueur.ville ? ` · ${joueur.ville}` : ""}</Text>

      <View style={styles.infos}>
        <Text style={styles.ligne}>Prénom : <Text style={styles.gras}>{n.prenom || "—"}</Text></Text>
        <Text style={styles.ligne}>Nom : <Text style={styles.gras}>{n.nomFamille || "—"}</Text></Text>
        <Text style={styles.ligne}>Poste : <Text style={styles.gras}>{joueur.poste || "—"}</Text></Text>
        <Text style={styles.ligne}>Gouvernorat : <Text style={styles.gras}>{joueur.ville || "—"}</Text></Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.valeur}>{(joueur.nbNotes || 0) > 0 ? joueur.noteMoyenne : "—"}</Text><Text style={styles.label}>Note /10</Text></View>
        <View style={styles.stat}><Text style={styles.valeur}>{joueur.nbNotes ?? 0}</Text><Text style={styles.label}>Avis reçus</Text></View>
        <View style={styles.stat}><Text style={styles.valeur}>{joues}</Text><Text style={styles.label}>Matchs joués</Text></View>
      </View>

      {uid !== user.uid && (
        <>
          <TouchableOpacity style={styles.btn} onPress={() => setChoix(!choix)}>
            <Text style={styles.btnText}>📩 Inviter à un de mes matchs</Text>
          </TouchableOpacity>

          {choix && (
            <View style={{ marginTop: 8 }}>
              {mesMatchs.length === 0 && (
                <Text style={styles.aucun}>Aucun de tes matchs à venir n'a de place pour lui. Réserve un terrain pour créer un match.</Text>
              )}
              {mesMatchs.map((m) => (
                <TouchableOpacity key={m.id} style={styles.match} onPress={() => inviter(m)}>
                  <Text style={{ fontWeight: "bold" }}>{m.prive ? "🔒" : "⚽"} {m.terrain}</Text>
                  <Text>📅 {m.date} à {m.heure} · 👥 {m.joueurs.length}/{m.nbJoueurs}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {relation === "accepte" ? (
            <Text style={styles.ami}>✅ Vous êtes amis</Text>
          ) : relation === "en_attente" ? (
            <Text style={styles.ami}>⏳ Demande d'ami en attente</Text>
          ) : (
            <TouchableOpacity style={[styles.btn, { backgroundColor: "#2563eb" }]} onPress={ajouterAmi}>
              <Text style={styles.btnText}>👥 Ajouter en ami</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fff", flexGrow: 1, paddingBottom: 40 },
  avatar: { fontSize: 56, textAlign: "center" },
  nom: { fontSize: 24, fontWeight: "bold", textAlign: "center" },
  sous: { color: "#666", textAlign: "center" },
  infos: { backgroundColor: "#f9fafb", borderRadius: 12, padding: 14, marginTop: 16, gap: 4 },
  ligne: { color: "#444" },
  gras: { fontWeight: "bold", color: "#111827" },
  stats: { flexDirection: "row", gap: 8, marginTop: 16 },
  stat: { flex: 1, backgroundColor: "#f3f4f6", borderRadius: 12, padding: 12, alignItems: "center" },
  valeur: { fontSize: 22, fontWeight: "bold", color: "#16a34a" },
  label: { color: "#666", fontSize: 12 },
  btn: { backgroundColor: "#16a34a", padding: 14, borderRadius: 8, marginTop: 16 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold", fontSize: 16 },
  match: { backgroundColor: "#dcfce7", padding: 12, borderRadius: 8, marginBottom: 6 },
  aucun: { color: "#666", fontSize: 13 },
  ami: { textAlign: "center", color: "#16a34a", fontWeight: "bold", marginTop: 16 },
});