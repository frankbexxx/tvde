/**
 * Mensagens rotativas no cabeçalho:
 * - v1: copy estática abaixo (sem APIs externas no cliente);
 * - v2: `AppHeaderBar` junta isto com GET `/rotacional/messages` (curadoria em `ROTACIONAL_FEED_JSON` no backend).
 * Manter frases curtas; dados meteorológicos / Prociv em tempo real vêm agregados no servidor (ver spec rotacional v2).
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
