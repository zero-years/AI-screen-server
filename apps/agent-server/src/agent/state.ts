import { MessagesValue, StateSchema } from '@langchain/langgraph'
import z from 'zod'
import { ClassificationSchema } from './classification.js'
import { ActionSchemaType, PlanEditSchema } from './task-nodes/planEdit.js'

const Action = z.object({
  type: ActionSchemaType,
  node: z.record(z.string(), z.json()),
})

export const State = new StateSchema({
  messages: MessagesValue,
  page: z.record(z.string(), z.json()),
  selectedNodeIds: z.array(z.string()),
  dataSources: z.array(z.record(z.string(), z.json())),
  schema: z.object({
    material: z.array(z.record(z.string(), z.json())),
    canvas: z.record(z.string(), z.json()),
    dataSource: z.record(z.string(), z.json()),
  }),
  classification: ClassificationSchema,
  editPlan: z.array(PlanEditSchema),
  actions: z.array(Action).default([]),
  currentTaskIndex: z.number().default(0),
  taskResults: z.array(Action).default([]),
})
