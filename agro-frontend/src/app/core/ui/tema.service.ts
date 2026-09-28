import { DOCUMENT, Service, computed, effect, inject, signal } from '@angular/core';

export type PreferenciaTema = 'claro' | 'escuro';

// Mesma chave lida pelo script do index.html (que aplica o tema antes do Angular carregar)
const CHAVE = 'agro-frota-tema';

@Service()
export class TemaService {
  private readonly documento = inject(DOCUMENT);

  // O tema escolhido. Na primeira visita (nada salvo), começa igual ao do sistema operacional.
  readonly preferencia = signal<PreferenciaTema>(this.lerPreferenciaInicial());

  // Atalho usado para trocar a logo (clara ou escura)
  readonly escuroAtivo = computed(() => this.preferencia() === 'escuro');

  constructor() {
    // Sempre que a preferência mudar: aplica a classe no <html>.
    // O CSS (styles.scss) troca o "color-scheme", e o Material recalcula todas as cores.
    effect(() => {
      const html = this.documento.documentElement;
      html.classList.remove('tema-claro', 'tema-escuro');
      html.classList.add(`tema-${this.preferencia()}`);
    });
  }

  escolher(preferencia: PreferenciaTema): void {
    this.preferencia.set(preferencia);
    try {
      localStorage.setItem(CHAVE, preferencia); // salva só quando o usuário escolhe
    } catch {
      // navegação privada / armazenamento bloqueado: a escolha vale só nesta visita
    }
  }

  private lerPreferenciaInicial(): PreferenciaTema {
    try {
      const salva = localStorage.getItem(CHAVE);
      if (salva === 'claro' || salva === 'escuro') {
        return salva;
      }
    } catch {
      // sem acesso ao localStorage: usa o tema do sistema
    }
    // matchMedia?.(): só chama se existir (não existe no ambiente de testes nem na renderização no servidor)
    const sistemaEscuro = this.documento.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return sistemaEscuro ? 'escuro' : 'claro';
  }
}
