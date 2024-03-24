import type { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { serverError, success, userError } from '@/lambda/api/response'
import data, { type Post, PostNotFound, type User } from '@/lambda/api/data'

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

  let user: User
  try {
    user = await data.getUserFromApiKey(event.headers.Authorization)
  } catch (e) {
    console.log(e)

    return await serverError()
  }

  let post: Post
  try {
    post = await data.getPost(user.username, postSlug)
  } catch (e) {
    console.log(e)
    if (e instanceof PostNotFound) {
      return await userError('User does not own the post.', 401)
    }

    return await serverError()
  }

  try {
    await data.deletePost(user, post)
  } catch (e) {
    console.log(e)

    return await serverError()
  }

  return await success('Post has been deleted.', 200)
}
