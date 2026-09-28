import { TestBed } from '@angular/core/testing';
import { OrdemServicoService } from './ordem-servico.service';
import { provedoresBase } from '../../../testing/provedores-de-teste';

describe('OrdemServicoService', () => {
  let service: OrdemServicoService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provedoresBase() });
    service = TestBed.inject(OrdemServicoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
