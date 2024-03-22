# Blog Engine with DynamoDB and API Gateway

An example of a blogging engine using API Gateway + Lambda functions as the backend, DynamoDB as the data store, and AWS
CDK as the IaC tool.

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
            <td></td>
        </tr>
        <tr>
            <td>Get User information</td>
            <td>Main Table</td>
            <td>PK=USER#&lt;username> AND SK=META#&lt;username></td>
            <td></td>
        </tr>
        <tr>
            <td rowspan="2">API Key</td>
            <td>Create API Key for User</td>            
            <td>Main Table</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Get User for API Key</td>
            <td>GSI1</td>
            <td>GSI1PK=APIKEY#&lt;apikey></td>
            <td></td>
        </tr>
        <tr>
            <td rowspan="6">Post</td>
            <td>Create Post</td>
            <td>Main Table</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Get all Posts by User</td>
            <td>Main Table</td>
            <td>PK=USER#&lt;username> AND SK=begins_with(POST#)</td>
            <td></td>
        </tr>
        <tr>
            <td>Get Post by Slug</td>
            <td>Main Table</td>
            <td>PK=USER#&lt;username> AND SK=POST#&lt;slug></td>
            <td></td>
        </tr>
        <tr>
            <td>Get all Posts by User, sorted by creation date</td>
            <td>GSI1</td>
            <td>PK=USER#&lt;username> AND SK=USER#&lt;username></td>
            <td></td>
        </tr>
        <tr>
            <td>Get post and all comments</td>
            <td>GSI2</td>
            <td>PK=POST#&lt;slug></td>
            <td></td>
        </tr>
        <tr>
            <td>Delete Post</td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Comment</td>
            <td>Add Comment to a Post</td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
    </tbody>
</table>

### Entity Primary Keys

| Entity  | PK                    | SK               | GSI1PK           | GSI1SK             | GSI2PK       | GSI2SK                |
|---------|-----------------------|------------------|------------------|--------------------|--------------|-----------------------|
| User    | USER#\<username>      | META#\<username> | APIKEY#\<apikey> |                    |              |                       |
| Post    | USER#\<username>      | POST#\<slug>     | USER#\<username> | POST#\<created_at> | POST#\<slug> | POST#\<slug>          |
| Comment | COMMENT#\<created_at> |                  |                  |                    | POST#\<slug> | COMMENT#\<created_at> |

