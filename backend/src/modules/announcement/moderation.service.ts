import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import appConfig from '../../config/app.config';

/** Starter list (spam / fraud phrases). It can be extended with the STOP_WORDS environment variable. */
export const DEFAULT_STOP_WORDS = [
  'casino',
  'crypto giveaway',
  'bitcoin doubling',
  'guaranteed income',
  'earn money fast',
  'loan without refusal',
  'viagra',
  'porn',
  'казино',
  'ставки на спорт',
  'швидкий заробіток',
  'заробіток в інтернеті',
  'гарантований дохід',
  'кредит без відмови',
  'порно',
];

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** SRS 3.2.4.3 step 9: the text is checked against a stop-word list; matches are flagged for moderation. */
@Injectable()
export class ModerationService {
  private readonly patterns: RegExp[];

  constructor(@Inject(appConfig.KEY) config: ConfigType<typeof appConfig>) {
    const words = [...DEFAULT_STOP_WORDS, ...config.extraStopWords].map(
      (word) => word.trim().toLowerCase(),
    );
    this.patterns = words
      .filter(Boolean)
      .map(
        (word) =>
          new RegExp(
            `(?<![\\p{L}\\p{N}])${escapeRegExp(word)}(?![\\p{L}\\p{N}])`,
            'iu',
          ),
      );
  }

  containsStopWord(text: string): boolean {
    return this.patterns.some((pattern) => pattern.test(text));
  }
}
