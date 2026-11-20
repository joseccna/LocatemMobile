/**
 * Configuração: endereço da API .NET do LOCATEM.
 *
 * M06: o endereço era fixo em três arquivos como http://10.0.2.2:5033, que só
 * existe dentro do emulador Android (é o "localhost" do computador). Agora ele
 * vem da variável de ambiente EXPO_PUBLIC_API_URL (arquivo .env, ver
 * .env.example), e o 10.0.2.2 continua como padrão para o emulador.
 *
 * Em um celular real, use o IP do computador na rede (ex.: http://192.168.0.10:5033)
 * ou o endereço público da API.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5033';
