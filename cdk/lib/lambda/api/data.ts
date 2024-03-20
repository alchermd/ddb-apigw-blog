import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

class User {
  username: string
  hashedPassword: string
  createdAt: Date
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
    // TODO: Handle not found errors
    const response = await this.ddb.send(command)
    if (response.Item === undefined) {
      throw new Error('Something went wrong.')
    }

    const user = new User(response.Item.username as string)
    user.hashedPassword = response.Item.hashedPassword as string
    user.createdAt = new Date(response.Item.createdAt as string)

    return user
  }

  async createApiToken (user: User): Promise<string> {
    const token = crypto.randomUUID().replaceAll('-', '')
    // Token expires 30 days from now
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
        ':apikey': token,
        ':apikeyexpire': expiresAt.toString(),
        ':gsi1pk': `APIKEY#${token}`,
        ':gsi1sk': `APIKEY#${token}`
      },
      UpdateExpression: 'SET #apikey = :apikey, #apikeyexpire = :apikeyexpire, #gsi1pk = :gsi1pk, #gsi1sk = :gsi1sk',
      TableName: this.tableName
    }
    const command = new UpdateCommand(payload)
    await this.ddb.send(command)

    return token
  }

  async getUserFromApiKey (token: string): Promise<User> {
    console.log(`APIKEY#${token}`)

    const payload = {
      ExpressionAttributeNames: {
        '#gsi1pk': 'GSI1PK',
        '#gsi1sk': 'GSI1SK'
      },
      ExpressionAttributeValues: {
        ':apikey': `APIKEY#${token}`
      },
      KeyConditionExpression: '#gsi1pk = :apikey AND #gsi1sk = :apikey',
      IndexName: 'GSI1',
      TableName: this.tableName
    }
    const command = new QueryCommand(payload)
    // TODO: Handle not found errors
    const response = await this.ddb.send(command)
    console.log(response)

    if (response.Items === undefined || response.Count === 0) {
      throw new Error('User not found.')
    }

    const item = response.Items[0]
    console.log(item)

    const user = new User(item.username as string)
    user.hashedPassword = item.hashedPassword as string
    user.createdAt = new Date(item.createdAt as string)

    return user
  }
}

export default new Data()
