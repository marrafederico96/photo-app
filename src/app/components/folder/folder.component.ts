import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FileSystemService } from '../../services/file-system.service';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from "@angular/material/icon";


@Component({
  selector: 'app-folder',
  imports: [MatTableModule, MatIconModule],
  templateUrl: './folder.component.html',
  styleUrl: './folder.component.scss'
})
export class FolderComponent implements OnInit {
  private route = inject(ActivatedRoute);
  public folderName: string = '';
  private fs = inject(FileSystemService);
  public selectedImage: string | null = null;
  private urlCache = new Map<File, string>();
  displayedColumns: string[] = ['preview', 'name', 'actions'];
  currentDir = signal<FileSystemHandle | undefined>(undefined);
  files = signal<File[]>([]);


  async ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('folderName')!;
    this.folderName = this.route.snapshot.paramMap.get('folderName')!;
    this.currentDir.set(this.fs.directories().find(dir => this.slugify(dir.name) === slug));
    this.folderName = this.currentDir()?.name ?? 'Unknown folder';
    if (!this.currentDir) return;

    this.files.set(await this.fs.getFilesInDirectory(this.folderName));

  }

  ngOnDestroy() {
    this.urlCache.forEach(url => URL.revokeObjectURL(url));
  }

  async deleteFile(file: File) {
    const dir = this.currentDir();
    await (this.currentDir() as FileSystemDirectoryHandle).removeEntry(file.name);
    if (dir != undefined) {
      this.files.set(await this.fs.getFilesInDirectory(dir.name));
    }
  }

  openImageModal(file: File) {
    this.selectedImage = URL.createObjectURL(file);
  }

  closeImageModal() {
    this.selectedImage = null;
  }

  private slugify(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, '-');
  }

  imageToUrl(file: File): string {
    if (!this.urlCache.has(file)) {
      const url = URL.createObjectURL(file);
      this.urlCache.set(file, url);
    }
    return this.urlCache.get(file)!;
  }
}
