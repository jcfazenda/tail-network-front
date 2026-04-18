import { Injectable } from '@angular/core';

type StoredMediaAsset = {
  id: string;
  blob: Blob;
  name: string;
  type: string;
  updatedAt: string;
};

@Injectable({ providedIn: 'root' })
export class LocalMediaStorageService {
  private static readonly dbName = 'tailworks-local-media';
  private static readonly storeName = 'assets';
  private static readonly refPrefix = 'local-media://';

  isLocalMediaRef(value: string | null | undefined): value is string {
    return !!value?.trim() && value.trim().startsWith(LocalMediaStorageService.refPrefix);
  }

  async saveFile(file: File): Promise<string> {
    const id = this.createMediaId();
    const db = await this.openDatabase();
    const asset: StoredMediaAsset = {
      id,
      blob: file,
      name: file.name,
      type: file.type,
      updatedAt: new Date().toISOString(),
    };

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(LocalMediaStorageService.storeName, 'readwrite');
      const store = transaction.objectStore(LocalMediaStorageService.storeName);
      store.put(asset);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Nao foi possivel salvar a midia local.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Nao foi possivel salvar a midia local.'));
    });

    return `${LocalMediaStorageService.refPrefix}${id}`;
  }

  async readBlob(ref: string): Promise<Blob | null> {
    if (!this.isLocalMediaRef(ref)) {
      return null;
    }

    const id = ref.slice(LocalMediaStorageService.refPrefix.length);
    const db = await this.openDatabase();

    return new Promise<Blob | null>((resolve, reject) => {
      const transaction = db.transaction(LocalMediaStorageService.storeName, 'readonly');
      const store = transaction.objectStore(LocalMediaStorageService.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        const asset = request.result as StoredMediaAsset | undefined;
        resolve(asset?.blob ?? null);
      };
      request.onerror = () => reject(request.error ?? new Error('Nao foi possivel ler a midia local.'));
    });
  }

  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB indisponivel neste navegador/contexto.'));
        return;
      }

      const request = indexedDB.open(LocalMediaStorageService.dbName, 1);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(LocalMediaStorageService.storeName)) {
          database.createObjectStore(LocalMediaStorageService.storeName, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Nao foi possivel abrir a base de midia local.'));
    });
  }

  private createMediaId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `local-media-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
