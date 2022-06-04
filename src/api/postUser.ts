import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { saveUser } from '../db/userRepo';
import { User } from "../types/user";

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>
{
  console.log('event :>> ', event);
  const user = JSON.parse(event.body as string) as User;
  try {
    console.info(`creating user ${user.userName}`);
    const result = await saveUser(user);

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
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
