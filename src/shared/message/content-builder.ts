import type { MessageContent, MessageContentPart } from '@shared/types/message'

/**
 * Neutral file descriptor used by the UI to pass processed files into the builder.
 */
export interface BuilderFile {
  filename: string
  content: string
  size: number
  mimeType: string
  isImage?: boolean
}

/**
 * Build a MessageContent from a user-provided text and an array of processed files.
 * Keeps message part shapes consistent across renderer and main process.
 */
export function fromUserInput(input: { text?: string; files?: BuilderFile[] }): MessageContent {
  const parts: MessageContent = []
  const text = (input.text || '').trim()
  if (text) {
    parts.push({ type: 'text', text })
  }

  ;(input.files || []).forEach((file) => {
    if (file.isImage) {
      parts.push({
        type: 'image',
        image: {
          image: file.content,
          mediaType: file.mimeType,
          filename: file.filename
        }
      })
    } else {
      parts.push({
        type: 'attachment',
        attachment: {
          filename: file.filename,
          content: file.content,
          size: file.size,
          mimeType: file.mimeType
        }
      })
    }
  })

  return parts
}

/**
 * Normalize an arbitrary array of partial parts into valid MessageContentPart[]
 * - removes empty text parts
 * - ensures shapes for image/attachment
 */
export function normalizeParts(parts: Partial<MessageContentPart>[]): MessageContentPart[] {
  const out: MessageContentPart[] = []
  parts.forEach((p) => {
    if (!p || !p.type) return
    if (p.type === 'text') {
      const t = (p.text || '').trim()
      if (t) out.push({ type: 'text', text: t })
    } else if (p.type === 'image' && p.image) {
      out.push({ type: 'image', image: p.image })
    } else if (p.type === 'attachment' && p.attachment) {
      out.push({ type: 'attachment', attachment: p.attachment })
    } else if (p.type === 'citation' && p.citation) {
      out.push({ type: 'citation', citation: p.citation })
    } else if (p.type === 'tool-call' && p.toolCall) {
      out.push({ type: 'tool-call', toolCall: p.toolCall })
    }
  })
  return out
}

export default {
  fromUserInput,
  normalizeParts
}
