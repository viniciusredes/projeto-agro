#!/usr/bin/env bash
# =====================================================================
#  Roteiro de testes automatizado — Agro Backend
# =====================================================================
#
#  Como usar (no Git Bash, Linux ou Mac):
#    1. Em um terminal:  npm run dev
#    2. Salve o server.ts (ou reinicie o servidor) para ZERAR os dados.
#    3. Em outro terminal:  bash testes.sh
#
#  Cada teste confere duas coisas:
#    - o código HTTP da resposta (200, 400, 404, 409...)
#    - um trecho que deve aparecer na resposta
#      (se o trecho começar com "!", ele NÃO pode aparecer)
#
#  Os códigos (M0, S1, R4...) são os mesmos do README.md e do testes.http.
# =====================================================================

BASE="${BASE:-http://localhost:3000}"
JSON="Content-Type: application/json"

VERDE='\033[0;32m'
VERMELHO='\033[0;31m'
AMARELO='\033[0;33m'
NORMAL='\033[0m'

passou=0
falhou=0

# ---------------------------------------------------------------------
# testar ID "descrição" STATUS_ESPERADO "trecho esperado" [argumentos do curl...]
# ---------------------------------------------------------------------
testar() {
  local id="$1" descricao="$2" status_esperado="$3" trecho="$4"
  shift 4

  # -s: silencioso | -w: acrescenta o código HTTP numa última linha
  local resposta status corpo
  resposta=$(curl -s -w '\n%{http_code}' "$@")
  status="${resposta##*$'\n'}"   # última linha  = código HTTP
  corpo="${resposta%$'\n'*}"     # todo o resto  = corpo da resposta

  local ok=true
  [ "$status" = "$status_esperado" ] || ok=false

  if [[ "$trecho" == !* ]]; then
    # Trecho que NÃO pode aparecer
    grep -qF -- "${trecho:1}" <<< "$corpo" && ok=false
  else
    grep -qF -- "$trecho" <<< "$corpo" || ok=false
  fi

  if $ok; then
    echo -e "${VERDE}✅ $id${NORMAL}  $descricao"
    passou=$((passou + 1))
  else
    echo -e "${VERMELHO}❌ $id${NORMAL}  $descricao"
    echo "      esperado: HTTP $status_esperado contendo: $trecho"
    echo "      recebido: HTTP $status  $corpo"
    falhou=$((falhou + 1))
  fi
}

secao() {
  echo
  echo -e "${AMARELO}── $1 ──${NORMAL}"
}

# ---------------------------------------------------------------------
# Verificações antes de começar
# ---------------------------------------------------------------------
if ! curl -s -o /dev/null "$BASE/maquinas"; then
  echo -e "${VERMELHO}Servidor fora do ar em $BASE.${NORMAL} Rode 'npm run dev' antes."
  exit 1
fi

# Os testes dependem do estado inicial: sem movimentações de máquinas,
# sem peças cadastradas além das 3 iniciais e sem compras registradas.
if [ "$(curl -s "$BASE/movimentacoes")" != "[]" ] \
   || [ "$(curl -s "$BASE/ordens-servico")" != "[]" ] \
   || [ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/pecas/4")" != "404" ] \
   || curl -s "$BASE/pecas/1/movimentos" | grep -q '"tipo":"entrada"'; then
  echo -e "${AMARELO}Atenção:${NORMAL} o servidor já tem dados de testes anteriores."
  echo "Salve o server.ts (ou reinicie o servidor) para zerar os dados e rode de novo."
  exit 1
fi

echo "Testando a API em $BASE"

# ---------------------------------------------------------------------
secao "GET /maquinas"
# ---------------------------------------------------------------------
testar M0 "Listar máquinas" 200 '"status":"Disponível"' \
  "$BASE/maquinas"

# ---------------------------------------------------------------------
secao "POST /maquinas/:id/saida"
# ---------------------------------------------------------------------
testar S1 "Saída válida da máquina 1" 200 '"status":"Em Operação"' \
  -X POST "$BASE/maquinas/1/saida" -H "$JSON" -d '{"operador":"Joao","frenteTrabalho":"Talhao 5"}'

