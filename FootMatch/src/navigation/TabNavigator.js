import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { COULEURS } from "../theme";

import MatchsScreen from "../screens/MatchsScreen";
import MapScreen from "../screens/MapScreen";
import SocialScreen from "../screens/SocialScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();
const icone = (emoji) => () => <Text style={{ fontSize: 20 }}>{emoji}</Text>;

export const boutonReglages = ({ navigation }) => ({
  title: "Mon profil",
  tabBarIcon: icone("👤"),
  headerRight: () => (
    <TouchableOpacity style={{ marginRight: 16 }} onPress={() => navigation.navigate("Settings")}>
      <Text style={{ fontSize: 22 }}>⚙️</Text>
    </TouchableOpacity>
  ),
});

export default function TabNavigator() {
  const { user } = useAuth();
  const [nb, setNb] = useState({ amis: 0, invit: 0 });

  useEffect(() => {
    const qa = query(collection(db, "friends"), where("pour", "==", user.uid), where("statut", "==", "en_attente"));
    const qi = query(collection(db, "invitations"), where("pour", "==", user.uid), where("statut", "==", "en_attente"));
    const u1 = onSnapshot(qa, (s) => setNb((p) => ({ ...p, amis: s.size })), () => {});
    const u2 = onSnapshot(qi, (s) => setNb((p) => ({ ...p, invit: s.size })), () => {});
    return () => { u1(); u2(); };
  }, []);

  const total = nb.amis + nb.invit;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COULEURS.principal,
        headerStyle: { backgroundColor: COULEURS.principal },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Tab.Screen name="Matchs" component={MatchsScreen} options={{ title: "Matchs", tabBarIcon: icone("⚽") }} />
      <Tab.Screen name="Carte" component={MapScreen} options={{ title: "Terrains près de moi", tabBarLabel: "Explorer", tabBarIcon: icone("🗺️") }} />
      <Tab.Screen name="Social" component={SocialScreen} options={{ title: "Amis et invitations", tabBarIcon: icone("👥"), tabBarBadge: total > 0 ? total : undefined }} />
      <Tab.Screen name="Profil" component={ProfileScreen} options={boutonReglages} />
    </Tab.Navigator>
  );
}