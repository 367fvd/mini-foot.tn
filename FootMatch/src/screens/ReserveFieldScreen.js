import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Switch } from "react-native";
import { collection, query, where, onSnapshot, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { messageErreur } from "../utils/erreurs";
import { CRENEAUX_DEFAUT, dateISO, prochainsJours } from "../utils/reservations";
import { LIMITES } from "../utils/tunisie";
import { validerDateHeure, validerNombreJoueurs, validerCodeMatch } from "../utils/validation";
import { trouverConflit, messageConflit } from "../utils/matchActions";
import Champ from "../components/Champ";

export default function ReserveFieldScreen({ route, navigation }) {
  const { field } = route.params;
  const { user } = useAuth();
  const jours = prochainsJours(7);
  const creneaux = field.creneaux || CRENEAUX_DEFAUT;

  const [date, setDate] = useState(jours[0].iso);
  const [heure, setHeure] = useState(null);
  const [nb, setNb] = useState(LIMITES.JOUEURS_MIN);
  const [prive, setPrive] = useState(false);
  const [code, setCode] = useState("");
  const [tente, setTente] = useState(false);
  const [pris, setPris] = useState({});
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "reservations"), where("fieldId", "==", field.id));
    return onSnapshot(
      q,
      (snap) => {
        const m = {};
        snap.docs.forEach((d) => { m[`${d.data().date}_${d.data().heure}`] = d.data().type || "match"; });
        setPris(m);
      },
      (e) => Alert.alert("Erreur", messageErreur(e))
    );
  }, []);

  const passe = (h) => date === dateISO(new Date()) && parseInt(h.split(":")[0]) <= new Date().getHours();
  const errCode = prive ? validerCodeMatch(code) : "";

  const reserver = async () => {
    setTente(true);
    if (!heure) return Alert.alert("Créneau manquant", "Choisis un créneau horaire.");
    const erreur = validerDateHeure(date, heure) || validerNombreJoueurs(nb) || errCode;
    if (erreur) return Alert.alert("Saisie invalide", erreur);

    setEnvoi(true);
    try {
      // Un joueur ne peut pas jouer 2 matchs en même temps
      const conflit = await trouverConflit(user.uid, { date, heure });
      if (conflit) {
        Alert.alert("Horaire déjà pris", messageConflit(conflit));
        setEnvoi(false);
        return;
      }

      const resRef = doc(db, "reservations", `${field.id}_${date}_${heure}`);
      const matchRef = doc(collection(db, "matches"));
      const secretRef = doc(db, "matches", matchRef.id, "secret", "cle");

      await runTransaction(db, async (tx) => {
        const existe = await tx.get(resRef);
        if (existe.exists()) throw new Error("Ce créneau n'est plus disponible.");

        tx.set(resRef, {
          fieldId: field.id,
          terrain: field.nom,
          date,
          heure,
          userId: user.uid,
          proprietaireId: field.proprietaireId || "",
          type: "match",
          matchId: matchRef.id,
          prix: field.prix ?? 0,
          createdAt: serverTimestamp(),
        });

        tx.set(matchRef, {
          terrain: field.nom,
          ville: field.gouvernorat ? `${field.adresse} (${field.gouvernorat})` : field.adresse || "",
          gouvernorat: field.gouvernorat || "",
          date,
          heure,
          nbJoueurs: nb,
          prive,
          createurId: user.uid,
          proprietaireId: field.proprietaireId || "",
          joueurs: [user.uid],
          statut: "ouvert",
          fieldId: field.id,
          reservationId: resRef.id,
          createdAt: serverTimestamp(),
        });

        if (prive) tx.set(secretRef, { code });
      });

      Alert.alert(
        "Réservé ✅",
        `${field.nom}\n${date} à ${heure}\nPrix : ${field.prix} DT\n${prive ? "Match privé 🔒 : communique le mot de passe à tes amis.\n" : ""}Le match a été créé !`
      );
      navigation.goBack();
    } catch (e) {
      Alert.alert("Erreur", messageErreur(e));
    }
    setEnvoi(false);
  };

  const prixTotal = field.prix ?? 0;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.titre}>⚽ {field.nom}</Text>
      <Text style={styles.info}>📍 {field.adresse}{field.gouvernorat ? ` (${field.gouvernorat})` : ""} · 💰 {prixTotal} DT / heure</Text>
      {!!field.telephone && <Text style={styles.info}>📞 {field.telephone}</Text>}

      <Text style={styles.section}>1. Choisis un jour</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {jours.map((j) => (
          <TouchableOpacity key={j.iso} style={[styles.jour, date === j.iso && styles.actif]} onPress={() => { setDate(j.iso); setHeure(null); }}>
            <Text style={date === j.iso && styles.texteActif}>{j.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.section}>2. Choisis un créneau</Text>
      <View style={styles.grille}>
        {creneaux.map((h) => {
          const type = pris[`${date}_${h}`];
          const indispo = !!type || passe(h);
          return (
            <TouchableOpacity key={h} disabled={indispo} style={[styles.creneau, indispo && styles.indispo, heure === h && styles.actif]} onPress={() => setHeure(h)}>
              <Text style={[heure === h && styles.texteActif, indispo && { color: "#9ca3af" }]}>{h}</Text>
              {!!type && <Text style={styles.petit}>{type === "bloque" ? "Indisponible" : "Réservé"}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.section}>3. Nombre de joueurs ({LIMITES.JOUEURS_MIN} à {LIMITES.JOUEURS_MAX})</Text>
      <View style={styles.stepper}>
        <TouchableOpacity style={[styles.pas, nb <= LIMITES.JOUEURS_MIN && styles.pasOff]} disabled={nb <= LIMITES.JOUEURS_MIN} onPress={() => setNb(nb - 1)}>
          <Text style={styles.pasTexte}>−</Text>
        </TouchableOpacity>
        <Text style={styles.nb}>{nb}</Text>
        <TouchableOpacity style={[styles.pas, nb >= LIMITES.JOUEURS_MAX && styles.pasOff]} disabled={nb >= LIMITES.JOUEURS_MAX} onPress={() => setNb(nb + 1)}>
          <Text style={styles.pasTexte}>+</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.partage}>💡 À {nb} joueurs : environ {(prixTotal / nb).toFixed(1)} DT par personne.</Text>

      <Text style={styles.section}>4. Visibilité (facultatif)</Text>
      <View style={styles.ligne}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "bold" }}>🔒 Match privé</Text>
          <Text style={styles.aide}>Le match reste visible, mais il faut un mot de passe pour le rejoindre.</Text>
        </View>
        <Switch value={prive} onValueChange={setPrive} trackColor={{ true: "#16a34a" }} />
      </View>
      {prive && (
        <Champ
          label="Mot de passe du match"
          value={code}
          onChangeText={setCode}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={12}
          placeholder="4 à 12 caractères"
          erreur={tente || code ? errCode : ""}
        />
      )}

      <TouchableOpacity style={[styles.btn, envoi && { opacity: 0.6 }]} disabled={envoi} onPress={reserver}>
        <Text style={styles.btnText}>{envoi ? "Réservation..." : `Réserver (${prixTotal} DT) et créer le match`}</Text>
      </TouchableOpacity>
      <Text style={styles.partage}>Le paiement se règle directement avec le propriétaire du terrain.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fff", flexGrow: 1, paddingBottom: 40 },
  titre: { fontSize: 24, fontWeight: "bold" },
  info: { color: "#666", marginTop: 4 },
  section: { fontSize: 16, fontWeight: "bold", marginTop: 20, marginBottom: 8 },
  jour: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: "#16a34a", marginRight: 8 },
  grille: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  creneau: { width: "30%", paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: "#16a34a", alignItems: "center" },
  indispo: { backgroundColor: "#f3f4f6", borderColor: "#d1d5db" },
  actif: { backgroundColor: "#16a34a" },
  texteActif: { color: "#fff", fontWeight: "bold" },
  petit: { fontSize: 10, color: "#dc2626" },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24 },
  pas: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#16a34a", justifyContent: "center", alignItems: "center" },
  pasOff: { backgroundColor: "#d1d5db" },
  pasTexte: { color: "#fff", fontSize: 28, marginTop: -2 },
  nb: { fontSize: 32, fontWeight: "bold", minWidth: 50, textAlign: "center" },
  ligne: { flexDirection: "row", alignItems: "center", gap: 12 },
  aide: { color: "#666", fontSize: 12 },
  partage: { color: "#666", fontSize: 12, marginTop: 8, textAlign: "center" },
  btn: { backgroundColor: "#16a34a", padding: 14, borderRadius: 8, marginTop: 24 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold", fontSize: 16 },
});