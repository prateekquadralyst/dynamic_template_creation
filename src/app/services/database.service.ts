import { Injectable } from '@angular/core';
import { Project } from '../models/project.interface';
import { CustomTemplate } from '../models/template.interface';
import { Asset } from '../models/asset.interface';

// IndexedDB database service for local data persistence
@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private readonly DB_NAME = 'EnhancedDynamicBuilder';
  private readonly DB_VERSION = 1;
  private db: IDBDatabase | null = null;

  // Object store names
  private readonly STORES = {
    PROJECTS: 'projects',
    TEMPLATES: 'templates',
    ASSETS: 'assets',
    SETTINGS: 'settings',
    EXPORT_HISTORY: 'exportHistory'
  } as const;

  constructor() {
    this.initializeDatabase();
  }

  /**
   * Initialize the IndexedDB database with schema
   */
  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Database initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createObjectStores(db);
      };
    });
  }

  /**
   * Create object stores and indexes
   */
  private createObjectStores(db: IDBDatabase): void {
    // Projects store
    if (!db.objectStoreNames.contains(this.STORES.PROJECTS)) {
      const projectStore = db.createObjectStore(this.STORES.PROJECTS, { keyPath: 'id' });
      projectStore.createIndex('name', 'name', { unique: false });
      projectStore.createIndex('createdAt', 'createdAt', { unique: false });
      projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
    }

    // Custom templates store
    if (!db.objectStoreNames.contains(this.STORES.TEMPLATES)) {
      const templateStore = db.createObjectStore(this.STORES.TEMPLATES, { keyPath: 'id' });
      templateStore.createIndex('name', 'name', { unique: false });
      templateStore.createIndex('type', 'type', { unique: false });
      templateStore.createIndex('createdBy', 'createdBy', { unique: false });
      templateStore.createIndex('createdAt', 'createdAt', { unique: false });
    }

    // Assets store
    if (!db.objectStoreNames.contains(this.STORES.ASSETS)) {
      const assetStore = db.createObjectStore(this.STORES.ASSETS, { keyPath: 'id' });
      assetStore.createIndex('name', 'name', { unique: false });
      assetStore.createIndex('type', 'type', { unique: false });
      assetStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
      assetStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
    }

    // Settings store
    if (!db.objectStoreNames.contains(this.STORES.SETTINGS)) {
      db.createObjectStore(this.STORES.SETTINGS, { keyPath: 'key' });
    }

    // Export history store
    if (!db.objectStoreNames.contains(this.STORES.EXPORT_HISTORY)) {
      const exportStore = db.createObjectStore(this.STORES.EXPORT_HISTORY, { keyPath: 'id' });
      exportStore.createIndex('projectId', 'metadata.projectId', { unique: false });
      exportStore.createIndex('createdAt', 'createdAt', { unique: false });
    }
  }

  /**
   * Ensure database is ready
   */
  private async ensureDatabase(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initializeDatabase();
    }
    if (!this.db) {
      throw new Error('Database not available');
    }
    return this.db;
  }

  /**
   * Generic method to add/update data in a store
   */
  async put<T>(storeName: string, data: T): Promise<T> {
    const db = await this.ensureDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic method to get data from a store by key
   */
  async get<T>(storeName: string, key: string): Promise<T | null> {
    const db = await this.ensureDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic method to get all data from a store
   */
  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.ensureDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic method to delete data from a store
   */
  async delete(storeName: string, key: string): Promise<void> {
    const db = await this.ensureDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic method to search data using an index
   */
  async getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    const db = await this.ensureDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Count records in a store
   */
  async count(storeName: string): Promise<number> {
    const db = await this.ensureDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all data from a store
   */
  async clear(storeName: string): Promise<void> {
    const db = await this.ensureDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Convenience methods for specific stores
  
  // Projects
  async saveProject(project: Project): Promise<Project> {
    return this.put(this.STORES.PROJECTS, project);
  }

  async getProject(id: string): Promise<Project | null> {
    return this.get<Project>(this.STORES.PROJECTS, id);
  }

  async getAllProjects(): Promise<Project[]> {
    return this.getAll<Project>(this.STORES.PROJECTS);
  }

  async deleteProject(id: string): Promise<void> {
    return this.delete(this.STORES.PROJECTS, id);
  }

  // Custom Templates
  async saveTemplate(template: CustomTemplate): Promise<CustomTemplate> {
    return this.put(this.STORES.TEMPLATES, template);
  }

  async getTemplate(id: string): Promise<CustomTemplate | null> {
    return this.get<CustomTemplate>(this.STORES.TEMPLATES, id);
  }

  async getAllTemplates(): Promise<CustomTemplate[]> {
    return this.getAll<CustomTemplate>(this.STORES.TEMPLATES);
  }

  async deleteTemplate(id: string): Promise<void> {
    return this.delete(this.STORES.TEMPLATES, id);
  }

  // Assets
  async saveAsset(asset: Asset): Promise<Asset> {
    return this.put(this.STORES.ASSETS, asset);
  }

  async getAsset(id: string): Promise<Asset | null> {
    return this.get<Asset>(this.STORES.ASSETS, id);
  }

  async getAllAssets(): Promise<Asset[]> {
    return this.getAll<Asset>(this.STORES.ASSETS);
  }

  async deleteAsset(id: string): Promise<void> {
    return this.delete(this.STORES.ASSETS, id);
  }

  // Settings
  async saveSetting(key: string, value: any): Promise<void> {
    await this.put(this.STORES.SETTINGS, { key, value });
  }

  async getSetting(key: string): Promise<any> {
    const result = await this.get<{ key: string; value: any }>(this.STORES.SETTINGS, key);
    return result?.value || null;
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Delete the entire database
   */
  async deleteDatabase(): Promise<void> {
    this.close();
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(this.DB_NAME);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  }
}