import { END, START, StateGraph } from '@langchain/langgraph'
import { State } from './state.js'
import {
  handleEditTask,
  handleMessageTask,
  handlePageTask,
  handleEditResult,
  handlePlanEdit,
  handleDataSourceTask,
} from './task-nodes/index.js'
import { classifyTask } from './classification.js'
import { ADD_DATA_SOURCE, UPDATE_DATA_SOURCE } from './task-nodes/planEdit.ts'

function routeTask(state) {
  if (state.editPlan.length === 0) {
    return END
  }

  const task = state.editPlan[state.currentTaskIndex]
  if (!task) {
    return 'handleEditResult'
  }

  if ([ADD_DATA_SOURCE, UPDATE_DATA_SOURCE].includes(task.action)) {
    return 'handleDataSourceTask'
  }
  return 'handleEditTask'
}

const builder = new StateGraph(State)
  .addNode('classifyTask', classifyTask)
  .addNode('handleMessageTask', handleMessageTask)
  .addNode('handleEditResult', handleEditResult)
  .addNode('handlePageTask', handlePageTask)
  .addNode('handleEditTask', handleEditTask)
  .addNode('handlePlanEdit', handlePlanEdit)
  .addNode('handleDataSourceTask', handleDataSourceTask)
  .addEdge(START, 'classifyTask')
  .addConditionalEdges('classifyTask', state => state.classification.task, {
    message: 'handleMessageTask',
    page: 'handlePageTask',
    edit: 'handlePlanEdit',
  })
  .addConditionalEdges('handlePlanEdit', routeTask)
  .addConditionalEdges('handleDataSourceTask', routeTask)
  .addConditionalEdges('handleEditTask', routeTask)
  .addEdge('handleMessageTask', END)
  .addEdge('handlePageTask', END)
  .addEdge('handleEditResult', END)

export const graph = builder.compile()

graph.name = 'Screen Design Agent'
