// Regras de validação reaproveitadas pelos formulários do sistema

// "Tem pelo menos um caractere que não é espaço".
// Espelha a regra do back-end, que recusa textos só com espaços (trim).
export const NAO_VAZIO = /\S/;
