# Contexto do Projeto Agro Frota

> Contexto de negócio, decisões e histórico do projeto (back-end e front-end). Para executar, veja o [README](README.md).

## 1. Objetivo do Projeto e Problema de Negócio

O objetivo principal deste projeto é desenvolver um Produto Mínimo Viável (MVP) para a gestão de frota, manutenção e estoque de maquinários agrícolas. O problema de negócio central reside na necessidade de substituir controles informais, descentralizados e manuais (como cadernos de anotação, planilhas avulsas e mensagens de WhatsApp) por uma plataforma digital unificada e rastreável.

No ambiente agroindustrial, a falta de controle exato sobre o ciclo de vida operacional das máquinas resulta em manutenções negligenciadas, desvios de peças e perda de produtividade. O sistema visa fornecer previsibilidade e controle em tempo real, respondendo a perguntas fundamentais: onde a máquina está, com quem está operando, quantas horas trabalhou (horímetro), qual o histórico de intervenções mecânicas e qual o custo de peças consumidas por equipamento.

## 2. Requisitos e Regras de Negócio Definidos

O escopo do MVP foi intencionalmente reduzido para focar em três pilares essenciais:

- **Módulo de Controle de Uso (Check-in / Check-out):**
- Cada máquina possui um cadastro com ID, Tag/Placa, Modelo, Horímetro atual e Status (`Disponível`, `Em Operação`, `Em Manutenção`).
- **Fluxo de Saída:** O operador aloca a máquina para uma frente de trabalho. O sistema deve validar a disponibilidade da máquina e alterar seu status para `Em Operação`.
- **Fluxo de Retorno:** O operador devolve a máquina informando o horímetro final. O sistema deve garantir que o novo horímetro seja maior ou igual ao anterior, calcular o tempo de uso, registrar possíveis avarias observadas e devolver o status da máquina para `Disponível`.

- **Módulo de Gestão de Manutenção (Ordens de Serviço - O.S.):**
- Permite a abertura de O.S. (Preventiva ou Corretiva) vinculada a uma máquina específica, alterando seu status para `Em Manutenção`.
- A O.S. deve registrar o horímetro no momento da parada, a descrição do problema ou serviço, e a lista de peças utilizadas para o reparo.

- **Módulo de Gestão de Estoque (Almoxarifado):**
- Cadastro de itens críticos de alto giro (filtros, lubrificantes, correias) com controle de saldo atual e custo unitário.
- **Baixa Automática:** Regra de negócio vital onde a inclusão de uma peça na Ordem de Serviço deduz automaticamente a quantidade correspondente do saldo em estoque e calcula o custo total agregado daquela manutenção.

## 3. Decisões Técnicas Tomadas e Justificativas

- **Estratégia de Desenvolvimento em Duas Etapas:** Decidiu-se separar o desenvolvimento. A **Etapa 1** (atual) foca exclusivamente no Back-end utilizando persistência de dados em memória (arrays). O motivo é acelerar a validação das regras de negócio, contratos de API e fluxos lógicos sem a sobrecarga inicial de modelagem, migrações e configuração de um banco de dados real. A **Etapa 2** será a construção do Front-end.
- **Stack Tecnológica:**
- **Node.js (v24+), Express e TypeScript:** Escolhidos pela agilidade na criação de APIs RESTful e pela tipagem estática que previne erros de estrutura de dados durante o desenvolvimento.
- **Angular:** Escolhido para a Etapa 2 (Front-end) devido à sua arquitetura robusta baseada em componentes e serviços, ideal para aplicações corporativas estruturadas.

- **Motor de Execução (Substituição de ts-node por tsx):** Durante o setup com o Node.js v24, a ferramenta clássica `ts-node` apresentou erros de compatibilidade de módulos e leitura de arquivos internos (`TypeError: Cannot read properties of undefined (reading 'fileExists')`). A decisão técnica foi migrar para o **`tsx`** (`npm install -D tsx`), um executor mais moderno e resiliente para ambientes de desenvolvimento TypeScript.
- **Configuração do TypeScript (`tsconfig.json`):** O projeto foi configurado para utilizar `"module": "commonjs"` e `"target": "es2022"`. Essa decisão foi tomada para contornar erros iniciais de importação (ES Modules vs CommonJS) no Express, garantindo uma configuração enxuta e funcional para a fase em memória.

