import { Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FileSystemService } from '../../services/file-system.service';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from "@angular/material/icon";
import { FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { PhotoService } from '../../services/photo.service';
import { filter, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-folder',
  standalone: true,
  imports: [MatTableModule, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, MatInputModule, ReactiveFormsModule, CommonModule],
  templateUrl: './folder.component.html',
  styleUrl: './folder.component.scss'
})
export class FolderComponent implements OnDestroy {
  private router = inject(Router);
  public photo = inject(PhotoService);
  public fs = inject(FileSystemService);

  private routeSub?: Subscription;
  private activatedRoute = inject(ActivatedRoute);

  currentDir = signal<FileSystemDirectoryHandle | undefined>(undefined);
  currentPath = signal<string[]>([]);
  files = signal<File[]>([]);
  subdirs = signal<FileSystemDirectoryHandle[]>([]);

  public dirName = new FormControl('', [Validators.required]);
  private urlCache = new Map<File, string>();

  dataSource = computed(() => [...this.subdirs(), ...this.files()]);
  displayedColumns: string[] = ['preview', 'name', 'actions'];

  constructor() {
    effect(async () => {
      const mainDir = this.fs.mainDirHandle();
      if (mainDir) {
        await this.loadFolderContentFromCurrentPath();
      }
    }, { allowSignalWrites: true });

    this.routeSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(async () => {
      this.updateCurrentPath();
      await this.loadFolderContentFromCurrentPath();
    });
  }

  private async loadFolderContentFromCurrentPath() {
    this.updateCurrentPath();
    const pathSegments = this.currentPath();
    const mainHandle = this.fs.mainDirHandle();

    if (!mainHandle) {
      this.currentDir.set(undefined);
      this.files.set([]);
      this.subdirs.set([]);
      return;
    }

    let targetHandle: FileSystemDirectoryHandle = mainHandle;
    let successfulNavigation = true;

    if (pathSegments.length === 0 || (pathSegments.length === 1 && pathSegments[0] === '')) {
      this.currentDir.set(mainHandle);
      await this.loadFolderContent(mainHandle);
      return;
    }

    let currentSearchHandle: FileSystemDirectoryHandle = mainHandle;
    for (const segmentSlug of pathSegments) {
      let foundSegment = false;
      try {
        const childrenDirs = await this.fs.loadDirectory(currentSearchHandle);

        for (const childDir of childrenDirs) {
          if (this.fs.slugify(childDir.name) === segmentSlug) {
            currentSearchHandle = await currentSearchHandle.getDirectoryHandle(childDir.name);
            foundSegment = true;
            break;
          }
        }

        if (!foundSegment) {
          successfulNavigation = false;
          break;
        }
      } catch (error) {
        successfulNavigation = false;
        break;
      }
    }

    if (successfulNavigation) {
      this.currentDir.set(currentSearchHandle);
      await this.loadFolderContent(currentSearchHandle);
    } else {
      this.currentDir.set(undefined);
      this.files.set([]);
      this.subdirs.set([]);
    }
  }

  private updateCurrentPath() {
    let pathSegments: string[] = [];
    let currentRoute: ActivatedRoute | null = this.activatedRoute;

    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }

    const folderParam = currentRoute.snapshot.paramMap.get('folderName');
    const urlSegments = currentRoute.snapshot.url.map(s => s.path);

    if (folderParam) {
      pathSegments.push(folderParam);
    }
    pathSegments = [...pathSegments, ...urlSegments];
    pathSegments = pathSegments.filter(segment => segment && segment !== '');
    this.currentPath.set(pathSegments);
  }

  private async loadFolderContent(dirHandle: FileSystemDirectoryHandle) {
    try {
      const [files, subdirs] = await Promise.all([
        this.fs.getFilesInDirectory(dirHandle),
        this.fs.loadDirectory(dirHandle)
      ]);
      this.files.set(files);
      this.subdirs.set(subdirs);
    } catch (error) {
      this.files.set([]);
      this.subdirs.set([]);
    }
  }

  async create() {
    const parentDir = this.currentDir();
    if (this.dirName.valid && this.dirName.value && parentDir) {
      await this.fs.createDirectory(parentDir, this.dirName.value);
      await this.loadFolderContent(parentDir);
      this.dirName.reset();
    }
  }

  async deleteFile(file: File) {
    const dir = this.currentDir();
    if (dir) {
      await dir.removeEntry(file.name);
      this.files.set(await this.fs.getFilesInDirectory(dir));
    }
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
    this.urlCache.forEach(url => URL.revokeObjectURL(url));
  }

  imageToUrl(file: File): string {
    if (!this.urlCache.has(file)) {
      const url = URL.createObjectURL(file);
      this.urlCache.set(file, url);
    }
    return this.urlCache.get(file)!;
  }

  generateLinkFolder(dirName: string): string {
    const currentSegments = this.currentPath();
    const newSegments = [...currentSegments, this.fs.slugify(dirName)];
    return newSegments.join('/');
  }

}