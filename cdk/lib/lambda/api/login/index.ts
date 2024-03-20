import { type APIGatewayEvent, type APIGatewayProxyResult, type Context } from 'aws-lambda'
import { ZodError } from 'zod'
import { registerPayloadSchema } from '@/lambda/api/register/validator'
import { serverError, success, userError } from '@/lambda/api/response'
import { type LoginPayload } from '@/lambda/api/login/validator'
import data, { authenticate, type User, UserNotFoundError } from '@/lambda/api/data'

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

  let user: User
  try {
    user = await data.getUser(payload.username)
  } catch (e) {
    if (e instanceof UserNotFoundError) {
      return await userError({ error: 'User does not exist.' }, 404)
    }

    return await serverError()
  }

  const authenticated = await authenticate(user, payload.password)

  if (authenticated) {
    const apiKey = await data.createApiKey(user)
    return await success({ token: apiKey }, 201)
  }

  return await userError({ error: 'Invalid credentials.' }, 401)
}
