import { resources, SUPPORTED_LANGUAGES } from '@ideblock/i18n';
import { describe, expect, it } from 'vitest';
import { EXPLANATION_KEYS, UPLOAD_HELP_KEYS } from '../src';

describe('compiler explanations', () => {
  for (const language of SUPPORTED_LANGUAGES) {
    it(`are translated to ${language}`, () => {
      const help = resources[language].common.compilerHelp as Record<string, string>;
      for (const key of EXPLANATION_KEYS) {
        expect(help[key], key).toBeTruthy();
      }
    });
  }
});

describe('upload explanations', () => {
  for (const language of SUPPORTED_LANGUAGES) {
    it(`are translated to ${language}`, () => {
      const help = resources[language].common.uploadHelp as Record<string, string>;
      for (const key of UPLOAD_HELP_KEYS) {
        expect(help[key], key).toBeTruthy();
      }
    });
  }
});
