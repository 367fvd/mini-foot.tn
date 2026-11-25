import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import { useAuth } from "../context/AuthContext";

export default function HomeScreen() {
    const { user } = useAuth();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Bienvenue ⚽</Text>
            <Text>{user?.email}</Text>

            <TouchableOpacity style={styles.button} onPress={() => signOut(auth)}>
                <Text style={styles.buttonText}>Déconnexion</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", alignItems: "center" },
    title: { fontSize: 26, fontWeight: "bold", marginBottom: 8 },
    button: { backgroundColor: "#dc2626", padding: 12, borderRadius: 8, marginTop: 20 },
    buttonText: { color: "#fff", fontWeight: "bold" },
});