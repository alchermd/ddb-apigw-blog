import type { APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent } from 'aws-lambda'
import data from '@/lambda/api/data'

function policy (effect: 'Allow' | 'Deny', arn: string): APIGatewayAuthorizerResult {
  return {
    principalId: 'user',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: arn
        }
      ]
    }
  }
}

export const handler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
  console.log(event)
  const methodArn = event.methodArn

  try {
    const isValid = await data.checkApiKeyValidity(event.authorizationToken)
    if (!isValid) {
      return policy('Deny', methodArn)
    }
  } catch (e) {
    console.log(e)
    return policy('Deny', methodArn)
  }

  return policy('Allow', methodArn)
}
