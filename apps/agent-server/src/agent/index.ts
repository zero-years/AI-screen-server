import { END, START, StateGraph } from '@langchain/langgraph'
import { State } from './state.js'
import {
  handleEditTask,
  handleMessageTask,
  handlePageTask,
} from './task-nodes/index.js'
import { classifyTask } from './classification.js'

const builder = new StateGraph(State)
  .addNode('classifyTask', classifyTask)
  .addNode('handleMessageTask', handleMessageTask)
  .addNode('handlePageTask', handlePageTask)
  .addNode('handleEditTask', handleEditTask)
  .addEdge(START, 'classifyTask')
  .addConditionalEdges('classifyTask', state => state.classification.task, {
    message: 'handleMessageTask',
    page: 'handlePageTask',
    edit: 'handleEditTask',
  })
  .addEdge('handleMessageTask', END)
  .addEdge('handlePageTask', END)
  .addEdge('handleEditTask', END)

export const graph = builder.compile()

graph.name = 'Screen Design Agent'
