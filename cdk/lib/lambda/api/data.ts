import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb'

class User {
  username: string
  hashedPassword: string
  createdAt: Date

  constructor (username: string, rawPassword: string) {
    this.username = username
    this.hashedPassword = hashPassword(rawPassword)
    this.createdAt = new Date()
  }
}

// Hashes the given raw password
function hashPassword (rawPassword: string): string {
  return `hashed-${rawPassword}`
}

class Data {
  ddb: DynamoDBClient
  tableName: string

  constructor () {
    this.ddb = new DynamoDBClient()
    this.tableName = 'blog'
  }

  async createUser (username: string, password: string): Promise<User> {
    const user = new User(username, password)
    const payload = {
      Item: {
        PK: {
          S: `USER#${user.username}`
        },
        SK: {
          S: `META#${user.username}`
        },
        username: {
          S: user.username
        },
        hashedPassword: {
          S: user.hashedPassword
        },
        createdAt: {
          S: user.createdAt.toString()
        }
      },
      ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
      TableName: this.tableName
    }
    const command = new PutItemCommand(payload)
    await this.ddb.send(command)
    return user
  }
}

export default new Data()
