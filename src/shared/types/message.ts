export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: MessageContent
  createdAt: string
  updatedAt: string
  parentMessageId?: string
}

export type MessageContent = MessageContentPart[]

export interface MessageContentPart {
  type: ContentType
  text?: string
  image?: ImageContent
  citation?: CitationContent
  toolCall?: ToolCallContent
}

export type ContentType = 'text' | 'image' | 'citation' | 'tool-call'

export interface ImageContent {
  url: string
  alt?: string
  mimeType: string
  size?: number
}

export interface CitationContent {
  filename: string
  fileId: string
  content: string
  similarity: number
  pageNumber?: number
}

export interface ToolCallContent {
  id: string
  name: string
  arguments: Record<string, unknown>
  result?: unknown
}
