import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { messageErreur } from "../utils/erreurs";
import { annulerReservation } from "../utils/reservations";

export default function OwnerReservationsScreen() {
  const { user } = useAuth();
  const [resas, setResas] = useState([]);
  const [noms, setNoms] = useState({});
  const [vue, setVue] = useState("avenir");

  useEffect(() => {
    const q = query(collection(db, "reservations"), where("proprietaireId", "==", user.uid));
    return onSnapshot(
      q,
      (s) => setResas(s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => r.type !== "bloque")),
      (e) => Alert.alert("Erreur", messageErreur(e))
    );
  }, []);

  useEffect(() => {
    const charger = async () => {
      const nouveaux = {};
      for (const r of resas) {
        if (noms[r.userId] || nouveaux[r.userId]) continue;
        try {
          const s = await getDoc(doc(db, "users", r.userId));
          nouveaux[r.userId] = s.exists() ? s.data().nom : "Joueur";
        } catch (e) {}
      }
      if (Object.keys(nouveaux).length) setNoms((p) => ({ ...p, ...nouveaux }));
    };
    charger();
  }, [resas]);

  const debut = (r) => new Date(`${r.date}T${r.heure}:00`);
  const avenir = resas.filter((r) => debut(r) > new Date()).sort((a, b) => debut(a) - debut(b));
  const passees = resas.filter((r) => debut(r) <= new Date()).sort((a, b) => debut(b) - debut(a));
  const somme = (l) => l.reduce((t, r) => t + (r.prix || 0), 0);
  const liste = vue === "avenir" ? avenir : passees;

  const annuler = (r) =>
    Alert.alert("Annuler cette réservation ?", "Le match du joueur sera annulé et le créneau libéré.", [
      { text: "Non", style: "cancel" },
      { text: "Oui, annuler", style: "destructive", onPress: () => annulerReservation(r).catch((e) => Alert.alert("Erreur", messageErreur(e))) },
    ]);

  return (
    <View style={styles.container}>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.valeur}>{somme(avenir)} DT</Text>
          <Text style={styles.label}>À venir ({avenir.length})</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.valeur}>{somme(passees)} DT</Text>
          <Text style={styles.label}>Passées ({passees.length})</Text>
        </View>
      </View>
      <Text style={styles.note}>Montants estimés : l'application n'encaisse pas encore de paiement.</Text>

      <View style={styles.onglets}>
        <TouchableOpacity style={[styles.onglet, vue === "avenir" && styles.actif]} onPress={() => setVue("avenir")}>
          <Text style={vue === "avenir" && styles.texteActif}>À venir</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.onglet, vue === "passees" && styles.actif]} onPress={() => setVue("passees")}>
          <Text style={vue === "passees" && styles.texteActif}>Passées</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={liste}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={styles.vide}>Aucune réservation.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.nom}>🏟️ {item.terrain}</Text>
            <Text>📅 {item.date} à {item.heure}</Text>
            <Text>👤 {noms[item.userId] || "..."} · 💰 {item.prix} DT</Text>
            {vue === "avenir" && (
              <TouchableOpacity style={styles.btn} onPress={() => annuler(item)}>
                <Text style={styles.btnText}>Annuler la réservation</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  stats: { flexDirection: "row", gap: 8, padding: 12, paddingBottom: 0 },
  stat: { flex: 1, backgroundColor: "#fff", padding: 14, borderRadius: 12, alignItems: "center" },
  valeur: { fontSize: 22, fontWeight: "bold", color: "#16a34a" },
  label: { color: "#666", fontSize: 12 },
  note: { color: "#666", fontSize: 11, textAlign: "center", marginTop: 6 },
  onglets: { flexDirection: "row", gap: 8, padding: 12, paddingBottom: 0 },
  onglet: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#16a34a", alignItems: "center", backgroundColor: "#fff" },
  actif: { backgroundColor: "#16a34a" },
  texteActif: { color: "#fff", fontWeight: "bold" },
  card: { backgroundColor: "#fff", padding: 14, borderRadius: 12, marginBottom: 8, gap: 2 },
  nom: { fontSize: 16, fontWeight: "bold" },
  btn: { backgroundColor: "#dc2626", padding: 10, borderRadius: 8, marginTop: 8 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  vide: { textAlign: "center", color: "#666", marginTop: 40 },
});