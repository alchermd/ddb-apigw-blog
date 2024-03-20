import type { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { success, userError } from '@/lambda/api/response'
import data from '@/lambda/api/data'

export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
  if (event.headers.Authorization === undefined) {
    return await userError({ error: 'Unauthorized' }, 401)
  }

  const user = await data.getUserFromApiKey(event.headers.Authorization)
  return await success(user.toJson())
}
