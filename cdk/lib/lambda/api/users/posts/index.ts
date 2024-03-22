import type { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { serverError, success, userError } from '@/lambda/api/response'
import data, { type Post, UserNotFoundError } from '@/lambda/api/data'

export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
  console.log(event)
  if (event.headers.Authorization === undefined) {
    return await userError({ error: 'Unauthorized' }, 401)
  }

  if (event.pathParameters?.username === undefined) {
    console.log('Username in path parameters not found.')
    return await serverError()
  }

  const username = event.pathParameters.username

  try {
    await data.getUser(username)
  } catch (e) {
    if (e instanceof UserNotFoundError) {
      return await userError('User does not exist.', 404)
    }
  }

  let posts: Post[]
  try {
    posts = await data.getPosts(username)
  } catch (e) {
    console.log(e)

    return await serverError()
  }

  return await success(posts.map(post => post.toJson()))
}
