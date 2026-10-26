export type Table = 'A' | 'B' | 'C' | 'D';
export type Coefficient = { table: Table; cargo: string; axles: number; ccd: number; cc: number };
export type ChangeKind = 'baseline' | 'increase' | 'decrease' | 'mixed' | 'publication' | 'methodology' | 'rectification';
export type Version = {
  id: string; actId: string; title: string; sourceUrl: string; publishedAt: string;
  effectiveAt: string; detectedAt: string; methodology: string;
  rows: Coefficient[]; coefficientsHash: string; contentHash: string; evidenceHash: string;
  kind: ChangeKind;
  simulationValidated?: { checkedAt:string; methodHash:string; samples:number };
};
export type Pending = { id: string; title: string; url: string; reason: string; detectedAt: string; hash?: string };
export type SourceResult = { name: string; url: string; ok: boolean; checkedAt: string; hash?: string; error?: string };
export type SyncRun = { id: string; startedAt: string; finishedAt: string; trigger: string; status: 'success' | 'partial' | 'failed'; sources: SourceResult[]; added: number; pending: number };
export type State = {
  schema: 1; versions: Version[]; pending: Pending[]; runs: SyncRun[];
  lastAttempt?: string; lastSuccess?: string; lastAutomatic?: string;
  lock?: { owner: string; until: string }; methodHash?: string;
};
export const emptyState = (): State => ({ schema: 1, versions: [], pending: [], runs: [] });
export const TABLE_LABELS: Record<Table,string> = {
  A: 'A · Composição veicular', B: 'B · Unidade de tração',
  C: 'C · Composição / alto desempenho', D: 'D · Tração / alto desempenho',
};
export const keyOf = (r: Pick<Coefficient,'table'|'cargo'|'axles'>) => `${r.table}|${r.cargo.toLocaleLowerCase('pt-BR')}|${r.axles}`;
