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
      responseMessage: z.string().optional().describe('任务执行结果描述'),
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

async function updateNode(state, currentNode, materialSchema) {
  const schema = z.fromJSONSchema(materialSchema.configSchema) as z.ZodObject

  const model = createNoStreamModel().withStructuredOutput(
    schema.extend({
      responseMessage: z.string().optional().describe('任务执行结果描述'),
    }),
    {
      name: 'material_node_update',
      method: 'jsonSchema',
    }
  )

  const res = await model.invoke([
    new SystemMessage(`
      你是一个 AI 大屏设计器的节点修改助手。
      当前选中的节点是 ${materialSchema.name}，请根据用户的要求修改该节点。
      必须遵守结构化输出 Schema。
      对于可选属性，如果用户没有明确要求，可以留空。

      - 规则:
        1. 只能修改当前节点的 props、layout、style 等属性。
        2. 禁止修改节点的 id、type 等属性。

      当前节点的内容：

      ${JSON.stringify(currentNode, null, 2)}
    `),
    getLastUserMessage(state.messages),
  ])

  return {
    ...res,
    id: currentNode.id,
    type: currentNode.type,
  }
}

export async function handleEditTask(state) {
  if (state.classification?.operation == 'add_node') {
    /**
     * 新增节点
     * 1. 新增节点的 schema
     * 2. 根据提示词，结合 schema 生成节点
     */
    const schema = await getMaterialSchema(state)

    const { responseMessage, ...node } = await generateNode(state, schema)

    return {
      action: {
        type: 'add_node',
        node,
      },
      messages: [new AIMessage(responseMessage || '我已经完成新增节点的需求')],
    }
  } else if (state.classification?.operation == 'update_node') {
    /**
     * 修改节点
     * 1. 获取当前选中的节点
     * 2. 获取当前选中节点的 schema
     * 3. 根据提示词，结合 schema 修改节点
     */
    const selectedId = state.selectedNodeIds[0]

    if (!selectedId) {
      return {
        messages: [
          new AIMessage('当前没有选中任何节点，请先选中一个节点再进行修改'),
        ],
      }
    }

    const currentNode = state.page.nodes.find(n => n.id === selectedId)

    const schema = state.schema.material.find(m => m.type === currentNode.type)

    //@ts-ignore
    const { responseMessage, ...node } = await updateNode(
      state,
      currentNode,
      schema
    )

    return {
      messages: [new AIMessage(responseMessage || '我已经完成修改节点的需求')],
      action: {
        type: 'update_node',
        node,
      },
    }
  }

  return {
    messages: [new AIMessage('我已经收到修改大屏设计器的需求')],
  }
}
