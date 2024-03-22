import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

export class UserNotFoundError extends Error {
}

export class ApiKeyNotFoundError extends Error {
}

export class User {
  username: string
  hashedPassword: string
  createdAt: Date
  apiKeyExpiresAt: Date
  private readonly rawPassword: string | null

  constructor (username: string, rawPassword: string | null = null) {
    this.username = username
    this.rawPassword = rawPassword
    this.createdAt = new Date()
  }

  async hashPassword (): Promise<void> {
    if (this.rawPassword !== null) {
      this.hashedPassword = await hashPassword(this.rawPassword)
    }
  }

  toJson (): Record<string, unknown> {
    return {
      username: this.username,
      createdAt: this.createdAt
    }
  }
}

export class Post {
  title: string
  body: string
  slug: string
  createdAt: Date

  constructor (title: string, body: string, slug: string, createdAt?: Date) {
    this.title = title
    this.body = body
    this.slug = slug

    if (createdAt !== undefined) {
      this.createdAt = createdAt
    } else {
      this.createdAt = new Date()
    }
  }

  toJson (): Record<string, unknown> {
    return {
      title: this.title,
      body: this.body,
      slug: this.slug
    }
  }
}

export interface PostData {
  title: string
  body: string
  slug: string
}

async function hashPassword (rawPassword: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const buffer = scryptSync(rawPassword, salt, 64)
  return `${buffer.toString('hex')}.${salt}`
}

export async function authenticate (user: User, password: string): Promise<boolean> {
  const [hashedPassword, salt] = user.hashedPassword.split('.')
  const hashedPasswordBuffer = Buffer.from(hashedPassword, 'hex')
  const suppliedPasswordBuffer = scryptSync(password, salt, 64)
  return timingSafeEqual(hashedPasswordBuffer, suppliedPasswordBuffer)
}

class Data {
  ddb: DynamoDBDocumentClient
  tableName: string

  constructor () {
    this.ddb = DynamoDBDocumentClient.from(new DynamoDBClient())
    this.tableName = 'blog'
  }

  async createUser (username: string, password: string): Promise<User> {
    const user = new User(username, password)
    await user.hashPassword()

    const payload = {
      Item: {
        PK: `USER#${user.username}`,
        SK: `META#${user.username}`,
        username: user.username,
        hashedPassword: user.hashedPassword,
        createdAt: user.createdAt.toString()
      },
      ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
      TableName: this.tableName
    }
    const command = new PutCommand(payload)
    await this.ddb.send(command)

    return user
  }

  async getUser (username: string): Promise<User> {
    const payload = {
      Key: {
        PK: `USER#${username}`,
        SK: `META#${username}`
      },
      TableName: this.tableName
    }
    const command = new GetCommand(payload)
    const response = await this.ddb.send(command)
    if (response.Item === undefined) {
      throw new UserNotFoundError(`${username} does not exist.`)
    }

    const user = new User(response.Item.username as string)
    user.hashedPassword = response.Item.hashedPassword as string
    user.createdAt = new Date(response.Item.createdAt as string)

    return user
  }

  async createApiKey (user: User): Promise<string> {
    const apiKey = crypto.randomUUID().replaceAll('-', '')
    // API Key expires 30 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const payload = {
      Key: {
        PK: `USER#${user.username}`,
        SK: `META#${user.username}`
      },
      ExpressionAttributeNames: {
        '#apikey': 'apiKey',
        '#apikeyexpire': 'apiKeyExpiresAt',
        '#gsi1pk': 'GSI1PK',
        '#gsi1sk': 'GSI1SK'
      },
      ExpressionAttributeValues: {
        ':apikey': apiKey,
        ':apikeyexpire': expiresAt.toString(),
        ':gsi1pk': `APIKEY#${apiKey}`,
        ':gsi1sk': `APIKEY#${apiKey}`
      },
      UpdateExpression: 'SET #apikey = :apikey, #apikeyexpire = :apikeyexpire, #gsi1pk = :gsi1pk, #gsi1sk = :gsi1sk',
      TableName: this.tableName
    }
    const command = new UpdateCommand(payload)
    await this.ddb.send(command)

    return apiKey
  }

  async getUserFromApiKey (apiKey: string): Promise<User> {
    console.log(`APIKEY#${apiKey}`)

    const payload = {
      ExpressionAttributeNames: {
        '#gsi1pk': 'GSI1PK',
        '#gsi1sk': 'GSI1SK'
      },
      ExpressionAttributeValues: {
        ':apikey': `APIKEY#${apiKey}`
      },
      KeyConditionExpression: '#gsi1pk = :apikey AND #gsi1sk = :apikey',
      IndexName: 'GSI1',
      TableName: this.tableName
    }
    const command = new QueryCommand(payload)
    const response = await this.ddb.send(command)
    console.log(response)

    if (response.Items === undefined || response.Count === 0) {
      throw new ApiKeyNotFoundError(`${apiKey} does not exist.`)
    }

    const item = response.Items[0]
    console.log(item)

    const user = new User(item.username as string)
    user.hashedPassword = item.hashedPassword as string
    user.createdAt = new Date(item.createdAt as string)
    user.apiKeyExpiresAt = new Date(item.apiKeyExpiresAt as string)

    return user
  }

  async checkApiKeyValidity (token: string): Promise<boolean> {
    const user = await this.getUserFromApiKey(token)
    return user.apiKeyExpiresAt > new Date()
  }

  async createPost (postData: PostData, user: User): Promise<Post> {
    const post = new Post(postData.title, postData.body, postData.slug)

    const payload = {
      Item: {
        PK: `USER#${user.username}`,
        SK: `POST#${post.slug}`,
        GSI1PK: `USER#${user.username}`,
        GSI1SK: `POST#${post.createdAt.toString()}`,
        GSI2PK: `POST#${post.slug}`,
        title: postData.title,
        body: postData.body,
        slug: postData.slug,
        createdAt: post.createdAt.toString()
      },
      ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
      TableName: this.tableName
    }
    const command = new PutCommand(payload)
    await this.ddb.send(command)

    return post
  }

  async getPosts (username: string): Promise<Post[]> {
    console.log(`Fetching posts for user ${username}`)

    const payload = {
      ExpressionAttributeNames: {
        '#pk': 'PK',
        '#sk': 'SK'
      },
      ExpressionAttributeValues: {
        ':username': `USER#${username}`,
        ':postprefix': 'POST#'
      },
      KeyConditionExpression: '#pk = :username AND begins_with(#sk, :postprefix)',
      TableName: this.tableName
    }
    const command = new QueryCommand(payload)
    const response = await this.ddb.send(command)
    console.log(response)

    if (response.Items === undefined) {
      throw new Error('Returned items is undefined.')
    }

    return response.Items.map(item => new Post(
      item.string as string,
      item.body as string,
      item.slug as string,
      new Date(item.createdAt as string)
    ))
  }
}

export default new Data()
