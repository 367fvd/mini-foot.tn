import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Switch } from "react-native";
import * as Location from "expo-location";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { messageErreur } from "../utils/erreurs";
import { CRENEAUX_DEFAUT } from "../utils/reservations";
import Champ from "../components/Champ";
import GouvernoratPicker from "../components/GouvernoratPicker";
import VillePicker from "../components/VillePicker";
import { VILLES, validerCommune } from "../utils/tunisie";
import {
  validerNomTerrain, validerAdresse, validerVille, validerPrix,
  validerLatitude, validerLongitude, validerTelephone, nettoyerTelephone,
} from "../utils/validation";

const HEURES = Array.from({ length: 16 }, (_, i) => `${String(i + 8).padStart(2, "0")}:00`);
const garderNombre = (t) => t.replace(/[^0-9.,]/g, "");
const garderCoord = (t) => t.replace(/[^0-9.,-]/g, "");

export default function FieldFormScreen({ route, navigation }) {
  const field = route.params?.field;
  const { user } = useAuth();

  const [nom, setNom] = useState(field?.nom || "");
  const [gouvernorat, setGouvernorat] = useState(field?.gouvernorat || "");
  const [commune, setCommune] = useState(field?.commune || "");
  const [adresse, setAdresse] = useState(field?.adresse || "");
  const [telephone, setTelephone] = useState(field?.telephone || "");
  const [prix, setPrix] = useState(field ? String(field.prix ?? "") : "");
  const [lat, setLat] = useState(field ? String(field.latitude) : "");
  const [lng, setLng] = useState(field ? String(field.longitude) : "");
  const [creneaux, setCreneaux] = useState(field?.creneaux || CRENEAUX_DEFAUT);
  const [actif, setActif] = useState(field ? field.actif !== false : true);
  const [tente, setTente] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const errs = {
    nom: validerNomTerrain(nom),
    gouvernorat: validerVille(gouvernorat),
    commune: validerCommune(gouvernorat, commune),
    adresse: validerAdresse(adresse),
    telephone: validerTelephone(telephone),
    prix: validerPrix(prix),
    lat: validerLatitude(lat),
    lng: validerLongitude(lng),
    creneaux: creneaux.length === 0 ? "Choisis au moins un horaire." : "",
  };
  const montre = (cle, valeur) => (tente || String(valeur).length > 0 ? errs[cle] : "");

  const utiliserMaPosition = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return Alert.alert("Localisation refusée", "Autorise la localisation dans les réglages.");
      const loc = await Location.getCurrentPositionAsync({});
      setLat(String(loc.coords.latitude));
      setLng(String(loc.coords.longitude));
    } catch (e) {
      Alert.alert("Erreur", messageErreur(e));
    }
  };

  const basculer = (h) => setCreneaux((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]));

  const enregistrer = async () => {
    setTente(true);
    if (Object.values(errs).some((e) => e)) {
      Alert.alert("Formulaire incomplet", "Corrige les champs en rouge.");
      return;
    }
    const donnees = {
      nom: nom.trim(),
      gouvernorat,
      commune,
      adresse: adresse.trim(),
      telephone: nettoyerTelephone(telephone),
      prix: parseFloat(prix.replace(",", ".")),
      latitude: parseFloat(lat.replace(",", ".")),
      longitude: parseFloat(lng.replace(",", ".")),
      creneaux: [...creneaux].sort(),
      actif,
      proprietaireId: user.uid,
    };
    setEnvoi(true);
    try {
      if (field) await updateDoc(doc(db, "fields", field.id), donnees);
      else await addDoc(collection(db, "fields"), { ...donnees, createdAt: serverTimestamp() });
      Alert.alert("Enregistré ✅", field ? "Le terrain a été modifié." : "Ton terrain apparaît maintenant sur la carte des joueurs.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Erreur", messageErreur(e));
    }
    setEnvoi(false);
  };

  const supprimer = () =>
    Alert.alert(
      "Supprimer ce terrain ?",
      "Il disparaîtra de la carte. Annule d'abord les réservations à venir depuis l'onglet Réservations. Pour simplement le fermer, utilise l'interrupteur.",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "fields", field.id));
              navigation.goBack();
            } catch (e) {
              Alert.alert("Erreur", messageErreur(e));
            }
          },
        },
      ]
    );

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Champ label="Nom du terrain" value={nom} onChangeText={setNom} maxLength={50} placeholder="Ex : Mini-foot Khezama" erreur={montre("nom", nom)} />

      <GouvernoratPicker
        label="Gouvernorat"
        value={gouvernorat}
        onChange={(g) => { setGouvernorat(g); setCommune(""); }}
        erreur={tente ? errs.gouvernorat : ""}
      />
      <VillePicker
        label="Ville"
        value={commune}
        options={VILLES[gouvernorat] || []}
        onChange={setCommune}
        desactive={!gouvernorat}
        erreur={tente ? errs.commune : ""}
      />

      <Champ label="Adresse / quartier" value={adresse} onChangeText={setAdresse} maxLength={100} placeholder="Ex : Rue de la Corniche" erreur={montre("adresse", adresse)} />

      <Champ
        label="Téléphone du terrain (optionnel)"
        value={telephone}
        onChangeText={(t) => setTelephone(t.replace(/[^0-9+ ]/g, ""))}
        keyboardType="phone-pad"
        maxLength={16}
        placeholder="Ex : 98 123 456"
        erreur={montre("telephone", telephone)}
      />

      <Champ
        label="Prix de location par heure (DT)"
        value={prix}
        onChangeText={(t) => setPrix(garderNombre(t))}
        keyboardType="decimal-pad"
        maxLength={6}
        placeholder="Entre 1 et 500"
        erreur={montre("prix", prix)}
      />

      <Text style={styles.label}>Position du terrain</Text>
      <TouchableOpacity style={styles.btnContour} onPress={utiliserMaPosition}>
        <Text style={styles.btnContourTexte}>📍 Utiliser ma position actuelle (sur place)</Text>
      </TouchableOpacity>
      <View style={styles.rangee}>
        <View style={{ flex: 1 }}>
          <Champ value={lat} onChangeText={(t) => setLat(garderCoord(t))} placeholder="Latitude" keyboardType="numbers-and-punctuation" maxLength={12} erreur={montre("lat", lat)} />
        </View>
        <View style={{ flex: 1 }}>
          <Champ value={lng} onChangeText={(t) => setLng(garderCoord(t))} placeholder="Longitude" keyboardType="numbers-and-punctuation" maxLength={12} erreur={montre("lng", lng)} />
        </View>
      </View>
      <Text style={styles.aide}>Sinon : clic droit sur le lieu dans Google Maps, les deux nombres affichés sont latitude et longitude.</Text>

      <Text style={styles.label}>Horaires proposés (début de chaque créneau d'1h)</Text>
      <View style={styles.grille}>
        {HEURES.map((h) => (
          <TouchableOpacity key={h} style={[styles.heure, creneaux.includes(h) && styles.heureActive]} onPress={() => basculer(h)}>
            <Text style={creneaux.includes(h) && { color: "#fff", fontWeight: "bold" }}>{h}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {!!errs.creneaux && <Text style={styles.erreur}>⚠️ {errs.creneaux}</Text>}

      <View style={styles.ligne}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Ouvert à la réservation</Text>
          <Text style={styles.aide}>Fermé = invisible pour les joueurs (travaux, vacances...).</Text>
        </View>
        <Switch value={actif} onValueChange={setActif} trackColor={{ true: "#16a34a" }} />
      </View>

      <TouchableOpacity style={[styles.btn, envoi && { opacity: 0.6 }]} disabled={envoi} onPress={enregistrer}>
        <Text style={styles.btnText}>{envoi ? "Enregistrement..." : field ? "Enregistrer les modifications" : "Ajouter le terrain"}</Text>
      </TouchableOpacity>

      {field && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: "#dc2626" }]} onPress={supprimer}>
          <Text style={styles.btnText}>Supprimer le terrain</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fff", flexGrow: 1, paddingBottom: 40 },
  label: { fontWeight: "bold", marginTop: 14, marginBottom: 4 },
  aide: { color: "#666", fontSize: 12, marginTop: 4 },
  erreur: { color: "#dc2626", fontSize: 12, marginTop: 4 },
  rangee: { flexDirection: "row", gap: 8 },
  grille: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  heure: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: "#16a34a" },
  heureActive: { backgroundColor: "#16a34a" },
  ligne: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  btn: { backgroundColor: "#16a34a", padding: 14, borderRadius: 8, marginTop: 20 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold", fontSize: 16 },
  btnContour: { borderWidth: 1, borderColor: "#16a34a", padding: 12, borderRadius: 8 },
  btnContourTexte: { color: "#16a34a", textAlign: "center", fontWeight: "bold" },
});