import { TestBed } from '@angular/core/testing';

import { PrettyPrintService } from './pretty-print.service';

describe('PrettyPrintService', () => {
  let service: PrettyPrintService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PrettyPrintService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
