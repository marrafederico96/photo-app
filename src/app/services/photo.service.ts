import { inject, Injectable } from '@angular/core';
import { FileSystemService } from './file-system.service';

@Injectable({
    providedIn: 'root'
})
export class PhotoService {
    private fs = inject(FileSystemService);

    async openCameraAndSaveTo(dir: FileSystemDirectoryHandle) {

        if (dir.kind !== 'directory') return;
        const folder = dir;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.style.display = 'none';
        document.body.appendChild(input);

        const baseName = this.fs.slugify(folder.name);

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
}
