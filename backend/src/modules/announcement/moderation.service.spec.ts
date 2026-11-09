import { loadAppConfig } from '../../config/app.config';
import { ModerationService } from './moderation.service';

describe('ModerationService', () => {
  const service = new ModerationService(
    loadAppConfig({ STOP_WORDS: 'a+b, , customword' }),
  );
  it.each([
    'CASINO!',
    'казино',
    'Get guaranteed income today',
    'a+b',
    'customword',
  ])('flags a complete forbidden phrase: %s', (text) => {
    expect(service.containsStopWord(text)).toBe(true);
  });
  it.each([
    'casinology',
    'aaaab',
    'a customwording',
    '',
    'Need food for a family',
  ])(
    'does not match substrings or treat configured words as regex: %s',
    (text) => {
      expect(service.containsStopWord(text)).toBe(false);
    },
  );
});