**Decisões da Etapa 2 (front-end):**
- **Angular 22 + Angular Material (Material 3):** componentes prontos e acessíveis (tabelas, diálogos, formulários), para o treinamento focar no Angular e não em CSS de componentes.
- **Proxy do `ng serve` em vez de CORS:** o front chama `/api/...` e o proxy repassa para `http://localhost:3000`. O back-end não precisou mudar.
- **Angular moderno:** componentes standalone, `inject()`, signals e `rxResource` para o estado, control flow `@if`/`@for`, formulários reativos tipados, lazy loading por tela e app *zoneless* (padrão do Angular 22).
- **Models copiados do back-end:** as interfaces de `server.ts` foram copiadas para `core/models` (contrato explícito). Um pacote compartilhado ficou para o futuro.
- **Tratamento de erros global:** um interceptor HTTP mostra a mensagem `{ erro }` da API num snackbar; as telas só decidem o que fazer depois.
- **Validação duplicada de propósito:** o front valida para ajudar o usuário (mesmas regras da API), e a API continua sendo a autoridade (ex.: o 409 "tudo ou nada" do fechamento da O.S.).
- **Filtros da lista de O.S. na URL** (query params), para permitir links compartilháveis e o botão Voltar.
- **Identidade visual:** paleta gerada a partir das cores da logo (verde `#0f633e` + laranja `#f38302`) pelo schematic `theme-color`, e tema escuro com `color-scheme` + `light-dark()` e escolha Claro/Escuro salva no navegador.
- **Dinâmica do treinamento:** nas Fases 0 a 2, o usuário escreveu o código com orientação; da Fase 3 em diante, o Claude implementou com edições visíveis para os alunos, e o usuário fez os commits. Um commit por passo, com o acompanhamento no `CHECKLIST.md`.

## 4. O Que Já Foi Implementado

O ambiente do Back-end foi completamente configurado e o servidor já está operacional. O artefato principal é o arquivo `server.ts` contendo:

- **Configuração Base:** Instância do Express rodando na porta 3000 com middleware `express.json()` para parsing de payloads.
- **Banco de Dados em Memória:** Estrutura inicial criada com `let maquinas: any[] = [...]` pré-populada com dois objetos de teste (Trator e Colheitadeira).
- **Endpoints REST Funcionais (Testados via cURL e Restman):**
- `GET /maquinas`: Retorna o array completo de máquinas com seus respectivos status e horímetros.
- `POST /maquinas/:id/saida`: Localiza a máquina pelo ID via parâmetro de rota e altera a propriedade `status` para `'Em Operação'`.
- `POST /maquinas/:id/retorno`: Recebe o payload `{ "horimetro": <numero> }` no corpo da requisição, atualiza a propriedade `horimetro` da máquina correspondente e reverte o `status` para `'Disponível'`.

### Atualização: Módulo de Uso concluído (implementado em partes, para fins de treinamento)

- Script `npm run dev` (`tsx watch server.ts`) com reinício automático.
- Tipos `StatusMaquina`, `Maquina` e `Movimentacao`.
- `POST /maquinas/:id/saida`: exige `operador` e `frenteTrabalho`; valida existência (404), status `Disponível` (409) e campos (400); abre uma movimentação.
- `POST /maquinas/:id/retorno`: valida existência (404), status `Em Operação` (409), `horimetro` numérico (400) e maior ou igual ao atual (400); aceita `avarias` opcional (texto); fecha a movimentação e calcula `horasTrabalhadas`.
- `GET /movimentacoes` (filtro opcional `?maquinaId=`): histórico de saídas e retornos.
- Segurança: JSON inválido → 400 em JSON; rota inexistente → 404 em JSON; erros inesperados → 500 genérico (detalhe só no console); cabeçalho `X-Powered-By` desativado.

### Atualização: Módulo de Estoque concluído (Partes E1 a E6)

- Tipos `UnidadeMedida` (`un` | `L`), `Peca` e `MovimentoEstoque` (`implantacao` | `entrada` | `saida`).
- 3 peças iniciais (FLT-001, OLE-001, COR-001), com movimentos de implantação no kardex.
- `GET /pecas` (filtro `?abaixoDoMinimo=true`, com o campo calculado `faltaParaMinimo`) e `GET /pecas/:id`.
- `POST /pecas`: cadastro com código único normalizado (409); a peça nasce com saldo 0 e custo 0; `saldo`/`custoUnitario` no cadastro são recusados (400); `estoqueMinimo` opcional.
- `POST /pecas/:id/entradas`: soma ao saldo e define o custo pela última compra (arredondado para 2 casas); peças em `un` só aceitam quantidades inteiras; grava um movimento `entrada`.
- `GET /pecas/:id/movimentos`: kardex com `saldoApos` e custo congelado por movimento.
- Função auxiliar `arredondar(valor, casas)`.
- Material atualizado: README (Partes E1–E6), `testes.sh` e `testes.http` (50 cenários), glossário e desafios extras.

