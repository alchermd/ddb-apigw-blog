import { type APIGatewayEvent, type APIGatewayProxyResult, type Context } from 'aws-lambda'
import { ZodError } from 'zod'
import { registerPayloadSchema } from '@/lambda/api/register/validator'
import { serverError, success, userError } from '@/lambda/api/response'
import { type LoginPayload } from '@/lambda/api/login/validator'
import data, { authenticate } from '@/lambda/api/data'

export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
  const unsafePayload: LoginPayload = JSON.parse(String(event.body))

  let payload
  try {
    payload = registerPayloadSchema.parse(unsafePayload)
  } catch (e) {
    console.log(e)

    if (e instanceof ZodError) {
      return await userError(e.format())
    }

    return await serverError()
  }

  const user = await data.getUser(payload.username)

  const authenticated = await authenticate(user, payload.password)

  return await success(`Authenticated: ${authenticated}`, 201)
}
