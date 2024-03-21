import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import { ProjectionType } from 'aws-cdk-lib/aws-dynamodb'
import * as apigw from 'aws-cdk-lib/aws-apigateway'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { type Construct } from 'constructs'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import * as path from 'node:path'

export class CdkStack extends cdk.Stack {
  constructor (scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const blogTable = new dynamodb.TableV2(this, 'BlogTable', {
      tableName: 'blog',
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING
      },
      globalSecondaryIndexes: [
        {
          indexName: 'GSI1',
          partitionKey: {
            name: 'GSI1PK',
            type: dynamodb.AttributeType.STRING
          },
          sortKey: {
            name: 'GSI1SK',
            type: dynamodb.AttributeType.STRING
          },
          projectionType: ProjectionType.ALL
        }
      ]
    })

    const api = new apigw.RestApi(this, 'BlogAPI')
    api.root.addMethod('ANY')

    const authHandler = new NodejsFunction(this, 'AuthHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, 'lambda/api/auth/index.ts')
    })
    const auth = new apigw.TokenAuthorizer(this, 'TokenAuthorizer', {
      handler: authHandler
    })
    blogTable.grantReadData(authHandler)

    const registerHandler = new NodejsFunction(this, 'RegisterHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, 'lambda/api/register/index.ts')
    })
    const register = api.root.addResource('register')
    register.addMethod('POST', new apigw.LambdaIntegration(registerHandler))
    blogTable.grantWriteData(registerHandler)

    const loginHandler = new NodejsFunction(this, 'LoginHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, 'lambda/api/login/index.ts')
    })
    const login = api.root.addResource('login')
    login.addMethod('POST', new apigw.LambdaIntegration(loginHandler))
    blogTable.grantReadWriteData(loginHandler)

    const meHandler = new NodejsFunction(this, 'MeHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, 'lambda/api/me/index.ts')
    })
    const me = api.root.addResource('me')
    me.addMethod('GET', new apigw.LambdaIntegration(meHandler), { authorizer: auth })
    blogTable.grantReadData(meHandler)

    const createPostHandler = new NodejsFunction(this, 'CreatePostHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, 'lambda/api/posts/create.ts')
    })
    const createPost = api.root.addResource('posts')
    createPost.addMethod('POST', new apigw.LambdaIntegration(createPostHandler), { authorizer: auth })
    blogTable.grantReadWriteData(createPostHandler)
  }
}
