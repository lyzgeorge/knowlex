import { runAgent } from '../agent-runner'
import type { CoreMessage } from 'ai'
import { z } from 'zod'

// Smart Notes definition (inlined)
export const SMART_NOTES_SYSTEM_PROMPT = `
你是一个专业的文档分析助手。请分析提供的文档内容，提取关键信息并按照指定格式返回。

输入格式：每行内容已封装为 <行号>内容</行号> 的形式，例如 <1>第一行</1>。注意：内容中原始的 < 和 > 已被转义为 &lt; 和 &gt;，请不要反转义或修改内容。

分析要求：
1. 一句话总结：用一句话概括文档的核心内容或目的
2. 摘要描述：参考 5W1H 或 IRAC 原则，用自然语言描述，可以是一段或者多段落，但不超过 2000 个中文字/英文词
3. 关键词：提取类别、属性、标签、主题、核心概念
4. 语义分段（chunks）：仅基于行号，将相邻且语义连贯的行分为若干组；每组尽量保持在约 1000~1500 token。chunks 即表达文档的结构性信息。
   - 返回 JSON 数组：[{"id": number, "lines": number[]}]，其中 lines 为该组包含的行号。
   - 请不要改写或合并行内容，也不要推断未提供的行。

请严格按照 JSON schema 返回，仅输出一个 JSON 对象，示例如下：
{
  "summary": "xxxx",
  "abstract": "完整摘要描述",
  "keywords": ["关键词1", "关键词2", "关键词3"]
  "chunks": [
    { "id": 1, "lines": [1, 2, 3] },
    { "id": 2, "lines": [4, 5] }
  ]
}
`

export const SmartNotesSchema = z.object({
  summary: z.string().max(2000),
  abstract: z.string().max(20000),
  keywords: z.array(z.string().min(1).max(64)).max(32),
  chunks: z.array(
    z.object({
      id: z.number().int().positive(),
      lines: z.array(z.number().int().positive()).min(1)
    })
  )
})

export type SmartNotesObject = z.infer<typeof SmartNotesSchema>

function buildUserPrompt(content: string, previous?: SmartNotesObject) {
  if (!previous) return content
  return (
    `现有的分析结果：\n` +
    `- 一句话总结：${previous.summary}\n` +
    `- 摘要描述：${previous.abstract}\n` +
    `- 关键词：${previous.keywords.join(', ')}\n` +
    `- 已有分段：${JSON.stringify(previous.chunks)}\n` +
    `\n请基于上述已有结果，阅读以下新的内容块并更新：\n\n` +
    content
  )
}

export async function generateSmartNotes(
  content: string,
  previous?: SmartNotesObject
): Promise<SmartNotesObject> {
  console.log('[SmartNotesAgent] generateSmartNotes: start', {
    hasPrevious: Boolean(previous),
    contentLength: content.length
  })
  const messages: CoreMessage[] = [{ role: 'user', content: buildUserPrompt(content, previous) }]
  try {
    const { object } = await runAgent<SmartNotesObject>({
      system: SMART_NOTES_SYSTEM_PROMPT,
      messages,
      schema: SmartNotesSchema
    })
    console.log('[SmartNotesAgent] generateSmartNotes: success', {
      keywords: object.keywords?.length ?? 0,
      chunks: object.chunks?.length ?? 0
    })
    return object
  } catch (err: any) {
    console.error('[SmartNotesAgent] generateSmartNotes: error', err?.message || err)
    throw err
  }
}
