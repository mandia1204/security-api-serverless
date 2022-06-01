import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, GetCommandInput } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: "us-east-2" });
const marshallOptions = {
  // Whether to automatically convert empty strings, blobs, and sets to `null`.
  convertEmptyValues: true,
  // Whether to remove undefined values while marshalling.
  removeUndefinedValues: true,
  // Whether to convert typeof object to map attribute.
  convertClassInstanceToMap: false,
};

const unmarshallOptions = {
  // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
  wrapNumbers: false,
};

const translateConfig = { marshallOptions, unmarshallOptions };
const ddbDocClient = DynamoDBDocumentClient.from(client, translateConfig);

const tableName = 'Users';
export async function getUser(userId: number) {
    const params: GetCommandInput = {
      TableName: tableName,
      Key: { id : userId },
      ReturnConsumedCapacity: 'NONE'
    };
    const command = new GetCommand(params);
    try {
      const data = await ddbDocClient.send(command);
      return data.Item;
    } catch (error) {
      console.log('error getting user :>> ', error);
      return null;
    } 
}