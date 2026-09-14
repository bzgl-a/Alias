import { Routes } from '@angular/router';
import { lobbyExistsGuard } from './guards/lobby-exists/lobby-exists-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/home/home.component').then((m) => m.HomeComponent),
  },

  {
    path: '',
    loadComponent: () =>
      import('./components/game-shell/game-shell.component').then(
        (m) => m.GameShellComponent,
      ),
    children: [
      {
        path: 'hub',
        loadComponent: () =>
          import('./components/hub/hub.component').then((m) => m.HubComponent),
      },
      {
        path: 'lobby/:id',
        loadComponent: () =>
          import('./components/lobby/lobby.component').then(
            (m) => m.LobbyComponent,
          ),
        canActivate: [lobbyExistsGuard],
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