testar S2 "Saída da máquina 1 de novo" 409 "não pode sair" \
  -X POST "$BASE/maquinas/1/saida" -H "$JSON" -d '{"operador":"Joao","frenteTrabalho":"Talhao 5"}'

testar S3 "Máquina inexistente" 404 "Máquina não encontrada" \
  -X POST "$BASE/maquinas/99/saida" -H "$JSON" -d '{"operador":"Joao","frenteTrabalho":"Talhao 5"}'

testar S4 "Sem corpo" 400 "'operador' é obrigatório" \
  -X POST "$BASE/maquinas/2/saida"

testar S5 "Operador só com espaços" 400 "'operador' é obrigatório" \
  -X POST "$BASE/maquinas/2/saida" -H "$JSON" -d '{"operador":"   ","frenteTrabalho":"Talhao 8"}'

testar S6 "Sem frenteTrabalho" 400 "'frenteTrabalho' é obrigatório" \
  -X POST "$BASE/maquinas/2/saida" -H "$JSON" -d '{"operador":"Maria"}'

testar S7 "JSON mal formado" 400 "JSON inválido" \
  -X POST "$BASE/maquinas/2/saida" -H "$JSON" -d '{operador:Maria}'

testar S8 "JSON sem cabeçalho Content-Type" 400 "'operador' é obrigatório" \
  -X POST "$BASE/maquinas/2/saida" -d '{"operador":"Maria","frenteTrabalho":"Talhao 8"}'

# ---------------------------------------------------------------------
secao "POST /maquinas/:id/retorno"
# ---------------------------------------------------------------------
testar R1 "Retorno de máquina que não saiu" 409 "não pode retornar" \
  -X POST "$BASE/maquinas/2/retorno" -H "$JSON" -d '{"horimetro":510}'

testar R2 "Máquina inexistente" 404 "Máquina não encontrada" \
  -X POST "$BASE/maquinas/99/retorno" -H "$JSON" -d '{"horimetro":510}'

testar R3 "Sem corpo" 400 "'horimetro' é obrigatório" \
  -X POST "$BASE/maquinas/1/retorno"

testar R4 "Horímetro como texto" 400 "'horimetro' é obrigatório" \
  -X POST "$BASE/maquinas/1/retorno" -H "$JSON" -d '{"horimetro":"1012"}'

testar R5 "Avarias com tipo errado" 400 "'avarias', quando informado" \
  -X POST "$BASE/maquinas/1/retorno" -H "$JSON" -d '{"horimetro":1012.3,"avarias":123}'

testar R6 "Horímetro menor que o atual" 400 "(900) é menor que o atual (1000)" \
  -X POST "$BASE/maquinas/1/retorno" -H "$JSON" -d '{"horimetro":900}'

testar R7 "Retorno válido com avarias" 200 '"horasTrabalhadas":12.3' \
  -X POST "$BASE/maquinas/1/retorno" -H "$JSON" -d '{"horimetro":1012.3,"avarias":"Vazamento de oleo"}'

# ---------------------------------------------------------------------
secao "GET /movimentacoes"
# ---------------------------------------------------------------------
testar H1 "Histórico após o R7" 200 '"avarias":"Vazamento de oleo"' \
  "$BASE/movimentacoes"

testar H2 "Saída da máquina 2 (preparação)" 200 '"horimetroSaida":500' \
  -X POST "$BASE/maquinas/2/saida" -H "$JSON" -d '{"operador":"Maria","frenteTrabalho":"Talhao 8"}'

testar H3 "Filtro maquinaId=2 (máquina em campo)" 200 '!dataRetorno' \
  "$BASE/movimentacoes?maquinaId=2"

testar H4 "Filtro inválido" 400 "deve ser um número inteiro" \
  "$BASE/movimentacoes?maquinaId=abc"

