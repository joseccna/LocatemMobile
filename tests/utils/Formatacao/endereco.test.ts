/** Cenarios cobertos pelos testes de endereco (melhoria M02). */
import { montarEndereco, separarEndereco } from '../../../src/utils/Formatacao/endereco';

describe('separarEndereco', () => {
  it('separa rua, número, cidade e CEP do endereço do perfil', () => {
    expect(separarEndereco('Av. Sapopemba, 1500, São Paulo, SP · 03988-000')).toEqual({
      logradouro: 'Av. Sapopemba, São Paulo, SP',
      numero: '1500',
      cep: '03988-000',
    });
  });

  it('mantém o complemento junto com o número', () => {
    expect(separarEndereco('Rua das Acácias, 247 – Apto 32, São Paulo, SP · 01310-100')).toEqual({
      logradouro: 'Rua das Acácias, São Paulo, SP',
      numero: '247 – Apto 32',
      cep: '01310-100',
    });
  });

  it('entende o formato antigo "rua, número - CEP: 00000-000"', () => {
    expect(separarEndereco('Rua A, 100 - CEP: 01310-100')).toEqual({
      logradouro: 'Rua A',
      numero: '100',
      cep: '01310-100',
    });
  });

  it('deixa número e CEP vazios quando o endereço não tem', () => {
    expect(separarEndereco('Rua sem número')).toEqual({ logradouro: 'Rua sem número', numero: '', cep: '' });
    expect(separarEndereco(undefined)).toEqual({ logradouro: '', numero: '', cep: '' });
  });
});

describe('montarEndereco', () => {
  it('volta ao mesmo texto depois de separar (editar e salvar sem mudar nada)', () => {
    const original = 'Av. Sapopemba, 1500, São Paulo, SP · 03988-000';
    expect(montarEndereco(separarEndereco(original))).toBe(original);
  });

  it('monta o endereço com o número logo depois da rua', () => {
    expect(montarEndereco({ logradouro: 'Rua A, Santos, SP', numero: '10', cep: '11000-000' })).toBe(
      'Rua A, 10, Santos, SP · 11000-000',
    );
  });
});
