import type { IEntry } from '@/resources/entry/models/Entry';
import type { EPostingScene } from '../enums/PostingScene';

/** Uma operação gravada no livro-razão: uma ou mais partidas encadeadas. */
export interface IPosting {
  id: string;
  scene: EPostingScene;
  memo: string;
  entries: IEntry[];
}
