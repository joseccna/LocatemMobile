/**
 * Hook de pagamento: controla estado e navegacao das etapas do checkout.
 */
import { useEffect, useRef } from 'react';
import { usePagamentoStore } from './usePagamentoStore';
import { useCarrinhoStore } from '../../Carrinho/useCarrinhoStore';
import { useLocacaoStore } from '../../Locacoes/useLocacaoStore';
import { calcularResumoAvaliacoes } from '../../../utils/Avaliacao/avaliacoesResumo';
import {
  adicionarDias,
  formatarDataBr,
  formatarDataCurta,
  getHojeIso,
  parseDataIso,
} from '../../../utils/Locacoes/dataLocacao';
import type { ItemCarrinho } from '../../../context/Checkout/Carrinho/CarrinhoContext';
import type { LocacaoData } from '../../../pages/Locacoes/MinhasLocacoes/MinhasLocacoes.types';

const TEMPO_PROCESSAMENTO_MS = 5000;

// Mesma mensagem usada em MinhasLocacoes.mock.ts para locacoes com pagamento
// já confirmado — mantém o texto consistente com o restante da tela "Minhas Locacoes".
const MENSAGEM_PAGAMENTO_CONFIRMADO = 'O pagamento foi confirmado e a entrega está sendo preparada';

