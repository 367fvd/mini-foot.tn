import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { statutMatch } from "../utils/matchUtils";
import { separerNom } from "../utils/nomUtils";
import Avatar from "../components/Avatar";
import { Section, Ligne } from "../components/Menu";

const ROLES = { joueur: "⚽ Joueur", proprietaire: "🏟️ Terrain", agent: "🕵️ Agent de joueurs" };

export default function ProfileScreen({ navigation }) {
  const { user, role } = useAuth();
  const [p, setP] = useState({});
  const [field, setField] = useState(null);
  const [stats, setStats] = useState([]);

  const charger = async () => {
    try {
      const s = await getDoc(doc(db, "users", user.uid));
      const prof = s.exists() ? s.data() : {};
      setP(prof);

      if (role === "proprietaire") {
        const f = await getDoc(doc(db, "fields", user.uid));
        const fd = f.exists() ? f.data() : null;
        setField(fd);
        setStats([
          { v: fd ? `${fd.prix} DT` : "—", l: "Prix / heure" },
          { v: fd ? (fd.creneaux || []).length : 0, l: "Créneaux" },
          { v: fd?.actif === false ? "Fermé" : "Ouvert", l: "Statut" },
        ]);
      } else if (role === "agent") {
        const [a, b] = await Promise.all([
          getDocs(query(collection(db, "suivis"), where("agentId", "==", user.uid))),
          getDocs(query(collection(db, "evaluationsAgent"), where("agentId", "==", user.uid))),
        ]);
        setStats([{ v: a.size, l: "Joueurs suivis" }, { v: b.size, l: "Évaluations" }]);
      } else {
        const ms = await getDocs(query(collection(db, "matches"), where("joueurs", "array-contains", user.uid)));
        const joues = ms.docs.filter((d) => statutMatch(d.data()) === "termine").length;
        setStats([
          { v: (prof.nbNotes || 0) > 0 ? prof.noteMoyenne : "—", l: "Note /10" },
          { v: prof.nbNotes ?? 0, l: "Avis reçus" },
          { v: joues, l: "Matchs joués" },
        ]);
      }
    } catch (e) {
      console.log("Profil :", e.message);
    }
  };

  useEffect(() => {
    charger();
    return navigation.addListener("focus", charger);
  }, []);

  const n = separerNom(p);
  const champs = [n.prenom, n.nomFamille, p.poste, p.ville, p.commune];
  const pct = Math.round((champs.filter(Boolean).length / champs.length) * 100);

  const sousTitre =
    role === "proprietaire"
      ? field ? `${field.commune}, ${field.gouvernorat}` : "Terrain à compléter"
      : role === "agent"
      ? "Agent de joueurs"
      : [p.poste, p.commune].filter(Boolean).join(" · ") || "Joueur";

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.carte}>
        <Avatar nom={p.nom || ""} fond={role === "proprietaire" ? "#15803d" : role === "agent" ? "#2563eb" : "#16a34a"} />
        <Text style={styles.nom}>{p.nom || "..."}</Text>
        <Text style={styles.sous}>{sousTitre}</Text>
        <Text style={styles.badge}>{ROLES[role]}</Text>
      </View>

      <View style={styles.stats}>
        {stats.map((x) => (
          <View key={x.l} style={styles.stat}>
            <Text style={styles.valeur}>{x.v}</Text>
            <Text style={styles.label}>{x.l}</Text>
          </View>
        ))}
      </View>

      {role === "joueur" && pct < 100 && (
        <View style={styles.completion}>
          <Text style={{ fontWeight: "bold" }}>Profil complété à {pct} %</Text>
          <View style={styles.barre}><View style={[styles.rempli, { width: `${pct}%` }]} /></View>
          <Text style={styles.aide}>Complète ton poste et ta ville pour trouver des matchs près de chez toi.</Text>
        </View>
      )}

      <Section titre="Mon compte">
        {role === "proprietaire" ? (
          <Ligne icone="🏟️" titre="Informations du terrain" sous="Nom, adresse, téléphone, position" onPress={() => navigation.navigate("FieldInfo")} />
        ) : (
          <Ligne icone="👤" titre="Informations personnelles" sous="Nom, poste, ville" onPress={() => navigation.navigate("PersonalInfo")} />
        )}
        {role === "proprietaire" && (
          <Ligne icone="💰" titre="Tarif et horaires" sous="Prix, créneaux, disponibilité" onPress={() => navigation.navigate("FieldPricing")} />
        )}
        {role === "joueur" && (
          <Ligne icone="🔒" titre="Confidentialité" sous="Partage de ma position" onPress={() => navigation.navigate("Privacy")} />
        )}
      </Section>

      <Section>
        <Ligne icone="⚙️" titre="Paramètres" sous="Sécurité, session, suppression du compte" onPress={() => navigation.navigate("Settings")} />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  carte: { backgroundColor: "#fff", alignItems: "center", paddingVertical: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  nom: { fontSize: 22, fontWeight: "bold", marginTop: 12 },
  sous: { color: "#6b7280", marginTop: 2 },
  badge: { marginTop: 8, backgroundColor: "#dcfce7", color: "#15803d", fontWeight: "bold", paddingVertical: 4, paddingHorizontal: 12, borderRadius: 14, overflow: "hidden" },
  stats: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 16 },
  stat: { flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 14, alignItems: "center" },
  valeur: { fontSize: 20, fontWeight: "bold", color: "#16a34a" },
  label: { color: "#6b7280", fontSize: 12, marginTop: 2, textAlign: "center" },
  completion: { backgroundColor: "#fff", marginHorizontal: 16, marginTop: 16, borderRadius: 14, padding: 14 },
  barre: { height: 8, backgroundColor: "#e5e7eb", borderRadius: 4, marginVertical: 8 },
  rempli: { height: 8, backgroundColor: "#16a34a", borderRadius: 4 },
  aide: { color: "#6b7280", fontSize: 12 },
});