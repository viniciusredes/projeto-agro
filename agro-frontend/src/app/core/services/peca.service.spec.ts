import { TestBed } from '@angular/core/testing';
import { PecaService } from './peca.service';
import { provedoresBase } from '../../../testing/provedores-de-teste';

describe('PecaService', () => {
  let service: PecaService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provedoresBase() });
    service = TestBed.inject(PecaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
