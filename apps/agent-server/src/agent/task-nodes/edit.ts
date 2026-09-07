import { AIMessage } from '@langchain/core/messages'

export function handleEditTask() {
  return {
    messages: [new AIMessage('我已经收到修改大屏设计器的需求')],
  }
}
