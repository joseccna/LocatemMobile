/**
 * Hook de locacoes: mantém "Minhas Locacoes" salvas no aparelho, por usuário (B02).
 *
 * As locações criadas no pagamento ficam na store Zustand `useLocacaoStore`,
 * que vivia só em memória e era zerada ao fechar o app. Este hook:
 * - ao entrar um usuário, carrega as locações salvas dele para a store;
 * - a cada mudança na lista, grava de novo no AsyncStorage;
 * - no logout (ou troca de conta), esvazia a store, para que um usuário
 *   nunca veja as locações de outro.
 */
import { useContext, useEffect } from 'react';

import { AuthContext } from '../../context/Auth/AuthContext';
import { carregarDadosUsuario, salvarDadosUsuario } from '../../services/dadosUsuarioStorage';
import { useLocacaoStore } from './useLocacaoStore';

const TIPO = 'locacoes';

export function useSincronizarLocacoes(): void {
  const usuarioId = useContext(AuthContext)?.usuario?.id ?? null;

  useEffect(() => {
    let ativo = true;
    // Só grava depois de carregar o que já estava salvo, para não sobrescrever.
    let carregado = false;

    useLocacaoStore.setState({ locacoes: [], locacaoSelecionada: null });

    const cancelarInscricao = useLocacaoStore.subscribe((estado, anterior) => {
      if (carregado && usuarioId && estado.locacoes !== anterior.locacoes) {
        salvarDadosUsuario(TIPO, usuarioId, estado.locacoes);
      }
    });

    if (usuarioId) {
      carregarDadosUsuario<unknown[]>(TIPO, usuarioId).then((salvas) => {
        if (!ativo) return;
        // Locações criadas enquanto a leitura acontecia não são perdidas.
        const atuais = useLocacaoStore.getState().locacoes;
        carregado = true;
        useLocacaoStore.setState({ locacoes: [...(salvas ?? []), ...atuais] });
      });
    }

    return () => {
      ativo = false;
      cancelarInscricao();
    };
  }, [usuarioId]);
}

/** Componente sem interface que liga a sincronização dentro do AuthProvider. */
export function SincronizarLocacoes(): null {
  useSincronizarLocacoes();
  return null;
}
