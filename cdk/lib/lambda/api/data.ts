import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'

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
      Item: {
        PK: `USER#${user.username}`,
        SK: `APIKEY#${user.username}`,
        token,
        expiresAt: expiresAt.toString()
      },
      TableName: this.tableName
    }
    const command = new PutCommand(payload)
    await this.ddb.send(command)

    return token
  }
}

export default new Data()
