import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { COULEURS } from "../theme";

import WelcomeScreen from "../screens/WelcomeScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import RegisterFieldScreen from "../screens/RegisterFieldScreen";
import TabNavigator from "./TabNavigator";
import { OwnerTabs, AgentTabs } from "./RoleTabs";

import MatchDetailScreen from "../screens/MatchDetailScreen";
import RatePlayersScreen from "../screens/RatePlayersScreen";
import InviteFriendsScreen from "../screens/InviteFriendsScreen";
import ReserveFieldScreen from "../screens/ReserveFieldScreen";
import ChatScreen from "../screens/ChatScreen";
import PlayerProfileScreen from "../screens/PlayerProfileScreen";
import PlayerDetailScreen from "../screens/PlayerDetailScreen";
import AgentEvaluateScreen from "../screens/AgentEvaluateScreen";

import SettingsScreen from "../screens/SettingsScreen";
import PersonalInfoScreen from "../screens/PersonalInfoScreen";
import FieldInfoScreen from "../screens/FieldInfoScreen";
import FieldPricingScreen from "../screens/FieldPricingScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";
import PrivacyScreen from "../screens/PrivacyScreen";
import DeleteAccountScreen from "../screens/DeleteAccountScreen";

const Stack = createNativeStackNavigator();

const enteteVerte = {
  headerStyle: { backgroundColor: COULEURS.principal },
  headerTintColor: "#fff",
  headerTitleStyle: { fontWeight: "bold" },
  headerBackTitle: "Retour",
};

// Écrans de paramètres, communs aux trois types de compte
const ecransParametres = (
  <>
    <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Paramètres" }} />
    <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} options={{ title: "Informations personnelles" }} />
    <Stack.Screen name="FieldInfo" component={FieldInfoScreen} options={{ title: "Informations du terrain" }} />
    <Stack.Screen name="FieldPricing" component={FieldPricingScreen} options={{ title: "Tarif et horaires" }} />
    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: "Mot de passe" }} />
    <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: "Confidentialité" }} />
    <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{ title: "Supprimer le compte" }} />
  </>
);

export default function AppNavigator() {
  const { user, role, loading } = useAuth();

  if (loading || (user && !role)) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" color={COULEURS.principal} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={enteteVerte}>
        {!user ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Connexion" }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "Inscription" }} />
            <Stack.Screen name="RegisterField" component={RegisterFieldScreen} options={{ title: "Compte terrain" }} />
          </>
        ) : role === "proprietaire" ? (
          <>
            <Stack.Screen name="OwnerTabs" component={OwnerTabs} options={{ headerShown: false }} />
            {ecransParametres}
          </>
        ) : role === "agent" ? (
          <>
            <Stack.Screen name="AgentTabs" component={AgentTabs} options={{ headerShown: false }} />
            <Stack.Screen name="PlayerDetail" component={PlayerDetailScreen} options={{ title: "Fiche joueur" }} />
            <Stack.Screen name="AgentEvaluate" component={AgentEvaluateScreen} options={{ title: "Évaluer les joueurs" }} />
            {ecransParametres}
          </>
        ) : (
          <>
            <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
            <Stack.Screen name="MatchDetail" component={MatchDetailScreen} options={{ title: "Détail du match" }} />
            <Stack.Screen name="RatePlayers" component={RatePlayersScreen} options={{ title: "Noter les joueurs" }} />
            <Stack.Screen name="InviteFriends" component={InviteFriendsScreen} options={{ title: "Inviter un joueur" }} />
            <Stack.Screen name="ReserveField" component={ReserveFieldScreen} options={{ title: "Réserver un terrain" }} />
            <Stack.Screen name="Chat" component={ChatScreen} options={{ title: "Discussion du match" }} />
            <Stack.Screen name="PlayerProfile" component={PlayerProfileScreen} options={{ title: "Profil du joueur" }} />
            {ecransParametres}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}