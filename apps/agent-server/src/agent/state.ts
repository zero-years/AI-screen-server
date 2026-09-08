import { MessagesValue, StateSchema } from '@langchain/langgraph'
import z from 'zod'
import { ClassificationSchema } from './classification.js'

export const toolList = ['add_node', 'update_node'] as const

export const State = new StateSchema({
  messages: MessagesValue,
  page: z.record(z.string(), z.json()),
  selectedNodeIds: z.array(z.string()),
  schema: z.object({
    material: z.array(z.record(z.string(), z.json())),
    canvas: z.record(z.string(), z.json()),
  }),
  classification: ClassificationSchema,
  action: z
    .object({
      type: z.enum(toolList),
      node: z.record(z.string(), z.json()),
    })
    .nullable()
    .default(null),
})
