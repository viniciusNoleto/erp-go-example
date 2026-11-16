/**
 * A fase do lançamento no TigerBeetle (`phase` e `resolved`):
 * comum, reserva (primeira fase), efetivação ou cancelamento da reserva.
 */
export enum EEntryPhase {
  SINGLE = 'single',
  PENDING = 'pending',
  POST = 'post',
  VOID = 'void',
}
