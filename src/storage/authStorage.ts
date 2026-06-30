import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "ql_tro_auth_token";

const webStorage = () => {
  if (Platform.OS !== "web") {
    return null;
  }

  return (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage ?? null;
};

export async function getStoredToken() {
  const storage = webStorage();
  if (storage) {
    return storage.getItem(TOKEN_KEY);
  }

  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveStoredToken(token: string) {
  const storage = webStorage();
  if (storage) {
    storage.setItem(TOKEN_KEY, token);
    return;
  }

  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearStoredToken() {
  const storage = webStorage();
  if (storage) {
    storage.removeItem(TOKEN_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

