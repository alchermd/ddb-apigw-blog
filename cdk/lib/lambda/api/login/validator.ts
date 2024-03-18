import { z as zod } from 'zod'

export const loginPayloadSchema = zod.object({
  username: zod.string().min(6).max(15),
  password: zod.string().min(6)
})

export type LoginPayload = zod.infer<typeof loginPayloadSchema>
