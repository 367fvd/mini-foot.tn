import React, { useState } from "react";
import { Text, TouchableOpacity, StyleSheet, Alert, ScrollView, View } from "react-native";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { auth } from "../config/firebase";
import { messageErreur } from "../utils/erreurs";
import Champ from "../components/Champ";
import { validerMotDePasse, criteresMotDePasse } from "../utils/validation";

export default function ChangePasswordScreen({ navigation }) {
  const [actuel, setActuel] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [voir, setVoir] = useState(false);
  const [tente, setTente] = useState(false);
  const [erreurActuel, setErreurActuel] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const email = auth.currentUser?.email || "";
  const errs = {
    actuel: actuel ? "" : "Entre ton mot de passe actuel.",
    nouveau: validerMotDePasse(nouveau, email) || (nouveau === actuel ? "Le nouveau mot de passe doit être différent de l'ancien." : ""),
    confirmation: confirmation !== nouveau ? "Les deux mots de passe sont différents." : "",
  };
  const criteres = criteresMotDePasse(nouveau);

  const changer = async () => {
    setTente(true);
    if (Object.values(errs).some((e) => e)) return;
    setEnvoi(true);
    try {
      const u = auth.currentUser;
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, actuel));
      await updatePassword(u, nouveau);
      Alert.alert("Mot de passe modifié ✅", "Utilise-le à ta prochaine connexion.");
      navigation.goBack();
    } catch (e) {
      if (e.code === "auth/invalid-credential" || e.code === "auth/wrong-password") {
        setErreurActuel("Mot de passe actuel incorrect.");
      } else {
        Alert.alert("Erreur", messageErreur(e));
      }
    }
    setEnvoi(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Champ label="Mot de passe actuel" value={actuel} onChangeText={(t) => { setActuel(t); setErreurActuel(""); }} secureTextEntry={!voir} autoCapitalize="none" maxLength={64} erreur={erreurActuel || (tente ? errs.actuel : "")} />
      <Champ label="Nouveau mot de passe" value={nouveau} onChangeText={setNouveau} secureTextEntry={!voir} autoCapitalize="none" maxLength={64} erreur={tente || nouveau ? errs.nouveau : ""} />

      {nouveau.length > 0 && (
        <View style={styles.force}>
          {criteres.map((c) => (
            <Text key={c.texte} style={{ color: c.ok ? "#16a34a" : "#9ca3af", fontSize: 12 }}>{c.ok ? "✓" : "○"} {c.texte}</Text>
          ))}
        </View>
      )}

      <Champ label="Confirmer le nouveau mot de passe" value={confirmation} onChangeText={setConfirmation} secureTextEntry={!voir} autoCapitalize="none" maxLength={64} erreur={tente || confirmation ? errs.confirmation : ""} />

      <TouchableOpacity onPress={() => setVoir(!voir)}>
        <Text style={styles.lien}>{voir ? "🙈 Masquer" : "👁 Afficher"} les mots de passe</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, envoi && { opacity: 0.6 }]} disabled={envoi} onPress={changer}>
        <Text style={styles.btnText}>{envoi ? "Modification..." : "Changer le mot de passe"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fff", flexGrow: 1 },
  force: { backgroundColor: "#f9fafb", padding: 10, borderRadius: 8, marginTop: 8, gap: 2 },
  lien: { color: "#16a34a", marginTop: 12 },
  btn: { backgroundColor: "#16a34a", padding: 14, borderRadius: 10, marginTop: 20 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold", fontSize: 16 },
});