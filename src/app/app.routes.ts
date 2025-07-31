import { Routes } from '@angular/router';
import { FolderComponent } from './components/folder/folder.component';
import { HomeComponent } from './components/home/home.component';

export const routes: Routes = [
    { path: "", component: HomeComponent },
    { path: "folder/:folderName", component: FolderComponent }
];
