import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { FileSystemService } from '../../services/file-system.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterLink, MatIconModule, MatInputModule, ReactiveFormsModule, MatFormFieldModule, MatButtonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  public fs = inject(FileSystemService);

  public dirName = new FormControl('', [Validators.required]);

  videoElement!: HTMLVideoElement;
  currentStream?: MediaStream;

  async ngOnInit() {
    await this.fs.loadDirectory();
  }

  async create() {
    if (this.dirName.value != null && this.dirName.valid) {
      try {
        await this.fs.createDirectory(this.dirName.value);
        await this.fs.loadDirectory();
        this.dirName.reset();
      } catch (err) {
        console.error('Errore durante la creazione della directory:', err);
      }
    }
  }

  async openCameraAndSaveTo(dir: FileSystemHandle) {

    if (dir.kind !== 'directory') return;
    const folder = dir as FileSystemDirectoryHandle;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.style.display = 'none';
    document.body.appendChild(input);

    const baseName = this.slugify(folder.name);

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const nextIndex = await this.getNextImageIndex(folder, baseName);
      const originalExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${baseName}-${nextIndex}.${originalExt}`;
      const fileHandle = await folder.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(await file.arrayBuffer());
      await writable.close();

      document.body.removeChild(input);
    };

    input.click();
  }


  private async getNextImageIndex(dirHandle: FileSystemDirectoryHandle, baseName: string): Promise<number> {
    let maxIndex = 0;
    const pattern = new RegExp(`^${baseName}-(\\d+)\\.[a-zA-Z0-9]+$`);

    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const match = entry.name.match(pattern);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num)) {
            maxIndex = Math.max(maxIndex, num);
          }
        }
      }
    }
    return maxIndex + 1;
  }

  slugify(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, '-');
  }

} 
