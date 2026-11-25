import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { collection, onSnapshot, doc, getDoc, updateDoc, arrayRemove } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { statutMatch, LIBELLES } from "../utils/matchUtils";
import { rejoindreMatch } from "../utils/matchActions";
import { messageErreur } from "../utils/erreurs";
import GouvernoratPicker from "../components/GouvernoratPicker";
import CodeModal from "../components/CodeModal";
import { memeGouvernorat } from "../utils/tunisie";

export default function MatchsScreen({ navigation }) {
  const { user } = useAuth();
  const [matchs, setMatchs] = useState([]);
  const [vue, setVue] = useState("avenir");
  const [gouv, setGouv] = useState("");     // "" = tous les gouvernorats
  const [cible, setCible] = useState(null); // match privé qui demande un mot de passe

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "matches"),
      (snap) => setMatchs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => Alert.alert("Erreur de lecture", messageErreur(e))
    );
    return unsub;
  }, []);

  // Par défaut, on filtre sur la ville du profil
  useEffect(() => {
    getDoc(doc(db, "users", user.uid))
      .then((s) => s.exists() && s.data().ville && setGouv(s.data().ville))
      .catch(() => {});
  }, []);

  const tenter = async (match, code = "") => {
    try {
      await rejoindreMatch(match, user.uid, code);
    } catch (e) {
      Alert.alert("Impossible de rejoindre", e.message);
    }
  };

  const rejoindre = (match) => (match.prive ? setCible(match) : tenter(match));

  const quitter = async (match) => {
    try {
      await updateDoc(doc(db, "matches", match.id), { joueurs: arrayRemove(user.uid) });
    } catch (e) {
      Alert.alert("Erreur", messageErreur(e));
    }
  };

  const liste =
    vue === "avenir"
      ? matchs
          .filter((m) => !["termine", "annule"].includes(statutMatch(m)))
          .filter((m) => memeGouvernorat(m, gouv))
          .sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure))
      : matchs
          .filter((m) => m.joueurs.includes(user.uid) && statutMatch(m) !== "annule")
          .sort((a, b) => (b.date + b.heure).localeCompare(a.date + a.heure));

  const renderMatch = ({ item }) => {
    const s = statutMatch(item);
    const inscrit = item.joueurs.includes(user.uid);
    const createur = item.createurId === user.uid;
    const lib = LIBELLES[s];

    return (
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("MatchDetail", { matchId: item.id })}>
        <View style={styles.entete}>
          <Text style={styles.terrain}>{item.prive ? "🔒" : "⚽"} {item.terrain}</Text>
          <Text style={{ color: lib.couleur, fontWeight: "bold" }}>{lib.texte}</Text>
        </View>
        <Text>📍 {item.ville}</Text>
        <Text>📅 {item.date} à {item.heure}</Text>
        <Text>👥 {item.joueurs.length} / {item.nbJoueurs} joueurs{createur ? " · 👑 Organisateur" : ""}</Text>
        {item.prive && <Text style={{ color: "#ea580c" }}>Match privé : mot de passe requis</Text>}

        {(s === "ouvert" || s === "complet") && !inscrit && (
          <TouchableOpacity
            style={[styles.btn, s === "complet" && { backgroundColor: "#9ca3af" }]}
            disabled={s === "complet"}
            onPress={() => rejoindre(item)}
          >
            <Text style={styles.btnText}>{s === "complet" ? "Complet" : item.prive ? "🔒 Rejoindre avec le mot de passe" : "Rejoindre"}</Text>
          </TouchableOpacity>
        )}

        {(s === "ouvert" || s === "complet") && inscrit && !createur && (
          <TouchableOpacity style={[styles.btn, { backgroundColor: "#dc2626" }]} onPress={() => quitter(item)}>
            <Text style={styles.btnText}>Quitter</Text>
          </TouchableOpacity>
        )}

        {s === "termine" && inscrit && <Text style={styles.astuce}>⭐ Ouvre le match pour noter les joueurs</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.onglets}>
        <TouchableOpacity style={[styles.onglet, vue === "avenir" && styles.actif]} onPress={() => setVue("avenir")}>
          <Text style={vue === "avenir" && styles.texteActif}>À venir</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.onglet, vue === "miens" && styles.actif]} onPress={() => setVue("miens")}>
          <Text style={vue === "miens" && styles.texteActif}>Mes matchs</Text>
        </TouchableOpacity>
      </View>

      {vue === "avenir" && (
        <View style={{ paddingHorizontal: 12 }}>
          <GouvernoratPicker label="" value={gouv} onChange={setGouv} optionTous />
        </View>
      )}

      <FlatList
        data={liste}
        keyExtractor={(item) => item.id}
        renderItem={renderMatch}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {vue === "avenir"
              ? gouv
                ? `Aucun match à venir à ${gouv}.\nChoisis « Tous les gouvernorats » ou réserve un terrain ! ⚽`
                : "Aucun match à venir.\nRéserve un terrain pour en créer un ! ⚽"
              : "Tu n'as encore joué ni rejoint aucun match."}
          </Text>
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("Carte")}>
        <Text style={styles.fabText}>＋ Réserver un terrain</Text>
      </TouchableOpacity>

      <CodeModal
        visible={!!cible}
        onAnnuler={() => setCible(null)}
        onValider={(code) => { const m = cible; setCible(null); tenter(m, code); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  onglets: { flexDirection: "row", gap: 8, padding: 12, paddingBottom: 0 },
  onglet: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#16a34a", alignItems: "center", backgroundColor: "#fff" },
  actif: { backgroundColor: "#16a34a" },
  texteActif: { color: "#fff", fontWeight: "bold" },
  card: { backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 12, gap: 4 },
  entete: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  terrain: { fontSize: 18, fontWeight: "bold", flexShrink: 1 },
  btn: { backgroundColor: "#16a34a", padding: 10, borderRadius: 8, marginTop: 8 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  astuce: { color: "#2563eb", marginTop: 6 },
  empty: { textAlign: "center", marginTop: 60, color: "#666", fontSize: 16 },
  fab: { position: "absolute", right: 16, bottom: 20, backgroundColor: "#16a34a", paddingVertical: 14, paddingHorizontal: 20, borderRadius: 30, elevation: 5 },
  fabText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});