testar H5 "Retorno da máquina 2 sem avarias" 200 '"horasTrabalhadas":10' \
  -X POST "$BASE/maquinas/2/retorno" -H "$JSON" -d '{"horimetro":510}'

testar H6 "Histórico final (2 movimentações)" 200 '"id":2' \
  "$BASE/movimentacoes"

# ---------------------------------------------------------------------
secao "Comportamentos globais"
# ---------------------------------------------------------------------
testar G1 "Rota inexistente" 404 "Rota GET /xyz não existe" \
  "$BASE/xyz"

testar G2 "Método não suportado" 404 "Rota DELETE /maquinas não existe" \
  -X DELETE "$BASE/maquinas"

# -i inclui os cabeçalhos na resposta, para conferir que o X-Powered-By sumiu
testar G3 "Sem cabeçalho X-Powered-By" 200 '!X-Powered-By' \
  -i "$BASE/maquinas"

# =====================================================================
#  MÓDULO DE ESTOQUE
# =====================================================================

# ---------------------------------------------------------------------
secao "GET /pecas e GET /pecas/:id"
# ---------------------------------------------------------------------
testar P1 "Listar peças" 200 '"codigo":"FLT-001"' \
  "$BASE/pecas"

testar P2 "Buscar peça existente" 200 '"codigo":"OLE-001"' \
  "$BASE/pecas/2"

testar P3 "Peça inexistente" 404 "Peça não encontrada" \
  "$BASE/pecas/99"

testar P4 "Id inválido" 400 "O id deve ser um número inteiro" \
  "$BASE/pecas/abc"

# ---------------------------------------------------------------------
secao "POST /pecas (cadastro)"
# ---------------------------------------------------------------------
testar C1 "Cadastro válido (código normalizado, saldo zero)" 201 '"codigo":"FLT-002"' \
  -X POST "$BASE/pecas" -H "$JSON" -d '{"codigo":" flt-002 ","descricao":"Filtro de ar","unidade":"un","estoqueMinimo":3}'

testar C2 "Código repetido" 409 "Já existe uma peça com o código FLT-002" \
  -X POST "$BASE/pecas" -H "$JSON" -d '{"codigo":"FLT-002","descricao":"Outro","unidade":"un"}'

testar C3 "Unidade inválida" 400 "'unidade' deve ser um destes: un, L" \
  -X POST "$BASE/pecas" -H "$JSON" -d '{"codigo":"GRX-001","descricao":"Graxa","unidade":"kg"}'

testar C4 "Saldo informado no cadastro" 400 "Use a entrada de estoque" \
  -X POST "$BASE/pecas" -H "$JSON" -d '{"codigo":"GRX-001","descricao":"Graxa","unidade":"un","saldo":50}'

testar C5 "Estoque mínimo fracionado em peça por unidade" 400 "'estoqueMinimo' deve ser um número inteiro" \
  -X POST "$BASE/pecas" -H "$JSON" -d '{"codigo":"GRX-001","descricao":"Graxa","unidade":"un","estoqueMinimo":2.5}'

testar C6 "Sem código" 400 "'codigo' é obrigatório" \
  -X POST "$BASE/pecas" -H "$JSON" -d '{"descricao":"Graxa","unidade":"un"}'

# ---------------------------------------------------------------------
secao "POST /pecas/:id/entradas (compra)"
# ---------------------------------------------------------------------
testar E1 "Compra de filtros (saldo 10 -> 15)" 200 '"saldo":15,' \
  -X POST "$BASE/pecas/1/entradas" -H "$JSON" -d '{"quantidade":5,"custoUnitario":92.456}'

testar E2 "Custo arredondado e atualizado (última compra)" 200 '"custoUnitario":92.46' \
  "$BASE/pecas/1"

testar E3 "Compra fracionada em litros" 200 '"saldo":220.5' \
  -X POST "$BASE/pecas/2/entradas" -H "$JSON" -d '{"quantidade":20.5,"custoUnitario":19.9}'

