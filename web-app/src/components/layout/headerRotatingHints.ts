/**
 * Mensagens rotativas no cabeçalho (v1: copy estática, sem APIs externas).
 * Manter frases curtas; evitar dados em tempo real aqui.
 */
export const HEADER_ROTATING_HINTS: readonly string[] = [
  'Estimativa ao pedir; o preço final aparece no fim da viagem.',
  'Em viagem, convém ter rede e bateria suficientes.',
  'Se o mapa ou o estado ficarem parados, verifica a ligação ou recarrega a página.',
  'Dúvidas operacionais: usa o registo de actividade (⚙️) para rever o que a app fez.',
  'Mudança de zona: o «Cheguei» confirma com a posição que o servidor tem — deixa o GPS ligado um pouco antes.',
  'Zona aeroporto (LIS): filas e tempos em tempo real dependem de integrações futuras; por agora segue as regras da operação.',
  'Se o «Cheguei à zona» falhar, verifica se estás dentro da área e se a app já recebeu a tua localização.',
]
