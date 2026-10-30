import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'
import { decodeHTML } from 'entities'
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import { createEmbeddingModel } from '../ai/model.ts'
import { writeKnowledgeDatabase } from '../rag/database.ts'

const ECHART_DOCUMENT_DIR = fileURLToPath(
  new URL('../../resources/echarts', import.meta.url)
)

const fileNames = await readdir(ECHART_DOCUMENT_DIR)
const chunks = []

for (const fileName of fileNames) {
  const ducument = JSON.parse(
    await readFile(join(ECHART_DOCUMENT_DIR, fileName), 'utf-8')
  )

  const pathPrefix = fileName
    .replace(/^option\./, '')
    .replace(/\.json$/, '')
    .replaceAll('-', '.')

  const ducumentChunk = buildChunks(ducument, pathPrefix)
  chunks.push(...ducumentChunk)
}

const embeddings = createEmbeddingModel()
const vectors: number[][] = []

for (let start = 0; start < chunks.length; start += 10) {
  const batch = chunks.slice(start, start + 10)
  const texts = batch.map(
    chunk => `ECharts 配置 ${chunk.path}\n${chunk.description}`
  )
  vectors.push(...(await embeddings.embedDocuments(texts)))
}

writeKnowledgeDatabase(chunks, vectors)

function cleanDescription(html: string) {
  return (
    decodeHTML(
      html
        // script、style、iframe 的内部文本不是配置说明，整体删除。
        .replace(/<(script|style|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
        // 段落、列表和代码块结束时保留换行，避免文字全部粘在一起。
        .replace(/<br\s*\/?\s*>|<\/(?:p|div|li|pre|h[1-6])>/gi, '\n')
        // 给列表项补上短横线，使纯文本仍能看出列表结构。
        .replace(/<li\b[^>]*>/gi, '- ')
        // 最后删除剩余 HTML 标签。
        .replace(/<[^>]*>/g, '')
    )
      // decodeHTML 已还原 &lt;、&#39; 等实体，接着统一空格和连续空行。
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n\n')
      .trim()
  )
}

function buildChunks(document, pathPrefix) {
  const chunks = []

  for (const [key, entire] of Object.entries(document)) {
    const value: any = entire
    const description = cleanDescription(value.desc)
    const path = `${pathPrefix}.${key}`

    chunks.push({
      id: randomUUID(),
      path,
      description,
    })
  }

  return chunks
}
