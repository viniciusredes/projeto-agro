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

## 5. O Que Ficou Pendente / Próximos Passos Combinados

- **Finalizar a Etapa 1 (Back-end em Memória):**
- Criar os arrays em memória `ordensServico` e `itensEstoque`.
- Desenvolver os endpoints de CRUD para o almoxarifado (cadastrar peças, visualizar estoque).
- Desenvolver os endpoints para abertura e fechamento de Ordens de Serviço.
- Implementar a lógica no controlador de fechamento de O.S. que itera sobre as peças consumidas, localiza o item no array de estoque e decrementa a propriedade `quantidade_saldo`.

- **Iniciar a Etapa 2 (Front-end):**
- Gerar o projeto com `@angular/cli` (`ng new agro-frontend`).
- Criar os serviços do Angular (`HttpClient`) para consumir a API local na porta 3000.
- Desenvolver as interfaces de listagem de frota e os formulários de check-in/check-out.

- **Evolução Futura:** Substituir as variáveis em memória por um banco de dados relacional (provavelmente PostgreSQL utilizando Prisma ORM) após a validação completa do fluxo entre Front e Back.

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

**Perguntas originais:**

- **Tratamento e Validação de Erros:** Ainda não foi definida a biblioteca ou padrão arquitetural para validação de esquemas de entrada (ex.: impedir que a rota de retorno aceite um horímetro menor que o registrado na saída). Será utilizado Zod, Joi ou validação manual nas rotas?
- **Autenticação e Permissões:** O sistema exigirá login para acessar a API? Haverá diferenciação de perfis (ex.: Operador apenas registra saída/retorno, Mecânico gerencia O.S.) durante o MVP, ou todas as rotas serão abertas nesta fase?
- **Modelagem Exata do Custo da O.S.:** Na regra de baixa de peças, o custo unitário será calculado por média ponderada do estoque atual, ou pelo valor fixo da última compra registrada em memória?
