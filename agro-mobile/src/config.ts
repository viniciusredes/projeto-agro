// Endereço da API, lido do .env.local (EXPO_PUBLIC_API_URL).
// No celular não existe o proxy do "ng serve": o app chama a API direto, pelo IP do computador.
// O Expo troca "process.env.EXPO_PUBLIC_..." pelo valor na hora de montar o app; por isso o
// nome precisa aparecer assim, por extenso (process.env[nome] não funciona).
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

if (!API_URL) {
  console.warn('EXPO_PUBLIC_API_URL não definida: crie o .env.local a partir do .env.example');
}
