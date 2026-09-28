import { TestBed } from '@angular/core/testing';
import { ConfirmacaoDialog, DadosConfirmacao } from './confirmacao-dialog';
import { provedoresDeDialogo } from '../../../testing/provedores-de-teste';

// Componente reutilizável: o teste garante que ele mostra exatamente o que recebeu
describe('ConfirmacaoDialog', () => {
  function abrir(dados: DadosConfirmacao): HTMLElement {
    TestBed.configureTestingModule({ imports: [ConfirmacaoDialog], providers: provedoresDeDialogo(dados) });
    const fixture = TestBed.createComponent(ConfirmacaoDialog);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('mostra título, mensagem, detalhes e o VERBO da ação no botão', () => {
    const tela = abrir({
      titulo: 'Fechar a O.S. nº 3?',
      mensagem: 'Estas peças serão baixadas do estoque.',
      detalhes: ['FLT-001 · Filtro de óleo do motor: 1 un'],
      confirmar: 'Fechar O.S.',
      irreversivel: true,
    });

    expect(tela.textContent).toContain('Fechar a O.S. nº 3?');
    expect(tela.querySelector('li')?.textContent).toContain('FLT-001');
    expect(tela.textContent).toContain('Esta ação não pode ser desfeita.');
    const botoes = Array.from(tela.querySelectorAll('button')).map(b => b.textContent?.trim());
    expect(botoes).toEqual(['Cancelar', 'Fechar O.S.']);
  });

  it('sem "irreversivel", não mostra o aviso', () => {
    const tela = abrir({ titulo: 'Confirmar?', mensagem: 'Texto', confirmar: 'Confirmar' });
    expect(tela.textContent).not.toContain('não pode ser desfeita');
  });
});
