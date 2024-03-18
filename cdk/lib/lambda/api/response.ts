import type { APIGatewayProxyResult } from 'aws-lambda'

export const response = async (body: object, statusCode: number): Promise<APIGatewayProxyResult> => {
  return {
    body: JSON.stringify(body),
    statusCode
  }
}

export const success = async (message: string, statusCode: number = 200): Promise<APIGatewayProxyResult> => {
  return await response({ message }, statusCode)
}

export const userError = async (body: object, statusCode: number = 422): Promise<APIGatewayProxyResult> => {
  return await response(body, statusCode)
}
export const serverError = async (message: string = 'Something went wrong', statusCode: number = 500): Promise<APIGatewayProxyResult> => {
  return await response({ message }, statusCode)
}
