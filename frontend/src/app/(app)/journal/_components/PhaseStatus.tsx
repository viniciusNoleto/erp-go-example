import { UtilsIf } from '@/components/utils/If';
import { UtilsStatus } from '@/components/utils/Status';
import { EEntryPhase } from '@/resources/entry/enums/EntryPhase';
import type { IEntry } from '@/resources/entry/models/Entry';

/** A situação de um lançamento em duas fases. Lançamento comum não leva selo. */
export function JournalPhaseStatus({ entry }: { entry: IEntry }) {
  const pending = entry.phase === EEntryPhase.PENDING;

  return (
    <UtilsIf
      cases={[
        {
          condition: pending && entry.resolved === EEntryPhase.POST,
          content: () => (
            <UtilsStatus tone="off">
              Reserva confirmada
            </UtilsStatus>
          ),
        },
        {
          condition: pending && entry.resolved === EEntryPhase.VOID,
          content: () => (
            <UtilsStatus tone="off">
              Reserva cancelada
            </UtilsStatus>
          ),
        },
        {
          condition: pending,
          content: () => (
            <UtilsStatus tone="wait">
              Reservado
            </UtilsStatus>
          ),
        },
        {
          condition: entry.phase === EEntryPhase.POST,
          content: () => (
            <UtilsStatus tone="ok">
              Efetivado
            </UtilsStatus>
          ),
        },
        {
          condition: entry.phase === EEntryPhase.VOID,
          content: () => (
            <UtilsStatus tone="off">
              Cancelado
            </UtilsStatus>
          ),
        },
      ]}
    />
  );
}
