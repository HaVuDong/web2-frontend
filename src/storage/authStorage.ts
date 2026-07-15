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

const USER_KEY = "ql_tro_auth_user";

export async function getStoredUser() {
  const storage = webStorage();
  const str = storage ? storage.getItem(USER_KEY) : await SecureStore.getItemAsync(USER_KEY);
  try {
    return str ? JSON.parse(str) : null;
  } catch (e) {
    return null;
  }
}

export async function saveStoredUser(user: any) {
  const str = JSON.stringify(user);
  const storage = webStorage();
  if (storage) {
    storage.setItem(USER_KEY, str);
    return;
  }
  await SecureStore.setItemAsync(USER_KEY, str);
}

export async function clearStoredUser() {
  const storage = webStorage();
  if (storage) {
    storage.removeItem(USER_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(USER_KEY);
}
