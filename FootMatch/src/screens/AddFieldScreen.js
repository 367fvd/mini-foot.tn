import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import * as Location from "expo-location";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { messageErreur } from "../utils/erreurs";

export default function AddFieldScreen({ navigation }) {
  const { user } = useAuth();
  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [prix, setPrix] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const utiliserMaPosition = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Localisation refusée", "Autorise la localisation dans les réglages.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLat(String(loc.coords.latitude));
      setLng(String(loc.coords.longitude));
    } catch (e) {
      Alert.alert("Erreur", messageErreur(e));
    }
  };

  const enregistrer = async () => {
    const latitude = parseFloat(lat.replace(",", "."));
    const longitude = parseFloat(lng.replace(",", "."));
    if (!nom.trim() || !adresse.trim() || isNaN(latitude) || isNaN(longitude)) {
      Alert.alert("Erreur", "Remplis le nom, l'adresse et la position du terrain.");
      return;
    }
    setEnvoi(true);
    try {
      await addDoc(collection(db, "fields"), {
        nom: nom.trim(),
        adresse: adresse.trim(),
        prix: parseFloat(prix.replace(",", ".")) || 0,
        latitude,
        longitude,
        ajoutePar: user.uid,
        createdAt: serverTimestamp(),
      });
      Alert.alert("Terrain ajouté ✅", "Il apparaît maintenant sur la carte.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Erreur", messageErreur(e));
    }
    setEnvoi(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Nom du terrain</Text>
      <TextInput style={styles.input} value={nom} onChangeText={setNom} placeholder="Ex : Mini-foot Khezama" />

      <Text style={styles.label}>Adresse / quartier</Text>
      <TextInput style={styles.input} value={adresse} onChangeText={setAdresse} placeholder="Ex : Sousse, Khezama" />

      <Text style={styles.label}>Prix par heure (DT)</Text>
      <TextInput style={styles.input} value={prix} onChangeText={setPrix} keyboardType="numeric" placeholder="Ex : 50" />

      <Text style={styles.label}>Position du terrain</Text>
      <TouchableOpacity style={styles.btnContour} onPress={utiliserMaPosition}>
        <Text style={styles.btnContourTexte}>📍 Utiliser ma position actuelle</Text>
      </TouchableOpacity>
      <View style={styles.rangee}>
        <TextInput style={[styles.input, { flex: 1 }]} value={lat} onChangeText={setLat} placeholder="Latitude" keyboardType="numbers-and-punctuation" />
        <TextInput style={[styles.input, { flex: 1 }]} value={lng} onChangeText={setLng} placeholder="Longitude" keyboardType="numbers-and-punctuation" />
      </View>

      <TouchableOpacity style={[styles.btn, envoi && { opacity: 0.6 }]} disabled={envoi} onPress={enregistrer}>
        <Text style={styles.btnText}>{envoi ? "Enregistrement..." : "Ajouter le terrain"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fff", flexGrow: 1 },
  label: { fontWeight: "bold", marginTop: 14, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 },
  rangee: { flexDirection: "row", gap: 8, marginTop: 8 },
  btn: { backgroundColor: "#16a34a", padding: 14, borderRadius: 8, marginTop: 24 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold", fontSize: 16 },
  btnContour: { borderWidth: 1, borderColor: "#16a34a", padding: 12, borderRadius: 8 },
  btnContourTexte: { color: "#16a34a", textAlign: "center", fontWeight: "bold" },
});