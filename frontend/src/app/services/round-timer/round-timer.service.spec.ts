import { TestBed } from '@angular/core/testing';

import { RoundTimerService } from './round-timer.service';

describe('RoundTimerService', () => {
  let service: RoundTimerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RoundTimerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
