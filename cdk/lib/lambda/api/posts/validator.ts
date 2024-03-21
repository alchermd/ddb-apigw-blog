import { z as zod } from 'zod'

export const createPostPayloadSchema = zod.object({
  title: zod.string().min(6).max(64),
  body: zod.string().min(30).max(2048),
  slug: zod.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be a valid slug.')
})

export type CreatePostPayload = zod.infer<typeof createPostPayloadSchema>
