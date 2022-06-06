import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getUser } from '../db/userRepo';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>
{
  console.log('event :>> ', event);
  const userId = event.pathParameters?.userId as string;
  try {
    console.info(`getting user ${userId}`);
    const result = await getUser(userId);

    return {
      statusCode: 200,
      headers: { 
        "content-type": "application/json",
        "Access-Control-Allow-Headers" : "Content-Type, Authorization",
        "Access-Control-Allow-Origin": "http://localhost:8080",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT",
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('error while getting user:', error);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(error),
    };
  }
};
