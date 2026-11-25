import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import * as Location from "expo-location";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { messageErreur } from "../utils/erreurs";
import Champ from "../components/Champ";
import GouvernoratPicker from "../components/GouvernoratPicker";
import VillePicker from "../components/VillePicker";
import { VILLES, validerCommune } from "../utils/tunisie";
import { validerAdresse, validerVille, validerLatitude, validerLongitude, validerTelephone, nettoyerTelephone } from "../utils/validation";

const garderCoord = (t) => t.replace(/[^0-9.,-]/g, "");

export default function FieldInfoScreen({ navigation }) {
  const { user } = useAuth();
  const [pret, setPret] = useState(false);
  const [nom, setNom] = useState("");
  const [gouvernorat, setGouvernorat] = useState("");
  const [commune, setCommune] = useState("");
  const [adresse, setAdresse] = useState("");
  const [telephone, setTelephone] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [tente, setTente] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    getDoc(doc(db, "fields", user.uid))
      .then((s) => {
        if (s.exists()) {
          const f = s.data();
          setNom(f.nom || ""); setGouvernorat(f.gouvernorat || ""); setCommune(f.commune || "");
          setAdresse(f.adresse || ""); setTelephone(f.telephone || "");
          setLat(f.latitude != null ? String(f.latitude) : ""); setLng(f.longitude != null ? String(f.longitude) : "");
        }
        setPret(true);
      })
      .catch((e) => { Alert.alert("Erreur", messageErreur(e)); setPret(true); });
  }, []);

  const errs = {
    nom: nom.trim().length < 3 ? "Le nom doit contenir au moins 3 caractères." : "",
    gouvernorat: validerVille(gouvernorat),
    commune: validerCommune(gouvernorat, commune),
    adresse: validerAdresse(adresse),
    telephone: validerTelephone(telephone, true),
    lat: validerLatitude(lat),
    lng: validerLongitude(lng),
  };
  const montre = (c, v) => (tente || String(v).length > 0 ? errs[c] : "");

  const maPosition = async () => {
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

  const enregistrer = async () => {
    setTente(true);
    if (Object.values(errs).some((e) => e)) return Alert.alert("Formulaire incomplet", "Corrige les champs en rouge.");
    setEnvoi(true);
    try {
      await setDoc(
        doc(db, "fields", user.uid),
        {
          nom: nom.trim(), gouvernorat, commune, adresse: adresse.trim(),
          telephone: nettoyerTelephone(telephone), email: user.email,
          latitude: parseFloat(lat.replace(",", ".")), longitude: parseFloat(lng.replace(",", ".")),
          proprietaireId: user.uid, updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      await setDoc(doc(db, "users", user.uid), { nom: nom.trim().slice(0, 40), ville: gouvernorat, commune }, { merge: true });
      Alert.alert("Enregistré ✅", "Les informations de ton terrain sont à jour.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Erreur", messageErreur(e));
    }
    setEnvoi(false);
  };

  if (!pret) return <Text style={{ padding: 20 }}>Chargement...</Text>;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Champ label="Nom du terrain" value={nom} onChangeText={setNom} maxLength={40} erreur={montre("nom", nom)} />
      <GouvernoratPicker label="Gouvernorat" value={gouvernorat} onChange={(g) => { setGouvernorat(g); setCommune(""); }} erreur={tente ? errs.gouvernorat : ""} />
      <VillePicker label="Ville" value={commune} options={VILLES[gouvernorat] || []} onChange={setCommune} desactive={!gouvernorat} erreur={tente ? errs.commune : ""} />
      <Champ label="Adresse / quartier" value={adresse} onChangeText={setAdresse} maxLength={100} erreur={montre("adresse", adresse)} />
      <Champ label="Téléphone du terrain" value={telephone} onChangeText={(t) => setTelephone(t.replace(/[^0-9+ ]/g, ""))} keyboardType="phone-pad" maxLength={16} erreur={montre("telephone", telephone)} />

      <Text style={styles.label}>Position du terrain</Text>
      <TouchableOpacity style={styles.btnContour} onPress={maPosition}>
        <Text style={styles.btnContourTexte}>📍 Utiliser ma position actuelle (sur place)</Text>
      </TouchableOpacity>
      <View style={styles.rangee}>
        <View style={{ flex: 1 }}><Champ value={lat} onChangeText={(t) => setLat(garderCoord(t))} placeholder="Latitude" keyboardType="numbers-and-punctuation" maxLength={12} erreur={montre("lat", lat)} /></View>
        <View style={{ flex: 1 }}><Champ value={lng} onChangeText={(t) => setLng(garderCoord(t))} placeholder="Longitude" keyboardType="numbers-and-punctuation" maxLength={12} erreur={montre("lng", lng)} /></View>
      </View>

      <Text style={styles.email}>📧 {user.email} (non modifiable)</Text>

      <TouchableOpacity style={[styles.btn, envoi && { opacity: 0.6 }]} disabled={envoi} onPress={enregistrer}>
        <Text style={styles.btnText}>{envoi ? "Enregistrement..." : "Enregistrer"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fff", flexGrow: 1, paddingBottom: 40 },
  label: { fontWeight: "bold", marginTop: 14, marginBottom: 4 },
  email: { color: "#6b7280", marginTop: 18 },
  rangee: { flexDirection: "row", gap: 8 },
  btn: { backgroundColor: "#16a34a", padding: 14, borderRadius: 10, marginTop: 20 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold", fontSize: 16 },
  btnContour: { borderWidth: 1, borderColor: "#16a34a", padding: 12, borderRadius: 10 },
  btnContourTexte: { color: "#16a34a", textAlign: "center", fontWeight: "bold" },
});