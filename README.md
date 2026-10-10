# Agro Frota: Gestão Inteligente de Máquinas Agrícolas

MVP para a gestão de **frota, manutenção e estoque** de máquinas agrícolas, construído passo a passo como **material de treinamento**. São três partes: uma API, um painel web para a gestão e um **app de celular para o operador** no campo.

O sistema substitui cadernos, planilhas e mensagens soltas por uma plataforma única que responde: **onde está cada máquina e com quem**, **quantas horas ela trabalhou**, **quanto custou mantê-la** e **o que precisa ser reposto** no almoxarifado.

## Escopo

| Módulo | O que faz |
|---|---|
| **Uso da frota** | Cadastro de máquinas, saída para o campo (operador e frente de trabalho), retorno com horímetro e avarias, histórico de movimentações |
| **Almoxarifado** | Cadastro de peças e fluidos, entradas (compras) com custo da última compra, kardex e alerta de estoque mínimo |
| **Manutenção** | Ordens de serviço preventivas e corretivas, baixa automática das peças no fechamento (tudo ou nada), custo congelado, custo de manutenção por máquina e **fotos da avaria** |
| **App do operador** | No celular: página inicial com as máquinas que estão com o operador e os números da frota, leitura do **QR code** colado na máquina, saída e retorno, relato de avaria (abre O.S. corretiva) com **fotos**, tema claro ou escuro |

| Parte | Tecnologia | Documentação |
|---|---|---|
| [`agro-backend/`](agro-backend) | Node.js 24, Express e TypeScript (dados **em memória**) | [README do back-end](agro-backend/README.md): API, regras, construção passo a passo e testes com curl |
| [`agro-frontend/`](agro-frontend) | Angular 22 e Angular Material: painel de operação, tema claro e escuro, uso no desktop e no celular, etiqueta QR imprimível e fotos da O.S. | [README do front-end](agro-frontend/README.md): telas, conceitos, construção passo a passo e roteiro de testes |
| [`agro-mobile/`](agro-mobile) | React Native com Expo (SDK 57) e Expo Router: o app do operador, testado no celular pelo Expo Go | [README do app](agro-mobile/README.md): construção passo a passo (M0 a M8), conceitos, testes e problemas comuns |

Outros documentos:
- [context.md](context.md): problema de negócio, decisões técnicas e histórico do projeto.
- [CHECKLIST.md](CHECKLIST.md): cada etapa e passo concluído, com o commit correspondente.

> ⚠️ **Os dados ficam em memória:** ao reiniciar o back-end, tudo volta ao estado inicial (2 máquinas e 3 peças de exemplo). Não há login nem banco de dados nesta versão.

## Pré-requisitos

- [Git](https://git-scm.com)
- [Node.js](https://nodejs.org) **24 ou superior** (inclui o `npm`)
- Um navegador moderno (Chrome, Edge ou Firefox)
- Para o app: um celular Android ou iPhone com o **Expo Go** (gratuito na loja), na **mesma rede Wi-Fi** do computador

O Angular CLI e o Expo CLI **não** precisam estar instalados globalmente: os comandos abaixo usam a versão de cada projeto.

## Como clonar

```bash
git clone https://github.com/viniciusredes/projeto-agro.git
cd projeto-agro
```

## Como executar

Cada parte roda num terminal. Comece pelo back-end: o painel web e o app dependem dele.

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

**Terminal 3: app do operador (opcional, no celular)**

O celular não enxerga o `localhost` do computador: o app chama a API pelo **IP do computador na rede**. Descubra o IP com `ipconfig` (linha "Endereço IPv4" do Wi-Fi) e crie o arquivo `agro-mobile/.env.local` a partir do modelo:

```bash
cd agro-mobile
npm install
cp .env.example .env.local      # depois, troque o IP dentro dele pelo do seu computador
npx expo start
```

No celular, abra o **Expo Go** e leia o QR code que aparece no terminal (no iPhone, pela câmera). Na primeira abertura, o app pergunta o nome do operador.

> **Windows:** a rede Wi-Fi precisa estar como **privada**, e as portas **3000** (API) e **8081** (Expo) liberadas no firewall. O passo a passo está no [README do app](agro-mobile/README.md#firewall-do-windows).

## Outros comandos

| Onde | Comando | Para quê |
|---|---|---|
| `agro-backend` | `bash testes.sh` | Roteiro automatizado de testes da API, com a API rodando: 103 cenários (✅/❌ por cenário) |
| `agro-backend` | `npx tsc --noEmit` | Verificar erros de tipo |
| `agro-frontend` | `npm run build` | Gerar a versão de produção em `dist/` |
| `agro-frontend` | `npm test` | Testes unitários (Vitest): services, interceptor e componentes |
| `agro-mobile` | `npx tsc --noEmit` e `npx expo lint` | Verificar erros de tipo e de padrão no app |
| `agro-mobile` | `npx expo-doctor` | Conferir a configuração e as versões das dependências do Expo |

## Problemas comuns

| Sintoma | Solução |
|---|---|
| A tela mostra "Não foi possível conectar à API" | O back-end não está rodando: `cd agro-backend && npm run dev` |
| `EADDRINUSE` na porta 3000 ou 4200 | Já existe outro servidor rodando: feche o terminal antigo (Ctrl+C) |
| Erro ao instalar ou executar com Node 18/20 | Atualize para o Node 24 (`node -v` para conferir) |
| Os dados cadastrados sumiram | A API reiniciou; é o comportamento esperado com dados em memória |
| O app diz "Não foi possível acessar a API em http://..." | Confira o IP no `agro-mobile/.env.local` (`ipconfig`), a API rodando e a porta 3000 no firewall. Depois de mudar o `.env.local`, reinicie o `npx expo start` |
| O Expo Go fica carregando ou mostra "Cannot connect to Expo CLI" | Celular e computador na mesma rede, rede privada no Windows e porta 8081 liberada. Recarregue o app (`r` no terminal do Expo) ou use `npx expo start --tunnel` |

Mais detalhes na seção "Problemas comuns" de cada README.
