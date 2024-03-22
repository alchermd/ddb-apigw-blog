import type { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { serverError, success, userError } from '@/lambda/api/response'
import data, { type Post, PostNotFound } from '@/lambda/api/data'

export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
  console.log(event)
  if (event.headers.Authorization === undefined) {
    return await userError({ error: 'Unauthorized' }, 401)
  }

  if (event.pathParameters?.username === undefined) {
    console.log('Username in path parameters not found.')
    return await serverError()
  }

  if (event.pathParameters?.post === undefined) {
    console.log('Post slug in path parameters not found.')
    return await serverError()
  }

  const postSlug = event.pathParameters.post
  const username = event.pathParameters.username

  let post: Post
  try {
    post = await data.getPost(username, postSlug)
  } catch (e) {
    console.log(e)
    if (e instanceof PostNotFound) {
      return await userError('Post does not exist.', 404)
    }

    return await serverError()
  }

  return await success(post.toJson())
}
