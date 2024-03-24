# Blog Engine with DynamoDB and API Gateway

An example of a blogging engine using API Gateway + Lambda functions as the backend, DynamoDB as the data store, and AWS
CDK as the IaC tool.

## Deployment

The only prerequisite for deployment is a set of AWS credentials that is accessible locally (see [this AWS doc](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html)). Once configured, run the following commands:

```console
$ cd cdk
$ npm run synth # Review the changes
$ npm run cdk deploy
```

The blog API is now accessible via the URL shown in the CDK output.

## Table Design

Below are notes and artifacts created pre-development to give structure to the project.

### Entities

![](./docs/erd.png)

### Access Patterns

<table>
    <thead>
        <th>Entity</th>
        <th>Access Pattern</th>
        <th>Index</th>
        <th>Parameters</th>
        <th>Notes</th>
    </thead>
    <tbody>
        <tr>
            <td rowspan="2">User</td>
            <td>Create User</td>
            <td>Main Table</td>
            <td></td>
            <td>POST /register</td>
        </tr>
        <tr>
            <td>Get User information</td>
            <td>Main Table</td>
            <td>PK=USER#&lt;username> AND SK=META#&lt;username></td>
            <td>GET /me</td>
        </tr>
        <tr>
            <td rowspan="2">API Key</td>
            <td>Create API Key for User</td>            
            <td>Main Table</td>
            <td></td>
            <td>POST /login</td>
        </tr>
        <tr>
            <td>Get User for API Key</td>
            <td>GSI1</td>
            <td>GSI1PK=APIKEY#&lt;apikey></td>
            <td></td>
        </tr>
        <tr>
            <td rowspan="4">Post</td>
            <td>Create Post</td>
            <td>Main Table</td>
            <td></td>
            <td>POST /posts</td>
        </tr>
        <tr>
            <td>Get all Posts by User, sorted by creation date</td>
            <td>GSI1</td>
            <td>PK=USER#&lt;username> AND SK=begins_with(POST#)</td>
            <td>GET /users/{username}/posts</td>
        </tr>
        <tr>
            <td>Get post and all comments</td>
            <td>GSI2</td>
            <td>PK=POST#&lt;slug></td>
            <td>GET /users/{username}/posts/{slug}</td>
        </tr>
        <tr>
            <td>Delete Post</td>
            <td>Main Table</td>
            <td></td>
            <td>DELETE /users/{username}/posts/{slug}</td>
        </tr>
        <tr>
            <td>Comment</td>
            <td>Add Comment to a Post</td>
            <td>Main Table</td>
            <td></td>
            <td>POST /users/{username}/posts/{slug}/comments</td>
        </tr>
    </tbody>
</table>

### Entity Primary Keys

| Entity  | PK               | SK               | GSI1PK           | GSI1SK             | GSI2PK       | GSI2SK                |
|---------|------------------|------------------|------------------|--------------------|--------------|-----------------------|
| User    | USER#\<username> | META#\<username> | APIKEY#\<apikey> |                    |              |                       |
| Post    | USER#\<username> | POST#\<slug>     | USER#\<username> | POST#\<created_at> | POST#\<slug> | POST#\<slug>          |
| Comment | COMMENT#\<uuid>  | COMMENT#\<uuid>  |                  |                    | POST#\<slug> | COMMENT#\<created_at> |

## Disclaimer and License 

This project is not fit for production use and a lot of features, particularly security-related, are stripped out for simplicity's sake. See the
[LICENSE file](./LICENSE) for more information.
