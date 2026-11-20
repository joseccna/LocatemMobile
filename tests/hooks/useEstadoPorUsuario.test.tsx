/** Cenarios cobertos pelos testes de useEstadoPorUsuario (correção do B02 e do B03). */
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { act, renderHook } from '../testUtils/renderHook';
import { AuthContext } from '../../src/context/Auth/AuthContext';
import { useEstadoPorUsuario } from '../../src/hooks/useEstadoPorUsuario';

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

const vazio = (): number[] => [];

beforeEach(async () => {
  usuarioAtual = null;
  await AsyncStorage.clear();
});

describe('useEstadoPorUsuario', () => {
  it('grava as alterações do usuário logado no aparelho', async () => {
    usuarioAtual = { id: 'u-maria' };
    const { result } = montar(() => useEstadoPorUsuario('favoritos', vazio));
    await esperar();

    act(() => result.current![1]([7]));
    await esperar();

    expect(await AsyncStorage.getItem('@locatemMobile:favoritos:u-maria')).toBe('[7]');
  });

  it('recupera os dados salvos quando o app é aberto de novo', async () => {
    await AsyncStorage.setItem('@locatemMobile:favoritos:u-maria', '[3,5]');
    usuarioAtual = { id: 'u-maria' };

    const { result } = montar(() => useEstadoPorUsuario('favoritos', vazio));
    await esperar();

    expect(result.current![0]).toEqual([3, 5]);
  });

  it('não mostra os dados de um usuário para outro', async () => {
    await AsyncStorage.setItem('@locatemMobile:favoritos:u-joao', '[1,2]');
    usuarioAtual = { id: 'u-joao' };
    const { result, rerender } = montar(() => useEstadoPorUsuario('favoritos', vazio));
    await esperar();
    expect(result.current![0]).toEqual([1, 2]);

    usuarioAtual = { id: 'u-maria' };
    rerender();
    await esperar();

    expect(result.current![0]).toEqual([]);
  });

  it('volta ao valor inicial no logout, sem apagar o que estava salvo', async () => {
    await AsyncStorage.setItem('@locatemMobile:favoritos:u-maria', '[9]');
    usuarioAtual = { id: 'u-maria' };
    const { result, rerender } = montar(() => useEstadoPorUsuario('favoritos', vazio));
    await esperar();

    usuarioAtual = null;
    rerender();
    await esperar();

    expect(result.current![0]).toEqual([]);
    expect(await AsyncStorage.getItem('@locatemMobile:favoritos:u-maria')).toBe('[9]');
  });
});
