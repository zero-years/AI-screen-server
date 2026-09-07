import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { createChatModel } from '../../ai/model.js'

export const handleMessageTask = async state => {
  const model = createChatModel()

  const { page, selectedNodeIds, messages, schema } = state

  const { nodes, canvas } = page
  const { material, canvas: canvasSchema } = schema

  const _messages = [...messages]
  const lastMessage = _messages.pop()

  const result = await model.invoke([
    new SystemMessage('你是一个 AI 大屏设计助手，你需要帮助用户设计可视化大屏'),
    ..._messages,
    new HumanMessage(`
      用户问题: ${lastMessage.text}
      
      当前大屏设计器的状态:
       ${JSON.stringify({ nodes, canvas, selectedNodeIds }, null, 2)}
    
      其中:
      - nodes: 当前大屏设计器中所以的节点信息，包含每个节点的 id、类型、位置、大小、属性等信息
      - canvas: 当前大屏设计器的画布信息，包含画布的宽高、背景色等信息
      - selectedNodeIds: 当前大屏设计器中被选中的节点 id 数组  

      设计器的 canvas 画布 schema 定义:
      ${JSON.stringify(canvasSchema, null, 2)}

      设计器的所有可用 material 物料 schema 定义:
      ${JSON.stringify(material, null, 2)}
    `),
  ])
  return {
    messages: [result],
  }
}
