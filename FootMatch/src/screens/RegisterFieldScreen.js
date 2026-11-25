import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import * as Location from "expo-location";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { messageErreur } from "../utils/erreurs";
import { CRENEAUX_DEFAUT } from "../utils/reservations";
import Champ from "../components/Champ";
import GouvernoratPicker from "../components/GouvernoratPicker";
import VillePicker from "../components/VillePicker";
import { VILLES, validerCommune } from "../utils/tunisie";
import {
  validerEmail, validerMotDePasse, criteresMotDePasse, validerVille, validerAdresse, validerPrix,
  validerLatitude, validerLongitude, validerTelephone, nettoyerTelephone,
} from "../utils/validation";

const garderNombre = (t) => t.replace(/[^0-9.,]/g, "");
const garderCoord = (t) => t.replace(/[^0-9.,-]/g, "");

const validerNomDuTerrain = (v) => {
  const t = (v || "").trim();
  if (t.length < 3) return "Le nom doit contenir au moins 3 caractères.";
  if (t.length > 40) return "Le nom ne doit pas dépasser 40 caractères.";
  return "";
};

export default function RegisterFieldScreen({ navigation }) {
  const [nom, setNom] = useState("");
  const [gouvernorat, setGouvernorat] = useState("");
  const [commune, setCommune] = useState("");
  const [adresse, setAdresse] = useState("");
  const [telephone, setTelephone] = useState("");
  const [prix, setPrix] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [voir, setVoir] = useState(false);
  const [tente, setTente] = useState(false);
  const [emailPris, setEmailPris] = useState("");
  const [chargement, setChargement] = useState(false);

  const errs = {
    nom: validerNomDuTerrain(nom),
    gouvernorat: validerVille(gouvernorat),
    commune: validerCommune(gouvernorat, commune),
    adresse: validerAdresse(adresse),
    telephone: validerTelephone(telephone, true),
    prix: validerPrix(prix),
    lat: validerLatitude(lat),
    lng: validerLongitude(lng),
    email: validerEmail(email),
    password: validerMotDePasse(password, email),
    confirmation: confirmation !== password ? "Les deux mots de passe sont différents." : "",
  };
  const montre = (cle, valeur) => (tente || String(valeur).length > 0 ? errs[cle] : "");

  const criteres = criteresMotDePasse(password);
  const score = criteres.filter((c) => c.ok).length;
  const force = score <= 2 ? { t: "Faible", c: "#dc2626" } : score <= 4 ? { t: "Moyen", c: "#ea580c" } : { t: "Fort", c: "#16a34a" };

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

  const creer = async () => {
    setTente(true);
    if (Object.values(errs).some((e) => e)) {
      Alert.alert("Formulaire incomplet", "Corrige les champs en rouge.");
      return;
    }
    setChargement(true);
    try {
      const mail = email.trim().toLowerCase();
      const cred = await createUserWithEmailAndPassword(auth, mail, password);
      const uid = cred.user.uid;
      try {
        await setDoc(doc(db, "users", uid), {
          nom: nom.trim(),
          email: mail,
          role: "proprietaire",
          poste: "",
          ville: gouvernorat,
          commune,
          noteMoyenne: 0,
          nbNotes: 0,
          partagePosition: false,
          createdAt: serverTimestamp(),
        });
        // Un seul terrain par compte : son identifiant est celui du compte
        await setDoc(doc(db, "fields", uid), {
          nom: nom.trim(),
          gouvernorat,
          commune,
          adresse: adresse.trim(),
          telephone: nettoyerTelephone(telephone),
          email: mail,
          prix: parseFloat(prix.replace(",", ".")),
          latitude: parseFloat(lat.replace(",", ".")),
          longitude: parseFloat(lng.replace(",", ".")),
          creneaux: CRENEAUX_DEFAUT,
          actif: true,
          proprietaireId: uid,
          createdAt: serverTimestamp(),
        });
      } catch (e) {
        Alert.alert("Terrain non enregistré", "Ton compte est créé. Ouvre l'onglet « Mon terrain » pour compléter et enregistrer les informations.");
      }
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        setEmailPris("Cet email est déjà utilisé. Connecte-toi ou choisis un autre email.");
        Alert.alert("Compte existant", "Un compte existe déjà avec cet email. Création refusée.");
      } else {
        Alert.alert("Inscription impossible", messageErreur(error));
      }
    }
    setChargement(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>🏟️ Compte terrain</Text>
      <Text style={styles.sous}>Un compte = un terrain. Tu pourras ensuite gérer les réservations et les matchs.</Text>

      <Champ label="Nom du terrain" placeholder="Ex : Mini-foot Khezama" value={nom} onChangeText={setNom} maxLength={40} erreur={montre("nom", nom)} />

      <GouvernoratPicker label="Gouvernorat" value={gouvernorat} onChange={(g) => { setGouvernorat(g); setCommune(""); }} erreur={tente ? errs.gouvernorat : ""} />
      <VillePicker label="Ville" value={commune} options={VILLES[gouvernorat] || []} onChange={setCommune} desactive={!gouvernorat} erreur={tente ? errs.commune : ""} />

      <Champ label="Adresse / quartier" placeholder="Ex : Rue de la Corniche" value={adresse} onChangeText={setAdresse} maxLength={100} erreur={montre("adresse", adresse)} />

      <Champ
        label="Téléphone du terrain"
        placeholder="Ex : 98 123 456"
        value={telephone}
        onChangeText={(t) => setTelephone(t.replace(/[^0-9+ ]/g, ""))}
        keyboardType="phone-pad"
        maxLength={16}
        erreur={montre("telephone", telephone)}
      />

      <Champ label="Prix de location par heure (DT)" placeholder="Entre 1 et 500" value={prix} onChangeText={(t) => setPrix(garderNombre(t))} keyboardType="decimal-pad" maxLength={6} erreur={montre("prix", prix)} />

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
      <Text style={styles.aide}>Sinon : clic droit sur le lieu dans Google Maps, les deux nombres sont latitude et longitude.</Text>

      <Champ
        label="Email du terrain (pour se connecter)"
        placeholder="terrain@gmail.com"
        value={email}
        onChangeText={(t) => { setEmail(t); setEmailPris(""); }}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        maxLength={100}
        erreur={emailPris || montre("email", email)}
      />

      <Champ label="Mot de passe" placeholder="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry={!voir} autoCapitalize="none" maxLength={64} erreur={montre("password", password)} />
      <TouchableOpacity onPress={() => setVoir(!voir)}>
        <Text style={styles.lienPetit}>{voir ? "🙈 Masquer" : "👁 Afficher"} le mot de passe</Text>
      </TouchableOpacity>

      {password.length > 0 && (
        <View style={styles.force}>
          <Text style={{ color: force.c, fontWeight: "bold" }}>Force : {force.t}</Text>
          {criteres.map((c) => (
            <Text key={c.texte} style={{ color: c.ok ? "#16a34a" : "#9ca3af", fontSize: 12 }}>{c.ok ? "✓" : "○"} {c.texte}</Text>
          ))}
        </View>
      )}

      <Champ label="Confirmer le mot de passe" placeholder="Retape le mot de passe" value={confirmation} onChangeText={setConfirmation} secureTextEntry={!voir} autoCapitalize="none" maxLength={64} erreur={montre("confirmation", confirmation)} />

      <TouchableOpacity style={[styles.btn, chargement && { opacity: 0.6 }]} disabled={chargement} onPress={creer}>
        <Text style={styles.btnText}>{chargement ? "Création..." : "Créer le compte du terrain"}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Déjà un compte ? Se connecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: "#fff", flexGrow: 1 },
  title: { fontSize: 26, fontWeight: "bold", textAlign: "center" },
  sous: { color: "#666", textAlign: "center", marginTop: 4, marginBottom: 8 },
  label: { fontWeight: "bold", marginTop: 14, marginBottom: 4 },
  aide: { color: "#666", fontSize: 12, marginTop: 4 },
  rangee: { flexDirection: "row", gap: 8 },
  lienPetit: { color: "#16a34a", marginTop: 6, fontSize: 13 },
  force: { backgroundColor: "#f9fafb", padding: 10, borderRadius: 8, marginTop: 8, gap: 2 },
  btn: { backgroundColor: "#16a34a", padding: 14, borderRadius: 8, marginTop: 20 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold", fontSize: 16 },
  btnContour: { borderWidth: 1, borderColor: "#16a34a", padding: 12, borderRadius: 8 },
  btnContourTexte: { color: "#16a34a", textAlign: "center", fontWeight: "bold" },
  link: { color: "#16a34a", textAlign: "center", marginTop: 16, marginBottom: 24 },
});