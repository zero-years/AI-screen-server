import { END, START, StateGraph } from '@langchain/langgraph'
import { State } from './state.js'
import { answerMessage } from './answerMessage.js'

const builder = new StateGraph(State)
  .addNode('answerMessage', answerMessage)
  .addEdge(START, 'answerMessage')
  .addEdge('answerMessage', END)

export const graph = builder.compile()

graph.name = 'Screen Design Agent'
