import * as SecureStore from 'expo-secure-store';

// A Supabase session (access token + refresh token + full user object, serialized)
// routinely exceeds SecureStore's ~2048 byte per-item limit, so large values are
// split across numbered chunks and reassembled on read.
const CHUNK_SIZE = 1800;
const chunkCountKey = (key: string) => `${key}_chunks`;
const chunkKey = (key: string, index: number) => `${key}_${index}`;

export const secureStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    const chunkCountRaw = await SecureStore.getItemAsync(chunkCountKey(key));
    if (!chunkCountRaw) {
      return SecureStore.getItemAsync(key);
    }

    const chunkCount = Number(chunkCountRaw);
    const chunks: string[] = [];
    for (let i = 0; i < chunkCount; i += 1) {
      const chunk = await SecureStore.getItemAsync(chunkKey(key, i));
      if (chunk === null) return null;
      chunks.push(chunk);
    }
    return chunks.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      await SecureStore.deleteItemAsync(chunkCountKey(key));
      return;
    }

    const chunkCount = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < chunkCount; i += 1) {
      const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await SecureStore.setItemAsync(chunkKey(key, i), chunk);
    }
    await SecureStore.setItemAsync(chunkCountKey(key), String(chunkCount));
    await SecureStore.deleteItemAsync(key);
  },

  async removeItem(key: string): Promise<void> {
    const chunkCountRaw = await SecureStore.getItemAsync(chunkCountKey(key));
    if (chunkCountRaw) {
      const chunkCount = Number(chunkCountRaw);
      for (let i = 0; i < chunkCount; i += 1) {
        await SecureStore.deleteItemAsync(chunkKey(key, i));
      }
      await SecureStore.deleteItemAsync(chunkCountKey(key));
    }
    await SecureStore.deleteItemAsync(key);
  },
};