testar E4 "Quantidade fracionada em peça por unidade" 400 "deve ser um número inteiro" \
  -X POST "$BASE/pecas/1/entradas" -H "$JSON" -d '{"quantidade":1.5,"custoUnitario":90}'

testar E5 "Quantidade zero" 400 "'quantidade' deve ser um número maior que zero" \
  -X POST "$BASE/pecas/1/entradas" -H "$JSON" -d '{"quantidade":0,"custoUnitario":90}'

testar E6 "Custo negativo" 400 "'custoUnitario' deve ser um número maior que zero" \
  -X POST "$BASE/pecas/1/entradas" -H "$JSON" -d '{"quantidade":5,"custoUnitario":-1}'

testar E7 "Peça inexistente" 404 "Peça não encontrada" \
  -X POST "$BASE/pecas/99/entradas" -H "$JSON" -d '{"quantidade":5,"custoUnitario":90}'

# ---------------------------------------------------------------------
secao "GET /pecas/:id/movimentos (kardex)"
# ---------------------------------------------------------------------
testar K1 "Kardex com implantação" 200 '"tipo":"implantacao"' \
  "$BASE/pecas/1/movimentos"

testar K2 "Kardex com a compra (saldo após 15)" 200 '"saldoApos":15' \
  "$BASE/pecas/1/movimentos"

testar K3 "Kardex de peça nova, sem compras" 200 '[]' \
  "$BASE/pecas/4/movimentos"

testar K4 "Kardex de peça inexistente" 404 "Peça não encontrada" \
  "$BASE/pecas/99/movimentos"

# ---------------------------------------------------------------------
secao "GET /pecas?abaixoDoMinimo=true (reposição)"
# ---------------------------------------------------------------------
testar A1 "Correia abaixo do mínimo (4 < 5)" 200 '"faltaParaMinimo":1' \
  "$BASE/pecas?abaixoDoMinimo=true"

testar A2 "Filtro com valor inválido" 400 "só aceita o valor 'true'" \
  "$BASE/pecas?abaixoDoMinimo=sim"

testar A3 "Compra de correias (preparação)" 200 '"saldo":10,' \
  -X POST "$BASE/pecas/3/entradas" -H "$JSON" -d '{"quantidade":6,"custoUnitario":118}'

testar A4 "Correia sai da lista de reposição" 200 '!COR-001' \
  "$BASE/pecas?abaixoDoMinimo=true"

# =====================================================================
#  MÓDULO DE MANUTENÇÃO (ORDENS DE SERVIÇO)
#  Estado herdado dos testes anteriores:
#  - TR-01 disponível com horímetro 1012.3; CO-02 disponível com 510
#  - Filtro FLT-001: saldo 15, custo 92.46 | Óleo OLE-001: saldo 220.5, custo 19.9
# =====================================================================

# ---------------------------------------------------------------------
secao "POST /ordens-servico (abertura)"
# ---------------------------------------------------------------------
testar O1 "Nenhuma O.S. no início" 200 '[]' \
  "$BASE/ordens-servico"

testar O2 "Abrir O.S. com a máquina disponível" 201 '"status":"Em Manutenção"' \
  -X POST "$BASE/ordens-servico" -H "$JSON" -d '{"maquinaId":1,"tipo":"Preventiva","descricao":"Revisao 1000 h","horimetro":1012.3}'

testar O3 "Segunda O.S. para a mesma máquina" 409 "já está em manutenção (O.S. nº 1 aberta)" \
  -X POST "$BASE/ordens-servico" -H "$JSON" -d '{"maquinaId":1,"tipo":"Corretiva","descricao":"Outro","horimetro":1012.3}'

testar O4 "Saída de máquina em manutenção" 409 "status atual é 'Em Manutenção'" \
  -X POST "$BASE/maquinas/1/saida" -H "$JSON" -d '{"operador":"Joao","frenteTrabalho":"Talhao 5"}'

testar O5 "maquinaId como texto" 400 "'maquinaId' é obrigatório e deve ser um número inteiro" \
  -X POST "$BASE/ordens-servico" -H "$JSON" -d '{"maquinaId":"2","tipo":"Corretiva","descricao":"X","horimetro":510}'

