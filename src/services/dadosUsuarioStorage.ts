/**
 * Service de infraestrutura: guarda no aparelho os dados de cada usuário
 * (locações, favoritos, cartões salvos), separados por conta.
 *
 * Cada informação fica numa chave própria do AsyncStorage, no formato
 * `@locatemMobile:<tipo>:<idDoUsuario>`. Assim um usuário nunca enxerga os
 * dados de outro que usou o mesmo aparelho, e os dados sobrevivem ao
 * fechamento do app (antes só a sessão de login era salva).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Monta a chave do AsyncStorage para um tipo de dado de um usuário. */
export function chaveDadosUsuario(tipo: string, usuarioId: string): string {
  return `@locatemMobile:${tipo}:${usuarioId}`;
}

/** Lê um dado salvo do usuário. Devolve `null` se não existir ou se falhar. */
export async function carregarDadosUsuario<T>(tipo: string, usuarioId: string): Promise<T | null> {
  try {
    const bruto = await AsyncStorage.getItem(chaveDadosUsuario(tipo, usuarioId));
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch (error) {
    console.warn(`[dadosUsuarioStorage] Não foi possível carregar "${tipo}".`, error);
    return null;
  }
}

/** Grava um dado do usuário. Uma falha não interrompe o uso do app. */
export async function salvarDadosUsuario<T>(tipo: string, usuarioId: string, valor: T): Promise<void> {
  try {
    await AsyncStorage.setItem(chaveDadosUsuario(tipo, usuarioId), JSON.stringify(valor));
  } catch (error) {
    console.warn(`[dadosUsuarioStorage] Não foi possível salvar "${tipo}".`, error);
  }
}
