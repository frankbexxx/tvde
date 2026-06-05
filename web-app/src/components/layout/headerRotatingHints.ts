/**
 * Mensagens rotativas no cabeçalho:
 * - v1: chaves i18n em common.headerHints (sem APIs externas no cliente);
 * - v2: `AppHeaderBar` junta isto com GET `/rotacional/messages` (curadoria em `ROTACIONAL_FEED_JSON` no backend).
 * Manter frases curtas; dados meteorológicos / Prociv em tempo real vêm agregados no servidor (ver spec rotacional v2).
 */
export const HEADER_ROTATING_HINT_KEYS = [
  'headerHints.tripEstimate',
  'headerHints.tripNetworkBattery',
  'headerHints.staleMapState',
  'headerHints.activityLog',
  'headerHints.zoneArrived',
  'headerHints.airportLis',
  'headerHints.zoneArrivedFailed',
] as const