testar O6 "Máquina inexistente" 404 "Máquina não encontrada" \
  -X POST "$BASE/ordens-servico" -H "$JSON" -d '{"maquinaId":99,"tipo":"Corretiva","descricao":"X","horimetro":1}'

testar O7 "Tipo inválido" 400 "'tipo' deve ser um destes: Preventiva, Corretiva" \
  -X POST "$BASE/ordens-servico" -H "$JSON" -d '{"maquinaId":2,"tipo":"Urgente","descricao":"X","horimetro":510}'

testar O8 "Horímetro menor que o atual" 400 "(400) é menor que o atual (510)" \
  -X POST "$BASE/ordens-servico" -H "$JSON" -d '{"maquinaId":2,"tipo":"Corretiva","descricao":"X","horimetro":400}'

# ---------------------------------------------------------------------
secao "Abertura de O.S. com a máquina em campo"
# ---------------------------------------------------------------------
testar O9 "Saída da CO-02 (preparação)" 200 '"status":"Em Operação"' \
  -X POST "$BASE/maquinas/2/saida" -H "$JSON" -d '{"operador":"Maria","frenteTrabalho":"Talhao 8"}'

testar O10 "O.S. encerra a saída automaticamente (7.5 h)" 201 '"horasTrabalhadas":7.5' \
  -X POST "$BASE/ordens-servico" -H "$JSON" -d '{"maquinaId":2,"tipo":"Corretiva","descricao":"Correia partiu","horimetro":517.5}'

testar O11 "Retorno depois da O.S. não é mais possível" 409 "não pode retornar" \
  -X POST "$BASE/maquinas/2/retorno" -H "$JSON" -d '{"horimetro":520}'

testar O12 "Avaria registrada com o número da O.S." 200 'Correia partiu"' \
  "$BASE/movimentacoes?maquinaId=2"

# ---------------------------------------------------------------------
secao "POST /ordens-servico/:id/fechamento"
# ---------------------------------------------------------------------
testar F1 "O.S. inexistente" 404 "Ordem de serviço não encontrada" \
  -X POST "$BASE/ordens-servico/99/fechamento"

testar F2 "'pecas' não é uma lista" 400 "'pecas', quando informado, deve ser uma lista" \
  -X POST "$BASE/ordens-servico/1/fechamento" -H "$JSON" -d '{"pecas":{"pecaId":1}}'

testar F3 "Peça repetida" 400 "aparece mais de uma vez" \
  -X POST "$BASE/ordens-servico/1/fechamento" -H "$JSON" -d '{"pecas":[{"pecaId":1,"quantidade":1},{"pecaId":1,"quantidade":1}]}'

testar F4 "Peça inexistente na lista" 404 "Item 2: peça 99 não encontrada" \
  -X POST "$BASE/ordens-servico/1/fechamento" -H "$JSON" -d '{"pecas":[{"pecaId":1,"quantidade":1},{"pecaId":99,"quantidade":1}]}'

testar F5 "Estoque insuficiente (tudo ou nada)" 409 "Nenhuma baixa foi realizada" \
  -X POST "$BASE/ordens-servico/1/fechamento" -H "$JSON" -d '{"pecas":[{"pecaId":2,"quantidade":10},{"pecaId":1,"quantidade":20}]}'

testar F6 "Saldos intactos após o erro" 200 '"saldo":220.5' \
  "$BASE/pecas/2"

testar F7 "Fechamento com baixa e custo total" 200 '"custoTotal":493.37' \
  -X POST "$BASE/ordens-servico/1/fechamento" -H "$JSON" -d '{"pecas":[{"pecaId":1,"quantidade":2},{"pecaId":2,"quantidade":15.5}]}'

testar F8 "Saída no kardex apontando para a O.S." 200 '"ordemServicoId":1' \
  "$BASE/pecas/1/movimentos"

testar F9 "Saldo do filtro baixado (15 -> 13)" 200 '"saldo":13,' \
  "$BASE/pecas/1"

