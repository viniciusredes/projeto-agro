import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

// O que quem abre o diálogo informa: os textos e se a ação é irreversível
export interface DadosConfirmacao {
  titulo: string;
  mensagem: string;
  detalhes?: string[];     // itens que serão afetados (ex.: as peças que vão sair do estoque)
  confirmar: string;       // texto do botão principal: o VERBO da ação ("Fechar O.S."), nunca só "OK"
  cancelar?: string;
  irreversivel?: boolean;  // mostra o aviso "não pode ser desfeito"
}

// Diálogo genérico: não conhece O.S., máquina nem peça. Só mostra os textos e devolve
// true (confirmou) ou false/undefined (cancelou, Esc ou clique fora).
@Component({
  selector: 'app-confirmacao-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './confirmacao-dialog.html',
  styleUrl: './confirmacao-dialog.scss',
})
export class ConfirmacaoDialog {
  protected readonly dados = inject<DadosConfirmacao>(MAT_DIALOG_DATA);
}
