import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

export interface OfflineItem {
  id: string;
  title: string;
  category?: string;
  durationMin?: number;
  kind: "practice" | "video" | "audio";
  originalUrl: string;
  localUri: string;
  fileSizeBytes: number;
  downloadedAt: string;
  thumbnailUrl?: string | null;
  localThumbnailUri?: string | null;
}

const STORAGE_KEY = "@shakti_offline_downloads_v1";
const OFFLINE_DIR = (FileSystem.documentDirectory || "") + "shakti_offline/";

// Serializes the catalog's read-modify-write so two downloads/deletes started close together
// don't race and clobber each other's entry in AsyncStorage.
let catalogQueue: Promise<unknown> = Promise.resolve();
function withCatalogLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = catalogQueue.then(fn, fn);
  catalogQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function ensureDir() {
  const dirInfo = await FileSystem.getInfoAsync(OFFLINE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(OFFLINE_DIR, { intermediates: true });
  }
}

export async function listOfflineItems(): Promise<OfflineItem[]> {
  // expo-file-system has no document directory on web; offline downloads are a
  // native-only feature (see CONTENT_PLATFORM_PLAN.md's offline/DRM decision).
  if (Platform.OS === "web") return [];
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items: OfflineItem[] = JSON.parse(raw);

    // Verify files still exist on disk
    const valid: OfflineItem[] = [];
    for (const item of items) {
      const fileInfo = await FileSystem.getInfoAsync(item.localUri).catch(() => null);
      if (fileInfo && fileInfo.exists) {
        valid.push(item);
      }
    }

    if (valid.length !== items.length) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    }
    return valid;
  } catch {
    return [];
  }
}

export async function isItemDownloaded(id: string): Promise<boolean> {
  const items = await listOfflineItems();
  return items.some((item) => item.id === id);
}

export async function getOfflineItem(id: string): Promise<OfflineItem | null> {
  const items = await listOfflineItems();
  return items.find((item) => item.id === id) || null;
}

export async function downloadItem(
  item: {
    id: string;
    title: string;
    category?: string;
    durationMin?: number;
    kind: "practice" | "video" | "audio";
    mediaUrl: string;
    thumbnailUrl?: string | null;
  },
  onProgress?: (progress: number) => void,
): Promise<OfflineItem> {
  if (Platform.OS === "web") {
    throw new Error("Offline downloads aren't available in the browser — use the app on your phone.");
  }
  await ensureDir();

  const fileExt = item.mediaUrl.split(".").pop()?.split("?")[0] || (item.kind === "video" ? "mp4" : "mp3");
  const filename = `${item.id}-${Date.now()}.${fileExt}`;
  const localUri = OFFLINE_DIR + filename;

  // Use DownloadResumable for progress updates if callback provided
  let downloadResult: FileSystem.FileSystemDownloadResult;
  if (onProgress) {
    const downloadResumable = FileSystem.createDownloadResumable(
      item.mediaUrl,
      localUri,
      {},
      (downloadProgress) => {
        const total = downloadProgress.totalBytesExpectedToWrite;
        if (total > 0) {
          const percent = downloadProgress.totalBytesWritten / total;
          onProgress(percent);
        }
      },
    );
    const res = await downloadResumable.downloadAsync();
    if (!res) throw new Error("Download failed");
    downloadResult = res;
  } else {
    downloadResult = await FileSystem.downloadAsync(item.mediaUrl, localUri);
  }

  // Also download thumbnail if available
  let localThumbUri: string | null = null;
  if (item.thumbnailUrl) {
    try {
      const thumbExt = item.thumbnailUrl.split(".").pop()?.split("?")[0] || "jpg";
      const thumbLocal = `${OFFLINE_DIR}thumb-${item.id}.${thumbExt}`;
      await FileSystem.downloadAsync(item.thumbnailUrl, thumbLocal);
      localThumbUri = thumbLocal;
    } catch {
      // thumbnail download failure is non-fatal
    }
  }

  const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
  const fileSizeBytes = (fileInfo as any).size || 0;

  const offlineItem: OfflineItem = {
    id: item.id,
    title: item.title,
    category: item.category,
    durationMin: item.durationMin,
    kind: item.kind,
    originalUrl: item.mediaUrl,
    localUri: downloadResult.uri,
    fileSizeBytes,
    downloadedAt: new Date().toISOString(),
    thumbnailUrl: item.thumbnailUrl,
    localThumbnailUri: localThumbUri,
  };

  await withCatalogLock(async () => {
    const existing = await listOfflineItems();
    const next = [offlineItem, ...existing.filter((i) => i.id !== item.id)];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  });

  return offlineItem;
}

export async function deleteOfflineItem(id: string): Promise<void> {
  if (Platform.OS === "web") return;
  await withCatalogLock(async () => {
    const items = await listOfflineItems();
    const target = items.find((i) => i.id === id);
    if (target) {
      await FileSystem.deleteAsync(target.localUri, { idempotent: true }).catch(() => {});
      if (target.localThumbnailUri) {
        await FileSystem.deleteAsync(target.localThumbnailUri, { idempotent: true }).catch(() => {});
      }
      const next = items.filter((i) => i.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  });
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
