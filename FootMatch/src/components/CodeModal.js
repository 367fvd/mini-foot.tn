import React, { useState } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";

export default function CodeModal({ visible, titre = "Match privé 🔒", onValider, onAnnuler }) {
  const [code, setCode] = useState("");

  const fermer = () => { setCode(""); onAnnuler(); };
  const valider = () => { const c = code; setCode(""); onValider(c); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={fermer}>
      <View style={styles.fond}>
        <View style={styles.boite}>
          <Text style={styles.titre}>{titre}</Text>
          <Text style={styles.texte}>Demande le mot de passe à l'organisateur du match.</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="Mot de passe du match"
            secureTextEntry
            autoCapitalize="none"
            maxLength={12}
          />
          <View style={styles.rangee}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: "#9ca3af" }]} onPress={fermer}>
              <Text style={styles.btnTexte}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, !code && { opacity: 0.5 }]} disabled={!code} onPress={valider}>
              <Text style={styles.btnTexte}>Rejoindre</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  boite: { backgroundColor: "#fff", borderRadius: 16, padding: 20 },
  titre: { fontSize: 20, fontWeight: "bold", textAlign: "center" },
  texte: { color: "#666", textAlign: "center", marginTop: 6, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 },
  rangee: { flexDirection: "row", gap: 8, marginTop: 16 },
  btn: { flex: 1, backgroundColor: "#16a34a", padding: 12, borderRadius: 8 },
  btnTexte: { color: "#fff", textAlign: "center", fontWeight: "bold" },
});