import { z } from 'zod'
import { createChatModel } from '../ai/model.js'
import { SystemMessage } from '@langchain/core/messages'
import { getLastUserMessage } from '../utils/index.js'

export const ClassificationSchema = z.object({
  task: z
    .enum(['message', 'page', 'edit'])
    .describe(
      '识别用户意图的任务分类，message = 普通问答，page = 创建页面，edit = 修改页面'
    ),
})

// 根据用户输入的内容，进行意图识别分析
export async function classifyTask(state) {
  const message = getLastUserMessage(state.messages)

  const model = createChatModel({
    disableStreaming: true,
  }).withStructuredOutput(ClassificationSchema, {
    name: 'task_classification',
    method: 'jsonSchema',
  })

  const classification = await model.invoke(
    [
      new SystemMessage(`
        你是一个 AI 大屏设计器助手，根据用户提示词进行意图识别。
        分类结果只能是 message、page、edit：
        - message：普通问答，尤其是询问当前页面、节点或数据源事实。
        - page：用户想通过一段描述词，直接生成一个大屏。
        - edit：用户想修改当前页面的某些内容，例如修改画布大小或者修改节点。
      `),
      message,
    ],
    {
      tags: ['nostream'],
    }
  )

  return {
    classification,
  }
}
