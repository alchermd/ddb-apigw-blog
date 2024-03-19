import type { APIGatewayProxyResult } from 'aws-lambda'
import { object } from 'zod'

export const response = async (body: object, statusCode: number): Promise<APIGatewayProxyResult> => {
  return {
    body: JSON.stringify(body),
    statusCode
  }
}

export const success = async (message: string | Record<string, unknown>, statusCode: number = 200): Promise<APIGatewayProxyResult> => {
  let body
  if (typeof message === 'string') {
    body = { message }
  } else {
    body = message
  }
  return await response(body, statusCode)
}

export const userError = async (body: object, statusCode: number = 422): Promise<APIGatewayProxyResult> => {
  return await response(body, statusCode)
}
export const serverError = async (message: string = 'Something went wrong', statusCode: number = 500): Promise<APIGatewayProxyResult> => {
  return await response({ message }, statusCode)
}
