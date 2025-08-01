import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class FileSystemService {
  public mainDirHandle = signal<FileSystemDirectoryHandle | null>(null);
  public rootDirectories = signal<FileSystemDirectoryHandle[]>([]);

  private router = inject(Router);

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
      const rootDirs = await this.loadDirectory(handle);
      this.rootDirectories.set(rootDirs);
      const sluggedMainDirName = this.slugify(handle.name);
      await this.router.navigate([sluggedMainDirName]);
    } catch (err) {
      console.log('Finestra di selezione directory chiusa o errore:', err);
    }
  }

  async loadDirectory(handle: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle[]> {
    const dirs: FileSystemDirectoryHandle[] = [];
    try {
      for await (const entry of handle.values()) {
        if (entry.kind === "directory") {
          dirs.push(entry as FileSystemDirectoryHandle);
        }
      }
    } catch (err) {
      console.error('Errore durante la lettura:', err);
    }
    return dirs;
  }

  async createDirectory(parentDirHandle: FileSystemDirectoryHandle, dirName: string) {
    if (!parentDirHandle) {
      throw new Error('La directory genitore non è valida.');
    }
    return parentDirHandle.getDirectoryHandle(dirName, { create: true });
  }

  async getFilesInDirectory(dirHandle: FileSystemDirectoryHandle): Promise<File[]> {
    if (!dirHandle) {
      throw new Error('Handle della directory non valido');
    }
    const files: File[] = [];
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        if (file.type.startsWith("image/")) {
          files.push(file);
        }
      }
    }
    return files;
  }

  slugify(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, '-');
  }
}