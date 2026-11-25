import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COULEURS } from "../theme";

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.haut}>
        <Text style={styles.logo}>⚽</Text>
        <Text style={styles.titre}>FootMatch</Text>
        <Text style={styles.slogan}>Trouve ton match.{"\n"}Réserve ton terrain.{"\n"}Joue avec les tiens.</Text>
      </View>

      <View style={styles.bas}>
        <TouchableOpacity style={styles.btnBlanc} onPress={() => navigation.navigate("Register")}>
          <Text style={styles.btnBlancTexte}>Créer un compte</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnContour} onPress={() => navigation.navigate("Login")}>
          <Text style={styles.btnContourTexte}>J'ai déjà un compte</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COULEURS.principal, justifyContent: "space-between", padding: 28 },
  haut: { flex: 1, justifyContent: "center", alignItems: "center" },
  logo: { fontSize: 90 },
  titre: { fontSize: 40, fontWeight: "bold", color: "#fff", marginTop: 8 },
  slogan: { fontSize: 18, color: "#dcfce7", textAlign: "center", marginTop: 16, lineHeight: 28 },
  bas: { gap: 12, paddingBottom: 24 },
  btnBlanc: { backgroundColor: "#fff", padding: 16, borderRadius: 12 },
  btnBlancTexte: { color: COULEURS.principalFonce, textAlign: "center", fontWeight: "bold", fontSize: 16 },
  btnContour: { borderWidth: 2, borderColor: "#fff", padding: 14, borderRadius: 12 },
  btnContourTexte: { color: "#fff", textAlign: "center", fontWeight: "bold", fontSize: 16 },
});