import type { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { serverError, success, userError } from '@/lambda/api/response'
import data, { type Post } from '@/lambda/api/data'
import { ZodError } from 'zod'
import { type CreatePostPayload, createPostPayloadSchema } from '@/lambda/api/posts/validator'
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'

export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
  if (event.headers.Authorization === undefined) {
    return await userError({ error: 'Unauthorized' }, 401)
  }

  const unsafePayload: CreatePostPayload = JSON.parse(String(event.body))

  let payload: CreatePostPayload
  try {
    payload = createPostPayloadSchema.parse(unsafePayload)
  } catch (e) {
    console.log(e)

    if (e instanceof ZodError) {
      return await userError(e.format())
    }

    return await serverError()
  }

  let post: Post
  try {
    const user = await data.getUserFromApiKey(event.headers.Authorization)
    post = await data.createPost(payload, user)
  } catch (e) {
    console.log(e)

    if (e instanceof ConditionalCheckFailedException) {
      const error = {
        slug: {
          _errors: ['Already exists for this user.']
        }
      }

      return await userError(error)
    }

    return await serverError()
  }

  return await success(post.toJson())
}