### Atualização: Módulo de Manutenção concluído (Partes OS1 a OS7)

- Tipos `TipoOS` (`Preventiva` | `Corretiva`), `StatusOS` (`Aberta` | `Fechada`), `ItemOS` e `OrdemServico` (cabeçalho + itens).
- `GET /ordens-servico` (filtros combináveis `?maquinaId=` e `?status=`) e `GET /ordens-servico/:id` (com `tag` e `modelo` da máquina).
- `POST /ordens-servico`: abre a O.S. (201), uma por máquina (409), horímetro ≥ atual; a máquina vai para `Em Manutenção`. Com a máquina em campo, a movimentação aberta é encerrada automaticamente com o horímetro da parada e a avaria `O.S. nº X: descrição`.
- Funções `buscarMovimentacaoAberta` e `fecharMovimentacao`, compartilhadas entre o retorno e a abertura de O.S.
- `POST /ordens-servico/:id/fechamento`: valida a lista de peças inteira antes de alterar qualquer dado (`validarPecasDoFechamento`, tudo ou nada; estoque insuficiente → 409 listando todas as peças); baixa cada peça com movimento `saida` no kardex (`ordemServicoId`), custo congelado no item e `custoTotal`; a máquina volta para `Disponível`.
- `GET /maquinas/:id/manutencoes`: total de O.S., abertas/fechadas, custo total e custo por tipo (só O.S. fechadas).
- Material atualizado: README (Partes OS1–OS7), `testes.sh` e `testes.http` (82 cenários), glossário e desafios extras.

### Atualização: cadastro de máquinas (descoberto durante o front-end)

- `POST /maquinas`: `tag` e `modelo` obrigatórios, `horimetro` ≥ 0, tag única normalizada em maiúsculas (409); a máquina nasce `Disponível` (201).
- `testes.sh` com 6 cenários novos (88 no total).

### Atualização: Etapa 2 (front-end Angular) concluída

Projeto `agro-frontend/` (detalhes, conceitos e testes no [README do front-end](agro-frontend/README.md)):

- **Base (Fase 0):** Angular 22 + Material, casca com barra e menu lateral, rotas com lazy loading, proxy `/api`, models e services por recurso.
- **Máquinas (Fase 1):** lista com estados (carregando, erro, vazio), cadastro, diálogos de saída e de retorno (horímetro mínimo e horas previstas), histórico de movimentações com filtro e formatação pt-BR, interceptor global de erros.
- **Estoque (Fase 2):** lista de peças com custo em R$, alerta e filtro de reposição, cadastro com validação condicional pela unidade, entrada (compra) com prévia e mudança de custo, kardex em `/estoque/:id`.
- **Manutenção (Fase 3):** lista de O.S. com filtros na URL e `rxResource`, abertura (pela lista de O.S. ou de máquinas) com aviso de máquina em campo, detalhe e fechamento com `FormArray` (peças dinâmicas, validação por linha e por lista, tudo ou nada da API), detalhe da máquina com indicadores e barra de custo preventiva × corretiva.
- **Polimento e identidade visual:** estilos globais e tons semânticos das etiquetas, página inicial com a logo e os números da frota, paleta da marca, tipografia Montserrat e tema escuro.
- `ng build` sem erros nem avisos.

## 5. O Que Ficou Pendente / Próximos Passos Combinados

> **Status:** a **Etapa 1 (back-end em memória)** e a **Etapa 2 (front-end Angular)** estão concluídas. O acompanhamento passo a passo está no [CHECKLIST.md](CHECKLIST.md).

- **Pendências do front-end (Passo 16, não implementadas):**
  - Diálogo de confirmação reutilizável antes do fechamento da O.S.
  - Responsividade: menu lateral sobreposto em telas de celular.
  - Conferência visual das telas restantes nos temas claro e escuro.
