import { type APIGatewayEvent, type APIGatewayProxyResult, type Context } from 'aws-lambda'
import data from '@/lambda/api/data'
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'
import { ZodError } from 'zod'
import { type RegisterPayload, registerPayloadSchema } from '@/lambda/api/register/validator'
import { serverError, success, userError } from '@/lambda/api/response'

export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
  const unsafePayload: RegisterPayload = JSON.parse(String(event.body))

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

  let user
  try {
    user = await data.createUser(payload.username, payload.password)
  } catch (e) {
    console.log(e)

    if (e instanceof ConditionalCheckFailedException) {
      const error = {
        username: {
          _errors: ['Username is already taken']
        }
      }

      return await userError(error)
    }

    return await serverError()
  }

  console.log(`User <${user.username}> has been successfully registered.`)
  return await success('Registration successful', 201)
}
