import { z as zod } from 'zod'

export const registerPayloadSchema = zod.object({
  username: zod.string().min(6).max(15),
  password: zod.string().min(6)
})

export type RegisterPayload = zod.infer<typeof registerPayloadSchema>
