import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../config/firebase";
import { messageErreur } from "../utils/erreurs";
import Champ from "../components/Champ";
import { validerEmail } from "../utils/validation";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tente, setTente] = useState(false);
  const [chargement, setChargement] = useState(false);

  const errEmail = validerEmail(email);
  const errMdp = password ? "" : "Entre ton mot de passe.";

  const handleLogin = async () => {
    setTente(true);
    if (errEmail || errMdp) return;
    setChargement(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    } catch (error) {
      Alert.alert("Connexion impossible", messageErreur(error));
    }
    setChargement(false);
  };

  const motDePasseOublie = async () => {
    if (validerEmail(email)) {
      setTente(true);
      Alert.alert("Mot de passe oublié", "Écris d'abord une adresse email valide dans le champ email, puis réappuie ici.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      Alert.alert("Email envoyé ✅", "Si un compte existe avec cet email, tu vas recevoir un lien pour choisir un nouveau mot de passe. Vérifie aussi les spams.");
    } catch (error) {
      Alert.alert("Erreur", messageErreur(error));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>⚽ FootMatch</Text>
      <Text style={styles.sous}>Trouve un match près de chez toi</Text>

      <Champ
        label="Email"
        placeholder="nom@gmail.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        maxLength={100}
        erreur={tente || email ? errEmail : ""}
      />
      <Champ
        label="Mot de passe"
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        maxLength={64}
        erreur={tente ? errMdp : ""}
      />

      <TouchableOpacity style={[styles.button, chargement && { opacity: 0.6 }]} disabled={chargement} onPress={handleLogin}>
        <Text style={styles.buttonText}>{chargement ? "Connexion..." : "Se connecter"}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={motDePasseOublie}>
        <Text style={styles.lien}>Mot de passe oublié ?</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <Text style={styles.lien}>Pas de compte ? S'inscrire</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 34, fontWeight: "bold", textAlign: "center" },
  sous: { textAlign: "center", color: "#666", marginBottom: 20, marginTop: 4 },
  button: { backgroundColor: "#16a34a", padding: 14, borderRadius: 8, marginTop: 20 },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "bold", fontSize: 16 },
  lien: { color: "#16a34a", textAlign: "center", marginTop: 16 },
});