testar F10 "Fechar O.S. já fechada" 409 "já está fechada" \
  -X POST "$BASE/ordens-servico/1/fechamento"

testar F11 "Fechar O.S. sem peças" 200 '"custoTotal":0' \
  -X POST "$BASE/ordens-servico/2/fechamento"

testar F12 "Máquina volta a ficar disponível" 200 '"horimetro":517.5,"status":"Disponível"' \
  "$BASE/maquinas"

# ---------------------------------------------------------------------
secao "Consultas de O.S. e custo congelado"
# ---------------------------------------------------------------------
testar Q1 "Detalhe da O.S. com os dados da máquina" 200 '"tag":"TR-01"' \
  "$BASE/ordens-servico/1"

testar Q2 "O.S. inexistente" 404 "Ordem de serviço não encontrada" \
  "$BASE/ordens-servico/99"

testar Q3 "Filtros combinados (máquina 2, fechadas)" 200 '"descricao":"Correia partiu"' \
  "$BASE/ordens-servico?maquinaId=2&status=Fechada"

testar Q4 "Status inválido no filtro" 400 "'status' deve ser um destes: Aberta, Fechada" \
  "$BASE/ordens-servico?status=aberta"

testar Q5 "Custo de manutenção por tipo" 200 '"Preventiva":493.37' \
  "$BASE/maquinas/1/manutencoes"

testar Q6 "Manutenções de máquina inexistente" 404 "Máquina não encontrada" \
  "$BASE/maquinas/99/manutencoes"

testar Q7 "Compra de filtros mais cara (preparação)" 200 '"custoUnitario":110' \
  -X POST "$BASE/pecas/1/entradas" -H "$JSON" -d '{"quantidade":5,"custoUnitario":110}'

testar Q8 "Custo congelado: a O.S. não muda" 200 '"custoUnitario":92.46' \
  "$BASE/ordens-servico/1"

# =====================================================================
#  CADASTRO DE MÁQUINAS (fica no fim para não alterar o estado dos testes acima)
# =====================================================================

# ---------------------------------------------------------------------
secao "POST /maquinas (cadastro)"
# ---------------------------------------------------------------------
testar N1 "Cadastro válido (tag normalizada, status Disponível)" 201 '"tag":"PV-03"' \
  -X POST "$BASE/maquinas" -H "$JSON" -d '{"tag":" pv-03 ","modelo":"Pulverizador","horimetro":250}'

testar N2 "Tag repetida" 409 "Já existe uma máquina com a tag PV-03" \
  -X POST "$BASE/maquinas" -H "$JSON" -d '{"tag":"PV-03","modelo":"Outro","horimetro":0}'

testar N3 "Horímetro negativo" 400 "'horimetro' deve ser um número maior ou igual a zero" \
  -X POST "$BASE/maquinas" -H "$JSON" -d '{"tag":"X-01","modelo":"Trator","horimetro":-5}'

testar N4 "Sem tag" 400 "'tag' é obrigatório" \
  -X POST "$BASE/maquinas" -H "$JSON" -d '{"modelo":"Trator","horimetro":10}'

testar N5 "Sem modelo" 400 "'modelo' é obrigatório" \
  -X POST "$BASE/maquinas" -H "$JSON" -d '{"tag":"X-01","horimetro":10}'

testar N6 "Máquina nova aparece na lista e já pode sair" 200 '"status":"Em Operação"' \
  -X POST "$BASE/maquinas/3/saida" -H "$JSON" -d '{"operador":"Ana","frenteTrabalho":"Talhao 2"}'

# ---------------------------------------------------------------------
# Resumo
# ---------------------------------------------------------------------
echo
total=$((passou + falhou))
if [ "$falhou" -eq 0 ]; then
  echo -e "${VERDE}Todos os $total testes passaram!${NORMAL}"
  exit 0
else
  echo -e "${VERMELHO}$falhou de $total testes falharam.${NORMAL}"
  exit 1
fi
