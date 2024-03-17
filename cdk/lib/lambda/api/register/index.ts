import { type APIGatewayEvent, type APIGatewayProxyResult, type Context } from 'aws-lambda'
import data from '../data'
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'

interface RegisterPayload {
  username: string
  password: string
}

export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
  const payload: RegisterPayload = JSON.parse(String(event.body))
  let response
  try {
    response = await data.createUser(payload.username, payload.password)
  } catch (e) {
    console.log(e)
    if (e instanceof ConditionalCheckFailedException) {
      return {
        statusCode: 422,
        body: JSON.stringify({
          error: 'Username is already taken.'
        })
      }
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: response
    })
  }
}
