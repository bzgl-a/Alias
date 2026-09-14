import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { lobbyExistsGuard } from './lobby-exists-guard';

describe('lobbyExistsGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => lobbyExistsGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
