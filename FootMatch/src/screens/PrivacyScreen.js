import React, { useEffect, useState } from "react";
import { View, Text, Switch, StyleSheet, Alert } from "react-native";
import { doc, getDoc, setDoc, deleteField } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { messageErreur } from "../utils/erreurs";
import { Section } from "../components/Menu";

export default function PrivacyScreen() {
  const { user } = useAuth();
  const [partage, setPartage] = useState(true);

  useEffect(() => {
    getDoc(doc(db, "users", user.uid)).then((s) => s.exists() && setPartage(s.data().partagePosition !== false)).catch(() => {});
  }, []);

  const changer = async (v) => {
    setPartage(v);
    try {
      const d = { partagePosition: v };
      if (!v) d.position = deleteField();
      await setDoc(doc(db, "users", user.uid), d, { merge: true });
    } catch (e) {
      setPartage(!v);
      Alert.alert("Erreur", messageErreur(e));
    }
  };

  return (
    <View style={styles.container}>
      <Section titre="Position">
        <View style={styles.ligne}>
          <View style={{ flex: 1 }}>
            <Text style={styles.texte}>📍 Partager ma position</Text>
            <Text style={styles.aide}>Les autres joueurs te voient sur la carte, avec une position approximative (environ 1 km). Désactivé : ta position est effacée.</Text>
          </View>
          <Switch value={partage} onValueChange={changer} trackColor={{ true: "#16a34a" }} />
        </View>
      </Section>
      <Text style={styles.note}>Ton email et ta position exacte ne sont jamais montrés aux autres joueurs.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  ligne: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  texte: { fontSize: 16 },
  aide: { color: "#6b7280", fontSize: 12, marginTop: 4 },
  note: { color: "#6b7280", fontSize: 12, margin: 20, textAlign: "center" },
});