- **Testes unitários do front:** os `.spec.ts` gerados pelo CLI precisam receber os providers (`HttpClient`, `ActivatedRoute`, `MAT_DIALOG_DATA`). Hoje 7 passam e 14 falham.
- **Material do back-end:** trocar o exercício 4 (que virou "resposta pronta" com o `POST /maquinas`) por outro desafio, com gabarito, e incluir o cadastro no `testes.http`.
- **Tamanho do pacote inicial:** cerca de 675 kB, perto do alerta de 700 kB configurado no `angular.json`.
- **Evolução Futura:** Substituir as variáveis em memória por um banco de dados relacional (provavelmente PostgreSQL utilizando Prisma ORM), autenticação com perfis e publicação (build do front servido na mesma origem da API).

## 6. Ideias Descartadas e Por Quê

- **Clean Architecture / Domain-Driven Design (DDD):** A proposta inicial sugeria uma arquitetura em camadas altamente desacoplada (Casos de Uso, Controladores, Infraestrutura). Foi descartada temporariamente a pedido do usuário para priorizar uma abordagem mais simples e pragmática, garantindo entregas rápidas focadas no fluxo da operação e não na complexidade arquitetural.
- **Integração com Telemetria e GPS (IoT):** A ideia de automatizar a leitura do horímetro via rede CAN bus da máquina foi descartada para o MVP. O apontamento de horas será estritamente manual pelo operador ou encarregado para simplificar a engenharia de dados inicial.
- **Operação Offline-First Complexa:** A sincronização bidirecional robusta para áreas sem cobertura de internet foi deixada para o backlog futuro. O MVP assume que as transações sistêmicas ocorrerão onde há conectividade (sede da fazenda, pátio ou oficina).
- **Módulo Financeiro e Multi-filiais:** Controles avançados de contas a pagar/receber e transferências de estoque entre múltiplas fazendas foram cortados para manter o foco exclusivo no controle do maquinário individual e num almoxarifado central único.

## 7. Dúvidas em Aberto (resolvidas)

**Decisões tomadas:**
- **Validação:** manual, diretamente nas rotas (sem Zod/Joi).
- **Autenticação:** sem login e sem perfis no MVP; todas as rotas abertas.
- **Custo da O.S.:** usa o valor unitário da última compra registrada da peça.
- **Estoque negativo:** proibido. Se alguma peça da O.S. não tiver saldo suficiente, o fechamento inteiro é recusado (nenhuma baixa parcial).
- **Momento da baixa:** as peças são baixadas do estoque somente ao **fechar** a O.S.
- **Custo congelado:** a O.S. grava o custo unitário de cada peça no momento da baixa; compras futuras não alteram o custo de manutenções já fechadas.
- **O.S. com máquina em campo:** é permitido abrir O.S. para uma máquina com status `Em Operação`.
- **O.S. aberta com máquina em campo:** a abertura da O.S. fecha automaticamente a movimentação aberta, usando o horímetro da parada (calcula as horas trabalhadas); a descrição do problema é registrada como avaria. A máquina vai direto para `Em Manutenção`.
- **Uma O.S. aberta por máquina:** não é permitido abrir uma segunda O.S. para uma máquina que já tem O.S. aberta (409).
- **Peça repetida no fechamento:** recusada com 400; cada peça deve aparecer uma única vez, com a quantidade total.
- **Persistência:** o banco de dados (PostgreSQL + Prisma) não será implementado neste momento; os dados seguem em memória.
- **Cadastro de máquinas:** entra no sistema (rota `POST /maquinas` + diálogo no front), decidido durante a Etapa 2.
- **Tema:** apenas Claro e Escuro no seletor; na primeira visita, o sistema segue o tema do sistema operacional.

**Perguntas originais:**

- **Tratamento e Validação de Erros:** Ainda não foi definida a biblioteca ou padrão arquitetural para validação de esquemas de entrada (ex.: impedir que a rota de retorno aceite um horímetro menor que o registrado na saída). Será utilizado Zod, Joi ou validação manual nas rotas?
- **Autenticação e Permissões:** O sistema exigirá login para acessar a API? Haverá diferenciação de perfis (ex.: Operador apenas registra saída/retorno, Mecânico gerencia O.S.) durante o MVP, ou todas as rotas serão abertas nesta fase?
- **Modelagem Exata do Custo da O.S.:** Na regra de baixa de peças, o custo unitário será calculado por média ponderada do estoque atual, ou pelo valor fixo da última compra registrada em memória?
