import { StatusBar } from "expo-status-bar";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type RootStackParamList = {
  Home: undefined;
  Animals: undefined;
  Students: undefined;
  Vaccines: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const HomeScreen = ({ navigation }: { navigation: any }) => (
  <SafeAreaView style={styles.container}>
    <Text style={styles.title}>Finca Tigrillo</Text>
    <Text style={styles.subtitle}>Control de animales, vacunas y actividades</Text>
    <ScrollView contentContainerStyle={styles.menu}>
      {[
        { label: "Animales", screen: "Animals" },
        { label: "Estudiantes", screen: "Students" },
        { label: "Vacunas", screen: "Vaccines" },
      ].map((item) => (
        <TouchableOpacity key={item.screen} style={styles.card} onPress={() => navigation.navigate(item.screen)}>
          <Text style={styles.cardText}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
    <StatusBar style="auto" />
  </SafeAreaView>
);

const PlaceholderScreen = ({ title }: { title: string }) => (
  <SafeAreaView style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.paragraph}>
      Esta es la base de la app móvil. Aquí puedes conectar la lógica con tu API de Next.js y mantener el proyecto actual sin cambios.
    </Text>
  </SafeAreaView>
);

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Inicio" }} />
        <Stack.Screen name="Animals" children={() => <PlaceholderScreen title="Animales" />} options={{ title: "Animales" }} />
        <Stack.Screen name="Students" children={() => <PlaceholderScreen title="Estudiantes" />} options={{ title: "Estudiantes" }} />
        <Stack.Screen name="Vaccines" children={() => <PlaceholderScreen title="Vacunas" />} options={{ title: "Vacunas" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginVertical: 20,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#444",
    textAlign: "center",
    marginBottom: 24,
  },
  menu: {
    width: "100%",
    gap: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  paragraph: {
    fontSize: 16,
    color: "#4b5563",
    textAlign: "center",
    marginTop: 12,
  },
});
