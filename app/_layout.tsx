import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../src/api/queryClient";
import { AuthProvider } from "../src/context/AuthContext";
import { ThemeAlertPortal } from "../src/components/ThemeAlert";

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
        <ThemeAlertPortal />
      </AuthProvider>
    </QueryClientProvider>
  );
}

