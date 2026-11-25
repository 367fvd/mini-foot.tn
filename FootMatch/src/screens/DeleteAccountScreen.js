import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser } from "firebase/auth";
import { doc, deleteDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { messageErreur } from "../utils/erreurs";
import Champ from "../components/Champ";

export default function DeleteAccountScreen() {
  const { role } = useAuth();
  const [mdp, setMdp] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const supprimer = () => {
    if (!mdp) return setErreur("Entre ton mot de passe pour confirmer.");
    Alert.alert("Supprimer définitivement ?", "Cette action est irréversible.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          setEnvoi(true);
          try {
            const u = auth.currentUser;
            await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, mdp));
            if (role === "proprietaire") await deleteDoc(doc(db, "fields", u.uid));
            await deleteDoc(doc(db, "users", u.uid));
            await deleteUser(u);
          } catch (e) {
            setErreur(e.code === "auth/invalid-credential" || e.code === "auth/wrong-password" ? "Mot de passe incorrect." : messageErreur(e));
            setEnvoi(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titre}>🗑️ Supprimer mon compte</Text>
      <Text style={styles.texte}>
        Ton profil et tes données personnelles seront supprimés définitivement.
        {role === "proprietaire" ? "\n\nTon terrain disparaîtra de la carte. Pense à annuler d'abord les réservations à venir." : ""}
        {role === "joueur" ? "\n\nQuitte ou annule tes matchs à venir avant de supprimer ton compte." : ""}
      </Text>

      <Champ label="Mot de passe" value={mdp} onChangeText={(t) => { setMdp(t); setErreur(""); }} secureTextEntry autoCapitalize="none" maxLength={64} erreur={erreur} />

      <TouchableOpacity style={[styles.btn, envoi && { opacity: 0.6 }]} disabled={envoi} onPress={supprimer}>
        <Text style={styles.btnText}>{envoi ? "Suppression..." : "Supprimer mon compte"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  titre: { fontSize: 22, fontWeight: "bold" },
  texte: { color: "#6b7280", marginTop: 10 },
  btn: { backgroundColor: "#dc2626", padding: 14, borderRadius: 10, marginTop: 24 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold", fontSize: 16 },
});