/** Converte um valor numerico para exibicao no formato monetario brasileiro. */
function formatarMoeda(valor: number): string {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

/** Valor do aluguel de um item (diária x quantidade x dias). */
function calcularAluguel(item: ItemCarrinho): number {
  const precoDiaria = Number(String(item.produto.price).replace(',', '.')) || 0;
  return precoDiaria * item.quantidade * item.dias;
}

/**
 * Divide o valor pago entre os itens, na proporção do aluguel de cada um.
 * Assim a locação mostra o que de fato foi pago: aluguel + frete, já com o
 * desconto de cupom, se houver. Sem valor pago registrado, usa só o aluguel.
 */
export function dividirValorPago(itens: ItemCarrinho[], valorPago: number): number[] {
  const alugueis = itens.map(calcularAluguel);
  const soma = alugueis.reduce((total, valor) => total + valor, 0);

  if (!(valorPago > 0) || soma <= 0) return alugueis;

  return alugueis.map((aluguel) => (valorPago * aluguel) / soma);
}

// Última hora de início que ainda cabe numa janela de 3h no mesmo dia (até 23:00).
const ULTIMA_HORA_INICIO = 20;

/**
 * Converte um item pago do carrinho em uma LocacaoData, para que ele passe a
 * aparecer em "Minhas Locacoes" assim que o pagamento é aprovado.
 *
 * B01: antes o período era sempre "hoje + dias, na hora atual" (ex.: 09/11
 * das 23:00 às 26:00), ignorando a data e o horário escolhidos em "Detalhes
 * da Locação", e o valor não incluía o frete. Agora usa a entrega escolhida
 * e a parte do item no valor efetivamente pago.
 */
export function montarDadosLocacaoPago(item: ItemCarrinho, valorPagoItem: number): Omit<LocacaoData, 'id'> {
  const entrega = item.entrega;

  // O período pode ter sido alterado no carrinho (+/- dias), então a
  // devolução é sempre a data de entrega mais os dias do item.
  const inicioIso = entrega?.dataEntregaIso || getHojeIso();
  const fimIso = adicionarDias(inicioIso, item.dias);
  const anoFim = parseDataIso(fimIso)?.getFullYear() ?? new Date().getFullYear();

  // Média/quantidade de avaliações sempre calculadas a partir das avaliações
  // reais do produto, nunca de `rating`/`reviewCount` fixos — mesma regra
  // usada em useSolicitarLocacao.ts e ProductScreen.
  const resumoAvaliacoes = calcularResumoAvaliacoes(item.produto.avaliacoes);

  // Item sem horário escolhido usa a hora atual, limitada a 20:00 para a
  // janela de 3 horas nunca passar da meia-noite (o antigo "23:00 às 26:00").
  const horaPadrao = `${String(Math.min(new Date().getHours(), ULTIMA_HORA_INICIO)).padStart(2, '0')}:00`;
  const horaInicio = entrega?.horarioEntrega || horaPadrao;
  const horaFim = entrega?.horarioDevolucao || horaInicio;

  return {
    produto: item.produto.title,
    imagem: item.produto.images[0],
    periodo: `${formatarDataCurta(inicioIso)} – ${formatarDataCurta(fimIso)} ${anoFim}`,
    locador: item.produto.locador,
    status: 'preparandoEntrega',
    mensagemStatus: MENSAGEM_PAGAMENTO_CONFIRMADO,
    categoria: item.produto.categoria,
    avaliacaoLocador: resumoAvaliacoes.media,
    numeroAvaliacoes: resumoAvaliacoes.quantidade,
    localizacao: item.produto.localizacao,
    dataInicio: formatarDataBr(inicioIso),
    horaInicio,
    dataFim: formatarDataBr(fimIso),
    horaFim,
    quantidade: item.quantidade,
    valor: formatarMoeda(valorPagoItem),
  };
}

interface UseProcessandoPagamentoReturn {
  /** false enquanto a tela redireciona por método ausente/inválido (mesma regra usada em Selecionar Cartão/Pix). */
  metodoValido: boolean;
}

/** Registra o resultado do pagamento e cria os dados de locacao correspondentes. */
export function useProcessandoPagamento(navigate: (route: string) => void): UseProcessandoPagamentoReturn {
  // Método de pagamento já deve ter sido escolhido (Carrinho -> Método de Pagamento) antes de chegar aqui — sem ele, não há o que processar.
  const { metodo, valor: valorPago, marcarPagamentoProcessado } = usePagamentoStore();
  const { itens } = useCarrinhoStore();
  const { adicionarLocacao } = useLocacaoStore();
  const metodoValido = metodo !== null;

  // Itens pagos = os que estavam selecionados no carrinho ao continuar para o
  // pagamento. Lido em ref (não em estado) porque só precisa do valor no
  // instante em que o timer de processamento dispara lá embaixo — não deve
  // disparar nenhum re-render nem recriar o timer se o carrinho mudar
  // enquanto esta tela estiver em exibição.
  const itensPagosRef = useRef<ItemCarrinho[]>(itens.filter((item) => item.selecionado));
  // Total pago (aluguel + frete - cupom), lido no mesmo instante que os itens.
  const valorPagoRef = useRef(valorPago);

  // Redireciona caso o método seja ausente/inválido — mesma regra usada em Selecionar Cartão/Pix.
  useEffect(() => {
    if (!metodoValido) {
      navigate('carrinho');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metodoValido]);

  // CORREÇÃO: a locacao/aluguel de cada item pago não era criada em nenhum
  // ponto do fluxo Carrinho -> Pagamento, então a ferramenta paga nunca
  // chegava a existir em "Minhas Locacoes" (a tela só lê do LocacaoContext,
  // via useLocacaoStore). Este é o único lugar do funil onde "pagamento
  // aprovado" é, de fato, decidido — por isso a locacao é criada exatamente
  // aqui, junto com marcarPagamentoProcessado(), e não como efeito colateral
  // da tela de sucesso (PagamentoAprovado é apenas exibição: sua montagem não
  // deveria ser a responsável por gravar dados de negócio).
  useEffect(() => {
    if (!metodoValido) return;

    const timer = setTimeout(() => {
      const itensPagos = itensPagosRef.current;
      const valores = dividirValorPago(itensPagos, valorPagoRef.current);
      itensPagos.forEach((item, indice) => {
        adicionarLocacao(montarDadosLocacaoPago(item, valores[indice]));
      });

      marcarPagamentoProcessado();
      navigate('pagamentoAprovado');
    }, TEMPO_PROCESSAMENTO_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metodoValido]);

  return { metodoValido };
}
