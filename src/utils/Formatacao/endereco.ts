/**
 * Utilitario puro: converte o endereço do usuário (uma linha só) nos campos
 * do formulário de Editar Perfil e de volta.
 *
 * M02: o formulário abria com CEP e número vazios, mesmo o endereço salvo
 * tendo os dois (ex.: "Av. Sapopemba, 1500, São Paulo, SP · 03988-000"), e
 * obrigava a digitar de novo para salvar qualquer mudança.
 */

export interface CamposEndereco {
  logradouro: string;
  numero: string;
  cep: string;
}

const REGEX_CEP = /(\d{5})-?(\d{3})(?!.*\d{5}-?\d{3})/;

/** Separa "Rua, número, cidade, UF · CEP" em logradouro, número e CEP. */
export function separarEndereco(endereco: string | undefined | null): CamposEndereco {
  let texto = (endereco ?? '').trim();
  let cep = '';

  const achouCep = texto.match(REGEX_CEP);
  if (achouCep && achouCep.index !== undefined) {
    cep = `${achouCep[1]}-${achouCep[2]}`;
    texto = (texto.slice(0, achouCep.index) + texto.slice(achouCep.index + achouCep[0].length))
      // Remove o separador que ficou antes do CEP (" · ", " - CEP: ", etc.).
      .replace(/\s*(?:[-–·]\s*)?(?:CEP:?)?\s*$/i, '')
      .trim();
  }

  const partes = texto.split(',').map((parte) => parte.trim()).filter(Boolean);
  // O número é a primeira parte depois da rua que começa com algarismo.
  const indiceNumero = partes.findIndex((parte, indice) => indice > 0 && /^\d/.test(parte));

  if (indiceNumero === -1) {
    return { logradouro: texto, numero: '', cep };
  }

  return {
    logradouro: [...partes.slice(0, indiceNumero), ...partes.slice(indiceNumero + 1)].join(', '),
    numero: partes[indiceNumero],
    cep,
  };
}

/** Junta os campos no formato "Rua, número, cidade, UF · CEP". */
export function montarEndereco({ logradouro, numero, cep }: CamposEndereco): string {
  const [rua = '', ...resto] = logradouro.split(',').map((parte) => parte.trim()).filter(Boolean);
  const linha = [rua, numero.trim(), ...resto].filter(Boolean).join(', ');
  return cep ? `${linha} · ${cep}` : linha;
}
