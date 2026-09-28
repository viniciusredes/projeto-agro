# Agro Frota: Gestão Inteligente de Máquinas Agrícolas

MVP para a gestão de **frota, manutenção e estoque** de máquinas agrícolas, construído passo a passo como **material de treinamento**.

O sistema substitui cadernos, planilhas e mensagens soltas por uma plataforma única que responde: **onde está cada máquina e com quem**, **quantas horas ela trabalhou**, **quanto custou mantê-la** e **o que precisa ser reposto** no almoxarifado.

## Escopo

| Módulo | O que faz |
|---|---|
| **Uso da frota** | Cadastro de máquinas, saída para o campo (operador e frente de trabalho), retorno com horímetro e avarias, histórico de movimentações |
| **Almoxarifado** | Cadastro de peças e fluidos, entradas (compras) com custo da última compra, kardex e alerta de estoque mínimo |
| **Manutenção** | Ordens de serviço preventivas e corretivas, baixa automática das peças no fechamento (tudo ou nada), custo congelado e custo de manutenção por máquina |

| Parte | Tecnologia | Documentação |
|---|---|---|
| [`agro-backend/`](agro-backend) | Node.js 24, Express e TypeScript (dados **em memória**) | [README do back-end](agro-backend/README.md): API, regras, construção passo a passo e testes com curl |
| [`agro-frontend/`](agro-frontend) | Angular 22 e Angular Material (tema claro e escuro) | [README do front-end](agro-frontend/README.md): telas, conceitos, construção passo a passo e roteiro de testes |

Outros documentos:
- [context.md](context.md): problema de negócio, decisões técnicas e histórico do projeto.
- [CHECKLIST.md](CHECKLIST.md): cada etapa e passo concluído, com o commit correspondente.

> ⚠️ **Os dados ficam em memória:** ao reiniciar o back-end, tudo volta ao estado inicial (2 máquinas e 3 peças de exemplo). Não há login nem banco de dados nesta versão.

## Pré-requisitos

- [Git](https://git-scm.com)
- [Node.js](https://nodejs.org) **24 ou superior** (inclui o `npm`)
- Um navegador moderno (Chrome, Edge ou Firefox)

O Angular CLI **não** precisa estar instalado globalmente: os comandos abaixo usam a versão do projeto.

## Como clonar

```bash
git clone https://github.com/viniciusredes/projeto-agro.git
cd projeto-agro
```

## Como executar

São necessários **dois terminais**, um para cada parte. Comece pelo back-end.

**Terminal 1: API (porta 3000)**

```bash
cd agro-backend
npm install
npm run dev
```

Confira: `curl.exe http://localhost:3000/maquinas` (ou abra o endereço no navegador) deve devolver as máquinas em JSON.

**Terminal 2: front-end (porta 4200)**

```bash
cd agro-frontend
npm install
npm start
```

Abra **http://localhost:4200**. O Painel da frota deve mostrar "Disponíveis no pátio: 2 de 2" e a peça COR-001 em "Precisa de atenção".

> O `npm install` só é necessário na primeira vez (e quando as dependências mudarem).
>
> O front chama a API por `/api`, e o servidor de desenvolvimento do Angular repassa essas chamadas para a porta 3000 (`agro-frontend/proxy.conf.json`). Por isso, **as duas partes precisam estar rodando**.

## Outros comandos

| Onde | Comando | Para quê |
|---|---|---|
| `agro-backend` | `bash testes.sh` | Roteiro automatizado de testes da API, com a API rodando (✅/❌ por cenário) |
| `agro-backend` | `npx tsc --noEmit` | Verificar erros de tipo |
| `agro-frontend` | `npm run build` | Gerar a versão de produção em `dist/` |
| `agro-frontend` | `npm test` | Testes unitários (ainda não adaptados, veja o README do front) |

## Problemas comuns

| Sintoma | Solução |
|---|---|
| A tela mostra "Não foi possível conectar à API" | O back-end não está rodando: `cd agro-backend && npm run dev` |
| `EADDRINUSE` na porta 3000 ou 4200 | Já existe outro servidor rodando: feche o terminal antigo (Ctrl+C) |
| Erro ao instalar ou executar com Node 18/20 | Atualize para o Node 24 (`node -v` para conferir) |
| Os dados cadastrados sumiram | A API reiniciou; é o comportamento esperado com dados em memória |

Mais detalhes na seção "Problemas comuns" de cada README.
