import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Switch } from "react-native";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { messageErreur } from "../utils/erreurs";
import { CRENEAUX_DEFAUT } from "../utils/reservations";
import Champ from "../components/Champ";
import { validerPrix } from "../utils/validation";

const HEURES = Array.from({ length: 16 }, (_, i) => `${String(i + 8).padStart(2, "0")}:00`);
const garderNombre = (t) => t.replace(/[^0-9.,]/g, "");

export default function FieldPricingScreen({ navigation }) {
  const { user } = useAuth();
  const [pret, setPret] = useState(false);
  const [prix, setPrix] = useState("");
  const [creneaux, setCreneaux] = useState(CRENEAUX_DEFAUT);
  const [actif, setActif] = useState(true);
  const [tente, setTente] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    getDoc(doc(db, "fields", user.uid))
      .then((s) => {
        if (s.exists()) {
          const f = s.data();
          setPrix(f.prix != null ? String(f.prix) : "");
          setCreneaux(f.creneaux || CRENEAUX_DEFAUT);
          setActif(f.actif !== false);
        }
        setPret(true);
      })
      .catch((e) => { Alert.alert("Erreur", messageErreur(e)); setPret(true); });
  }, []);

  const errPrix = validerPrix(prix);
  const errCren = creneaux.length === 0 ? "Choisis au moins un horaire." : "";
  const basculer = (h) => setCreneaux((p) => (p.includes(h) ? p.filter((x) => x !== h) : [...p, h]));
  const prixNum = parseFloat(prix.replace(",", ".")) || 0;

  const enregistrer = async () => {
    setTente(true);
    if (errPrix || errCren) return Alert.alert("Formulaire incomplet", "Corrige les champs en rouge.");
    setEnvoi(true);
    try {
      await setDoc(
        doc(db, "fields", user.uid),
        { prix: prixNum, creneaux: [...creneaux].sort(), actif, proprietaireId: user.uid, updatedAt: serverTimestamp() },
        { merge: true }
      );
      Alert.alert("Enregistré ✅", "Tarif et horaires mis à jour.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Erreur", messageErreur(e));
    }
    setEnvoi(false);
  };

  if (!pret) return <Text style={{ padding: 20 }}>Chargement...</Text>;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Champ label="Prix de location par heure (DT)" value={prix} onChangeText={(t) => setPrix(garderNombre(t))} keyboardType="decimal-pad" maxLength={6} placeholder="Entre 1 et 500" erreur={tente || prix ? errPrix : ""} />
      {prixNum > 0 && !errPrix && (
        <Text style={styles.aide}>💡 À 10 joueurs : {(prixNum / 10).toFixed(1)} DT par personne · à 14 joueurs : {(prixNum / 14).toFixed(1)} DT</Text>
      )}

      <Text style={styles.label}>Horaires proposés ({creneaux.length} créneaux)</Text>
      <View style={styles.grille}>
        {HEURES.map((h) => (
          <TouchableOpacity key={h} style={[styles.heure, creneaux.includes(h) && styles.heureActive]} onPress={() => basculer(h)}>
            <Text style={creneaux.includes(h) && { color: "#fff", fontWeight: "bold" }}>{h}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {!!errCren && <Text style={styles.erreur}>⚠️ {errCren}</Text>}

      <View style={styles.ligne}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Ouvert à la réservation</Text>
          <Text style={styles.aide}>Fermé = invisible pour les joueurs (travaux, vacances...).</Text>
        </View>
        <Switch value={actif} onValueChange={setActif} trackColor={{ true: "#16a34a" }} />
      </View>

      <TouchableOpacity style={[styles.btn, envoi && { opacity: 0.6 }]} disabled={envoi} onPress={enregistrer}>
        <Text style={styles.btnText}>{envoi ? "Enregistrement..." : "Enregistrer"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fff", flexGrow: 1, paddingBottom: 40 },
  label: { fontWeight: "bold", marginTop: 18, marginBottom: 6 },
  aide: { color: "#6b7280", fontSize: 12, marginTop: 6 },
  erreur: { color: "#dc2626", fontSize: 12, marginTop: 4 },
  grille: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  heure: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: "#16a34a" },
  heureActive: { backgroundColor: "#16a34a" },
  ligne: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  btn: { backgroundColor: "#16a34a", padding: 14, borderRadius: 10, marginTop: 24 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold", fontSize: 16 },
});