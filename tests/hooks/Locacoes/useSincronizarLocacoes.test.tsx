/** Cenarios cobertos pelos testes de useSincronizarLocacoes (correção do B02). */
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { act, renderHook } from '../../testUtils/renderHook';
import { AuthContext } from '../../../src/context/Auth/AuthContext';
import { useLocacaoStore } from '../../../src/hooks/Locacoes/useLocacaoStore';
import { useSincronizarLocacoes } from '../../../src/hooks/Locacoes/useSincronizarLocacoes';

let usuarioAtual: { id: string } | null = null;
let desmontar: Array<() => void> = [];

/** Renderiza o hook e registra a desmontagem para o fim do teste. */
function montar<T>(callback: () => T) {
  const r = renderHook(callback, { wrapper: AuthFalso });
  desmontar.push(r.unmount);
  return r;
}

afterEach(() => {
  desmontar.forEach((fn) => fn());
  desmontar = [];
});

/** Simula o AuthProvider com o usuário definido em `usuarioAtual`. */
function AuthFalso({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={{ usuario: usuarioAtual, isAuthenticated: !!usuarioAtual } as any}>
      {children}
    </AuthContext.Provider>
  );
}

/** Espera as leituras e gravações assíncronas do AsyncStorage terminarem. */
async function esperar() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(async () => {
  usuarioAtual = null;
  await AsyncStorage.clear();
  useLocacaoStore.setState({ locacoes: [], locacaoSelecionada: null });
});

describe('useSincronizarLocacoes', () => {
  it('grava no aparelho a locação criada pelo usuário logado', async () => {
    usuarioAtual = { id: 'u-maria' };
    montar(() => useSincronizarLocacoes());
    await esperar();

    act(() => {
      useLocacaoStore.getState().adicionarLocacao({ produto: 'Aparador' });
    });
    await esperar();

    const salvo = JSON.parse((await AsyncStorage.getItem('@locatemMobile:locacoes:u-maria')) ?? '[]');
    expect(salvo).toHaveLength(1);
    expect(salvo[0].produto).toBe('Aparador');
  });

  it('recupera as locações salvas quando o app é aberto de novo', async () => {
    await AsyncStorage.setItem('@locatemMobile:locacoes:u-maria', JSON.stringify([{ id: 'a', produto: 'Serra' }]));
    usuarioAtual = { id: 'u-maria' };

    montar(() => useSincronizarLocacoes());
    await esperar();

    expect(useLocacaoStore.getState().locacoes).toEqual([{ id: 'a', produto: 'Serra' }]);
  });

  it('esvazia a lista no logout e não mostra locações de outro usuário', async () => {
    await AsyncStorage.setItem('@locatemMobile:locacoes:u-joao', JSON.stringify([{ id: 'j', produto: 'Furadeira' }]));
    usuarioAtual = { id: 'u-joao' };
    const { rerender } = montar(() => useSincronizarLocacoes());
    await esperar();
    expect(useLocacaoStore.getState().locacoes).toHaveLength(1);

    usuarioAtual = null;
    rerender();
    await esperar();
    expect(useLocacaoStore.getState().locacoes).toHaveLength(0);

    usuarioAtual = { id: 'u-maria' };
    rerender();
    await esperar();
    expect(useLocacaoStore.getState().locacoes).toHaveLength(0);
  });
});
