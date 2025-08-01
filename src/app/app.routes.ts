import { Routes } from '@angular/router';
import { FolderComponent } from './components/folder/folder.component';

export const routes: Routes = [
    { path: '', component: FolderComponent },
    {
        path: ':folderName',
        component: FolderComponent,
        children: [
            { path: '**', component: FolderComponent }
        ]
    },
];

