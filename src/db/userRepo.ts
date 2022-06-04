import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBDocumentClient, GetCommand, GetCommandInput, PutCommandInput, PutCommand } from '@aws-sdk/lib-dynamodb';
import { User } from "../types/user";

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
export async function getUser(userId: string) {
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

export async function saveUser(user: User) {
  if(!user.id){
    user.id = uuidv4();
  }
  const params: PutCommandInput = {
    TableName: tableName,
    Item: user,
    ReturnConsumedCapacity: 'NONE'
  };
  const command = new PutCommand(params);
  try {
    const data = await ddbDocClient.send(command);
    console.log('user saved :>> ', data);
    return user;
  } catch (error) {
    console.log('error saving user :>> ', error);
    return null;
  } 
}