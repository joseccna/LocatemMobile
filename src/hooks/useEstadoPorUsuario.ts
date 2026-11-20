/**
 * Hook de estado que pertence ao usuário logado e fica salvo no aparelho.
 *
 * Funciona como um `useState`, com duas diferenças:
 * - quando um usuário entra, o valor salvo dele é carregado do AsyncStorage
 *   (ou o valor inicial, se ele ainda não tiver nada salvo);
 * - toda alteração é gravada de novo, então os dados continuam lá depois de
 *   fechar e abrir o app.
 * Quando ninguém está logado (ou na troca de conta), o estado volta ao valor
 * inicial, para que um usuário nunca veja os dados do anterior.
 */
import { useContext, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { AuthContext } from '../context/Auth/AuthContext';
import { carregarDadosUsuario, salvarDadosUsuario } from '../services/dadosUsuarioStorage';

export function useEstadoPorUsuario<T>(
  tipo: string,
  valorInicial: () => T,
): [T, Dispatch<SetStateAction<T>>] {
  // useContext direto (e não useAuth) para o provider continuar funcionando
  // fora do AuthProvider, como nos testes isolados: nesse caso não há usuário.
  const usuarioId = useContext(AuthContext)?.usuario?.id ?? null;
  const [estado, setEstado] = useState<T>(valorInicial);

  // Id cujo valor salvo já foi carregado. Só depois disso as alterações são
  // gravadas, para não sobrescrever o que está salvo com o valor inicial.
  const idCarregado = useRef<string | null>(null);

  useEffect(() => {
    let ativo = true;
    idCarregado.current = null;

    if (!usuarioId) {
      setEstado(valorInicial());
      return;
    }

    carregarDadosUsuario<T>(tipo, usuarioId).then((salvo) => {
      if (!ativo) return;
      idCarregado.current = usuarioId;
      setEstado(salvo ?? valorInicial());
    });

    return () => {
      ativo = false;
    };
    // valorInicial é uma fábrica fixa de cada provider; não precisa disparar o efeito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, usuarioId]);

  useEffect(() => {
    if (usuarioId && idCarregado.current === usuarioId) {
      salvarDadosUsuario(tipo, usuarioId, estado);
    }
  }, [tipo, usuarioId, estado]);

  return [estado, setEstado];
}
