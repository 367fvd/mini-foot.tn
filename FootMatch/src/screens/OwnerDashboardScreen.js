import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert } from "react-native";
import { collection, query, where, onSnapshot, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { messageErreur } from "../utils/erreurs";
import { dateISO, prochainsJours } from "../utils/reservations";

export default function OwnerDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [field, setField] = useState(undefined);
  const [resas, setResas] = useState([]);
  const [noms, setNoms] = useState({});

  useEffect(() => {
    const charger = () =>
      getDoc(doc(db, "fields", user.uid))
        .then((s) => setField(s.exists() ? { id: s.id, ...s.data() } : null))
        .catch(() => setField(null));
    charger();
    return navigation.addListener("focus", charger);
  }, []);

  useEffect(() => {
    const q = query(collection(db, "reservations"), where("proprietaireId", "==", user.uid));
    return onSnapshot(
      q,
      (s) => setResas(s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => r.type !== "bloque")),
      () => {}
    );
  }, []);

  const debut = (r) => new Date(`${r.date}T${r.heure}:00`);
  const aujourdhui = dateISO(new Date());
  const semaine = prochainsJours(7).map((j) => j.iso);

  const duJour = resas.filter((r) => r.date === aujourdhui);
  const revenus7 = resas.filter((r) => semaine.includes(r.date)).reduce((t, r) => t + (r.prix || 0), 0);
  const nbCreneaux = field?.creneaux?.length || 1;
  const taux = Math.min(100, Math.round((duJour.length / nbCreneaux) * 100));
  const prochaines = resas.filter((r) => debut(r) > new Date()).sort((a, b) => debut(a) - debut(b)).slice(0, 4);

  useEffect(() => {
    prochaines.forEach(async (r) => {
      if (noms[r.userId]) return;
      try {
        const s = await getDoc(doc(db, "users", r.userId));
        setNoms((p) => ({ ...p, [r.userId]: s.exists() ? s.data().nom : "Joueur" }));
      } catch (e) {}
    });
  }, [resas.length]);

  const basculer = async (v) => {
    try {
      await setDoc(doc(db, "fields", user.uid), { actif: v }, { merge: true });
      setField({ ...field, actif: v });
    } catch (e) {
      Alert.alert("Erreur", messageErreur(e));
    }
  };

  if (field === undefined) return <Text style={{ padding: 20 }}>Chargement...</Text>;
  if (field === null)
    return <Text style={{ padding: 20 }}>Ton terrain n'est pas encore enregistré. Ouvre Profil › Informations du terrain.</Text>;

  const ouvert = field.actif !== false;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.salut}>Bonjour 👋</Text>
      <Text style={styles.nom}>{field.nom}</Text>

      <View style={[styles.etat, { backgroundColor: ouvert ? "#dcfce7" : "#fee2e2" }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "bold", color: ouvert ? "#15803d" : "#b91c1c" }}>
            {ouvert ? "🟢 Ouvert aux réservations" : "🔴 Fermé (invisible pour les joueurs)"}
          </Text>
          <Text style={styles.aide}>{field.prix} DT / heure · {(field.creneaux || []).length} créneaux</Text>
        </View>
        <Switch value={ouvert} onValueChange={basculer} trackColor={{ true: "#16a34a" }} />
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.valeur}>{duJour.length}</Text><Text style={styles.label}>Réservations aujourd'hui</Text></View>
        <View style={styles.stat}><Text style={styles.valeur}>{taux} %</Text><Text style={styles.label}>Occupation du jour</Text></View>
        <View style={styles.stat}><Text style={styles.valeur}>{revenus7}</Text><Text style={styles.label}>DT sur 7 jours</Text></View>
      </View>
      <Text style={styles.aide}>Montants estimés : paiement réglé directement avec le terrain.</Text>

      <Text style={styles.section}>Prochaines réservations</Text>
      {prochaines.length === 0 && <Text style={styles.aide}>Aucune réservation à venir pour le moment.</Text>}
      {prochaines.map((r) => (
        <View key={r.id} style={styles.carte}>
          <Text style={styles.date}>📅 {r.date} à {r.heure}</Text>
          <Text>👤 {noms[r.userId] || "..."} · 💰 {r.prix} DT</Text>
        </View>
      ))}

      <View style={styles.rangee}>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate("Planning")}>
          <Text style={styles.btnText}>🗓️ Planning</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: "#2563eb" }]} onPress={() => navigation.navigate("FieldPricing")}>
          <Text style={styles.btnText}>💰 Tarif</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  salut: { color: "#6b7280" },
  nom: { fontSize: 24, fontWeight: "bold", marginBottom: 12 },
  etat: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14 },
  stats: { flexDirection: "row", gap: 8, marginTop: 14 },
  stat: { flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 12, alignItems: "center" },
  valeur: { fontSize: 22, fontWeight: "bold", color: "#16a34a" },
  label: { color: "#6b7280", fontSize: 11, textAlign: "center", marginTop: 2 },
  aide: { color: "#6b7280", fontSize: 12, marginTop: 6 },
  section: { fontSize: 17, fontWeight: "bold", marginTop: 22, marginBottom: 8 },
  carte: { backgroundColor: "#fff", padding: 14, borderRadius: 12, marginBottom: 8, gap: 2 },
  date: { fontWeight: "bold", color: "#16a34a" },
  rangee: { flexDirection: "row", gap: 8, marginTop: 16 },
  btn: { flex: 1, backgroundColor: "#16a34a", padding: 14, borderRadius: 10 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
});