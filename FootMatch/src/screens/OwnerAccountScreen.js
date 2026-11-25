import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import { useAuth } from "../context/AuthContext";

export default function OwnerAccountScreen() {
  const { user } = useAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.titre}>🏟️ Compte terrain</Text>
      <Text style={styles.email}>{user.email}</Text>
      <Text style={styles.aide}>Les informations du terrain se modifient dans l'onglet « Mon terrain ».</Text>
      <TouchableOpacity style={styles.btn} onPress={() => signOut(auth)}>
        <Text style={styles.btnText}>Déconnexion</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#fff" },
  titre: { fontSize: 22, fontWeight: "bold", textAlign: "center", marginTop: 12 },
  email: { color: "#666", textAlign: "center", marginTop: 4 },
  aide: { color: "#666", textAlign: "center", marginTop: 16 },
  btn: { backgroundColor: "#dc2626", padding: 14, borderRadius: 8, marginTop: 24 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold", fontSize: 16 },
});