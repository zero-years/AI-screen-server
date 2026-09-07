import { AIMessage } from '@langchain/core/messages'

export function handlePageTask() {
  return {
    messages: [new AIMessage('我已经收到你要使用一句话生成一个大屏的需求')],
  }
}
