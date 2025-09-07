import { TEXT_CONSTANTS } from '@shared/constants/text'

export function ensurePlaceholder(text?: string | null): string {
  const t = text ?? ''
  return t.trim().length === 0 ? TEXT_CONSTANTS.ZERO_WIDTH_SPACE : t
}

export function stripPlaceholder(text?: string | null): string {
  if (!text) return ''
  return text.replace(new RegExp(TEXT_CONSTANTS.ZERO_WIDTH_SPACE, 'g'), '')
}

export default { ensurePlaceholder, stripPlaceholder }
