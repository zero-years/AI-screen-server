import z from 'zod'
import { createChatModel, createNoStreamModel } from '../../ai/model.js'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'

// 操作编码
export const ADD_NODE = 'add_node'
export const UPDATE_NODE = 'update_node'
export const REMOVE_NODE = 'remove_node'

export const ActionSchemaType = z
  .enum([ADD_NODE, UPDATE_NODE, REMOVE_NODE])
  .describe(
    `用户意图的操作类型，${ADD_NODE} = 新增节点，${UPDATE_NODE} = 修改节点，${REMOVE_NODE} = 删除节点`
  )

export const PlanEditSchema = z.object({
  action: ActionSchemaType,
  id: z
    .string()
    .nullable()
    .describe(
      '要操作的节点的唯一标识，比如用户要修改，就是要修改节点的 id,删除节点就是删除节点的 id，新增节点就是 null'
    ),
  type: z.string().describe('要新增的节点类型，比如标题、文本、图表等'),
  prompt: z
    .string()
    .describe('传给节点生成或修改模型的提示词，包括内容、样式和布局要求等'),
})

export async function handlePlanEdit(state) {
  const materials = state.schema.material.map(item => {
    return {
      type: item.type,
      name: item.name,
    }
  })
  const nodes = state.page.nodes

  const model = createNoStreamModel().withStructuredOutput(
    z.object({
      editPlan: z.array(
        PlanEditSchema.extend({
          type: z
            .enum(materials.map(item => item.type))
            .describe('节点的类型，一定是可用物料中的类型'),
        })
      ),
      message: z
        .string()
        .nullable()
        .describe(
          '如果根据用户提示词无法完成要求，或者用户目标不明确，返回空 editPlan，并通过 message 一次问清楚，如果可以完成规划，则 message 返回 null'
        ),
    }),
    {
      name: 'edit_plan',
      method: 'jsonSchema',
    }
  )

  const res = await model.invoke([
    new SystemMessage(`
      请把用户要求整理成按执行顺序排列的 editPlan，每项只处理一个节点。
      add_node 的 id 为 null。
      update_node 和 remove_node 必须复制已有节点的真实 id 和 type。
      每项 prompt 必须能独立说明该节点的内容、样式和布局要求。
      如果根据用户提示词无法完成要求，或者用户目标不明确，返回空 editPlan，并通过 message 一次问清楚，如果可以完成规划，则 message 返回 null

      可用物料：${JSON.stringify(materials, null, 2)}
      已有节点：${JSON.stringify(nodes, null, 2)}
      selectedNodeIds：${JSON.stringify(state.selectedNodeIds, null, 2)}
      画布尺寸：${JSON.stringify(state.page.canvas, null, 2)}
    `),
    ...state.messages,
  ])

  if (res.message) {
    // 无法完成用户的要求
    const chatModel = createChatModel()

    const message = await chatModel.invoke([
      new SystemMessage(`
        你是一个 AI 大屏的信息反馈助手，当前根据已有信息无法完成用户的要求，请让用户提供足够的信息。`),
      new HumanMessage(res.message),
    ])

    return {
      messages: [message],
      editPlan: [],
      actions: [],
    }
  }

  return {
    editPlan: res.editPlan,
  }
}
