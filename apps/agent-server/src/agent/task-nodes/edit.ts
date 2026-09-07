import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { createNoStreamModel } from '../../ai/model.js'
import z from 'zod'
import { getLastUserMessage } from '../../utils/index.js'

/**
 * 获取新增节点的 shcmea
 * 1. 用户提示词
 * 2. 所有物料的 schema
 * 3. 给 AI 进行选择
 */
async function getMaterialSchema(state) {
  const materialSchemas = state.schema.material
  const materials = materialSchemas.map(m => {
    return {
      type: m.type,
      name: m.name,
    }
  })

  const model = createNoStreamModel().withStructuredOutput(
    z.object({
      type: z
        .enum(materialSchemas.map(schema => schema.type))
        .describe('节点类型'),
    }),
    {
      name: 'material_schema',
      method: 'jsonSchema',
    }
  )

  const res = await model.invoke([
    new SystemMessage(`
      你是一个 AI 大屏设计器的物料选择助手。
      请根据用户的要求，从下面的可用物料中选择最合适的一个。
      可用物料：
      ${JSON.stringify(materials, null, 2)}
    `),
    getLastUserMessage(state.messages),
  ])

  return materialSchemas.find(m => m.type == res.type)
}

async function generateNode(state, materialSchema) {
  const material = z.fromJSONSchema(materialSchema.configSchema) as z.ZodObject

  const model = createNoStreamModel().withStructuredOutput(
    material.extend({
      id: z.literal(crypto.randomUUID()).describe('节点唯一标识'),
    }),
    {
      name: 'material_node',
      method: 'jsonSchema',
    }
  )

  return await model.invoke([
    new SystemMessage(`
      你是一个 AI 大屏设计器的节点生成助手。
      请根据用户要求生成一个完整的 ${materialSchema.name} 节点。
      必须遵守结构化输出 Schema。
      对于可选属性，如果用户没有明确要求，可以留空。
    `),
    getLastUserMessage(state.messages),
  ])
}

export async function handleEditTask(state) {
  if (state.classification?.operation == 'add_node') {
    /**
     * 新增节点
     * 1. 新增节点的 schema
     * 2. 根据提示词，结合 schema 生成节点
     */
    const schema = await getMaterialSchema(state)

    const node = await generateNode(state, schema)

    return {
      action: {
        type: 'add_node',
        node,
      },
      messages: [new AIMessage('我已经完成新增节点的需求')],
    }
  }

  return {
    messages: [new AIMessage('我已经收到修改大屏设计器的需求')],
  }
}
