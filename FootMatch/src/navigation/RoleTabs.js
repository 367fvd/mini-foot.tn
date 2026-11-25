import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { COULEURS } from "../theme";
import { boutonReglages } from "./TabNavigator";

import OwnerDashboardScreen from "../screens/OwnerDashboardScreen";
import OwnerReservationsScreen from "../screens/OwnerReservationsScreen";
import OwnerPlanningTab from "../screens/OwnerPlanningTab";
import AgentPlayersScreen from "../screens/AgentPlayersScreen";
import AgentFollowsScreen from "../screens/AgentFollowsScreen";
import AgentAgendaScreen from "../screens/AgentAgendaScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();
const icone = (emoji) => () => <Text style={{ fontSize: 20 }}>{emoji}</Text>;

const options = {
  tabBarActiveTintColor: COULEURS.principal,
  headerStyle: { backgroundColor: COULEURS.principal },
  headerTintColor: "#fff",
  headerTitleStyle: { fontWeight: "bold" },
};

export function OwnerTabs() {
  return (
    <Tab.Navigator screenOptions={options}>
      <Tab.Screen name="Accueil" component={OwnerDashboardScreen} options={{ title: "Tableau de bord", tabBarLabel: "Accueil", tabBarIcon: icone("📊") }} />
      <Tab.Screen name="Reservations" component={OwnerReservationsScreen} options={{ title: "Réservations", tabBarIcon: icone("📅") }} />
      <Tab.Screen name="Planning" component={OwnerPlanningTab} options={{ title: "Planning", tabBarIcon: icone("🗓️") }} />
      <Tab.Screen name="Profil" component={ProfileScreen} options={boutonReglages} />
    </Tab.Navigator>
  );
}

export function AgentTabs() {
  return (
    <Tab.Navigator screenOptions={options}>
      <Tab.Screen name="Joueurs" component={AgentPlayersScreen} options={{ title: "Repérer des joueurs", tabBarLabel: "Joueurs", tabBarIcon: icone("🔎") }} />
      <Tab.Screen name="Suivis" component={AgentFollowsScreen} options={{ title: "Joueurs suivis", tabBarIcon: icone("⭐") }} />
      <Tab.Screen name="Agenda" component={AgentAgendaScreen} options={{ title: "Agenda des matchs", tabBarIcon: icone("📆") }} />
      <Tab.Screen name="Profil" component={ProfileScreen} options={boutonReglages} />
    </Tab.Navigator>
  );
}