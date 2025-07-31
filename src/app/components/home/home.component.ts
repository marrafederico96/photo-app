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


  async openCamera() {
    try {
      if (this.currentStream) {
        this.currentStream.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      this.currentStream = stream;
      this.videoElement = document.querySelector('video#camera')!;
      this.videoElement.srcObject = stream;
      await this.videoElement.play();
    } catch (err) {
      console.error('Errore apertura fotocamera', err);
    }
  }
  takePhoto(dir: FileSystemHandle) {
    if (!this.videoElement) {
      console.error('Video element non inizializzato');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Impossibile ottenere il contesto 2D del canvas');
      return;
    }
    ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        console.error('Impossibile creare blob dall\'immagine');
        return;
      }

      try {
        const mainDir = this.fs.mainDirHandle();
        if (!mainDir) {
          console.error('Main directory non selezionata');
          return;
        }
        const folder = await mainDir.getDirectoryHandle(dir.name);

        // Calcola nome file (es: cartella-1.jpg)
        const slugName = this.slugify(dir.name);
        const nextIndex = await this.getNextImageIndex(folder, slugName);
        const fileName = `${slugName}-${nextIndex}.jpg`;

        const fileHandle = await folder.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        console.log('Foto salvata:', fileName);
      } catch (err) {
        console.error('Errore nel salvataggio della foto:', err);
      }
    }, 'image/jpeg');
  }

  private async getNextImageIndex(dirHandle: FileSystemDirectoryHandle, baseName: string): Promise<number> {
    let maxIndex = 0;
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const match = entry.name.match(new RegExp(`^${baseName}-(\\d+)\\.jpg$`));
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
