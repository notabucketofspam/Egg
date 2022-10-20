import { TestBed } from '@angular/core/testing';

import { GameSyncService } from './game-sync.service';

describe('GameSyncService', () => {
  let service: GameSyncService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GameSyncService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
