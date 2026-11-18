import * as Blockly from 'blockly/core';
import * as builtInEn from 'blockly/msg/en';
import * as builtInEs from 'blockly/msg/es';
import { resources, type SupportedLanguage } from '@ideblock/i18n';

const BUILT_IN: Record<SupportedLanguage, Record<string, string>> = {
  en: builtInEn as unknown as Record<string, string>,
  es: builtInEs as unknown as Record<string, string>,
};

/** Message keys are prefixed so they cannot collide with Blockly's own. */
export const MESSAGE_PREFIX = 'IDEBLOCK_';

export function blockMessages(language: SupportedLanguage): Record<string, string> {
  const own = resources[language].blocks as Record<string, string>;
  const prefixed = Object.fromEntries(
    Object.entries(own).map(([key, value]) => [`${MESSAGE_PREFIX}${key}`, value]),
  );
  return { ...BUILT_IN[language], ...prefixed };
}

/** Must run before blocks are created, since block text is resolved on creation. */
export function applyBlockMessages(language: SupportedLanguage): void {
  Blockly.setLocale(blockMessages(language));
}
