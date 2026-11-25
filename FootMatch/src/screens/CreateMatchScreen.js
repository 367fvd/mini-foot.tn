import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";

export default function CreateMatchScreen({ navigation }) {
  const { user } = useAuth();
  const [terrain, setTerrain] = useState("");
  const [ville, setVille] = useState("");
  const [date, setDate] = useState("");
  const [heure, setHeure] = useState("");
  const [nbJoueurs, setNbJoueurs] = useState("10");

  const handleCreate = async () => {
    if (!terrain || !ville || !date || !heure) {
      Alert.alert("Erreur", "Remplis tous les champs");
      return;
    }
    try {
      await addDoc(collection(db, "matches"), {
        terrain,
        ville,
        date,     // format : 2026-11-20
        heure,    // format : 20:00
        nbJoueurs: parseInt(nbJoueurs) || 10,
        createurId: user.uid,
        joueurs: [user.uid],
        statut: "ouvert",
        createdAt: serverTimestamp(),
      });
      Alert.alert("Succès", "Match créé !");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Erreur", error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Terrain</Text>
      <TextInput style={styles.input} placeholder="Ex : Terrain Les Aigles" value={terrain} onChangeText={setTerrain} />

      <Text style={styles.label}>Ville</Text>
      <TextInput style={styles.input} placeholder="Ex : Sidi Bouzid" value={ville} onChangeText={setVille} />

      <Text style={styles.label}>Date (AAAA-MM-JJ)</Text>
      <TextInput style={styles.input} placeholder="2026-11-20" value={date} onChangeText={setDate} />

      <Text style={styles.label}>Heure (HH:MM)</Text>
      <TextInput style={styles.input} placeholder="20:00" value={heure} onChangeText={setHeure} />

      <Text style={styles.label}>Nombre de joueurs</Text>
      <TextInput style={styles.input} value={nbJoueurs} onChangeText={setNbJoueurs} keyboardType="numeric" />

      <TouchableOpacity style={styles.button} onPress={handleCreate}>
        <Text style={styles.buttonText}>Créer le match</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: "#fff", flexGrow: 1 },
  label: { fontWeight: "bold", marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 },
  button: { backgroundColor: "#16a34a", padding: 14, borderRadius: 8, marginTop: 24 },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "bold", fontSize: 16 },
});