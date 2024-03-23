import type { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { serverError, success, userError } from '@/lambda/api/response'
import { type CreateCommentPayload, createCommentPayloadSchema } from '@/lambda/api/users/posts/post/comments/validator'
import { ZodError } from 'zod'
import data, { type Comment } from '@/lambda/api/data'

export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
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

  const postAuthor = event.pathParameters.username
  const postSlug = event.pathParameters.post
  const slug = `${postAuthor}/${postSlug}`

  const unsafePayload: CreateCommentPayload = JSON.parse(String(event.body))

  let payload: CreateCommentPayload
  try {
    payload = createCommentPayloadSchema.parse(unsafePayload)
  } catch (e) {
    console.log(e)

    if (e instanceof ZodError) {
      return await userError(e.format())
    }

    return await serverError()
  }

  let comment: Comment
  try {
    const user = await data.getUserFromApiKey(event.headers.Authorization)
    comment = await data.createComment(slug, user.username, payload)
  } catch (e) {
    console.log(e)

    return await serverError()
  }

  return await success(comment.toJson())
}
