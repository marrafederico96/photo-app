import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FileSystemService } from '../../services/file-system.service';


@Component({
  selector: 'app-folder',
  imports: [],
  templateUrl: './folder.component.html',
  styleUrl: './folder.component.scss'
})
export class FolderComponent implements OnInit {
  private route = inject(ActivatedRoute);
  public folderName: string = '';
  private fs = inject(FileSystemService);
  public files: File[] = [];


  async ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('folderName')!;
    this.folderName = this.route.snapshot.paramMap.get('folderName')!;
    const match = this.fs.directories().find(dir => this.slugify(dir.name) === slug);
    this.folderName = match?.name ?? 'Unknown folder';
    if (!match) return;

    this.files = await this.fs.getFilesInDirectory(this.folderName);

  }

  private slugify(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, '-');
  }

  imageToUrl(file: File): string {
    return URL.createObjectURL(file);
  }
}
