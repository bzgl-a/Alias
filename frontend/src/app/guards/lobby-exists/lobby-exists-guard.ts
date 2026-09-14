import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LobbyService } from '../../services/lobby/lobby.service';
import { catchError, map, of } from 'rxjs';

export const lobbyExistsGuard: CanActivateFn = (route, state) => {
  const lobbyService = inject(LobbyService);
  const router = inject(Router);

  const lobbyId = route.paramMap.get('id');

  if (!lobbyId) {
    return router.createUrlTree(['/hub']);
  }

  return lobbyService.getLobby(lobbyId).pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/hub']))),
  );
};
