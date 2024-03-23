import { z as zod } from 'zod'

export const createCommentPayloadSchema = zod.object({
  body: zod.string().min(5).max(64)
})

export type CreateCommentPayload = zod.infer<typeof createCommentPayloadSchema>
