import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { collection, query, where, onSnapshot, doc, runTransaction, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { messageErreur } from "../utils/erreurs";
import { annulerReservation, CRENEAUX_DEFAUT, prochainsJours } from "../utils/reservations";

export default function OwnerPlanningScreen({ route }) {
  const { field } = route.params;
  const { user } = useAuth();
  const jours = prochainsJours(7);
  const [date, setDate] = useState(jours[0].iso);
  const [resas, setResas] = useState({}); // "date_heure" -> reservation

  useEffect(() => {
    const q = query(collection(db, "reservations"), where("fieldId", "==", field.id));
    return onSnapshot(
      q,
      (s) => {
        const m = {};
        s.docs.forEach((d) => { m[`${d.data().date}_${d.data().heure}`] = { id: d.id, ...d.data() }; });
        setResas(m);
      },
      (e) => Alert.alert("Erreur", messageErreur(e))
    );
  }, []);

  const bloquer = async (heure) => {
    try {
      const ref = doc(db, "reservations", `${field.id}_${date}_${heure}`);
      await runTransaction(db, async (tx) => {
        const s = await tx.get(ref);
        if (s.exists()) throw new Error("Ce créneau vient d'être réservé.");
        tx.set(ref, {
          fieldId: field.id,
          terrain: field.nom,
          date,
          heure,
          userId: user.uid,
          proprietaireId: user.uid,
          type: "bloque",
          prix: 0,
          createdAt: serverTimestamp(),
        });
      });
    } catch (e) {
      Alert.alert("Erreur", messageErreur(e));
    }
  };

  const toucher = (heure) => {
    const r = resas[`${date}_${heure}`];
    if (!r) {
      Alert.alert(`${date} à ${heure}`, "Créneau libre.", [
        { text: "Fermer", style: "cancel" },
        { text: "Bloquer ce créneau", onPress: () => bloquer(heure) },
      ]);
    } else if (r.type === "bloque") {
      Alert.alert(`${date} à ${heure}`, "Créneau bloqué par toi.", [
        { text: "Fermer", style: "cancel" },
        { text: "Débloquer", onPress: () => deleteDoc(doc(db, "reservations", r.id)).catch((e) => Alert.alert("Erreur", messageErreur(e))) },
      ]);
    } else {
      Alert.alert(`${date} à ${heure}`, `Réservé par un joueur (${r.prix} DT).`, [
        { text: "Fermer", style: "cancel" },
        {
          text: "Annuler la réservation",
          style: "destructive",
          onPress: () => annulerReservation(r).catch((e) => Alert.alert("Erreur", messageErreur(e))),
        },
      ]);
    }
  };

  const passe = (h) => new Date(`${date}T${h}:00`) <= new Date();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titre}>🏟️ {field.nom}</Text>
      <Text style={styles.info}>💰 {field.prix} DT / heure</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
        {jours.map((j) => (
          <TouchableOpacity key={j.iso} style={[styles.jour, date === j.iso && styles.actif]} onPress={() => setDate(j.iso)}>
            <Text style={date === j.iso && styles.texteActif}>{j.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.legende}>
        <Text>⬜ Libre</Text><Text>🟩 Réservé</Text><Text>🟧 Bloqué</Text>
      </View>

      <View style={styles.grille}>
        {(field.creneaux || CRENEAUX_DEFAUT).map((h) => {
          const r = resas[`${date}_${h}`];
          const fond = r ? (r.type === "bloque" ? "#fed7aa" : "#bbf7d0") : "#fff";
          return (
            <TouchableOpacity
              key={h}
              disabled={passe(h)}
              style={[styles.creneau, { backgroundColor: fond }, passe(h) && { opacity: 0.4 }]}
              onPress={() => toucher(h)}
            >
              <Text style={{ fontWeight: "bold" }}>{h}</Text>
              <Text style={styles.petit}>{r ? (r.type === "bloque" ? "Bloqué" : "Réservé") : "Libre"}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#f3f4f6", flexGrow: 1 },
  titre: { fontSize: 22, fontWeight: "bold" },
  info: { color: "#666", marginTop: 2 },
  jour: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: "#16a34a", marginRight: 8, backgroundColor: "#fff" },
  actif: { backgroundColor: "#16a34a" },
  texteActif: { color: "#fff", fontWeight: "bold" },
  legende: { flexDirection: "row", gap: 16, marginBottom: 8 },
  grille: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  creneau: { width: "30%", paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db", alignItems: "center" },
  petit: { fontSize: 11, color: "#444" },
});