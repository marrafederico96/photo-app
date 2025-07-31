import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FileSystemService {
  public mainDirHandle = signal<FileSystemDirectoryHandle | null>(null);
  public directories = signal<FileSystemHandle[]>([]);

  private readonly DB_NAME = 'photo-db';
  private readonly STORE_NAME = 'handles';
  private readonly MAIN_DIR_KEY = 'mainDir';

  constructor() {
  }

  async requestMainDirectory() {
    try {
      const handle = await (window as any).showDirectoryPicker({
        id: 'main-directory',
        mode: 'readwrite',
        startIn: 'documents'
      });
      this.mainDirHandle.set(handle);
      await this.loadDirectory();
    } catch (err) {
      console.log('Finestra di selezione directory chiusa o errore:', err);
    }
  }

  async loadDirectory() {
    const handle = this.mainDirHandle();
    if (!handle) {
      this.directories.set([]);
      return;
    }

    const dirs: FileSystemHandle[] = [];
    try {
      for await (const entry of handle.values()) {
        if (entry.kind === "directory") {
          dirs.push(entry);
        }
      }
      this.directories.set(dirs);
    } catch (err) {
      console.error('Errore durante la lettura del contenuto della directory:', err);
    }
  }

  async createDirectory(dirName: string) {
    const handle = this.mainDirHandle();
    if (!handle) {
      throw new Error('La directory principale non è stata selezionata.');
    }
    return handle.getDirectoryHandle(dirName, { create: true });
  }

  async getFilesInDirectory(dirName: string): Promise<File[]> {
    const mainDirHandle = this.mainDirHandle();
    if (!mainDirHandle) {
      throw new Error('Directory principale non selezionata');
    }

    try {

      const dirHandle = await mainDirHandle.getDirectoryHandle(dirName, { create: false });

      const files: File[] = [];
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          const fileHandle = entry as FileSystemFileHandle;
          const file = await fileHandle.getFile();
          if (file.type.startsWith('image/')) {
            files.push(file);
          }
        }
      }
      return files;

    } catch (err) {
      return [];
    }
  }

}
