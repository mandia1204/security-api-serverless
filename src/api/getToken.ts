import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import axios from 'axios';
import tokenEncoder from "./tokenEncoder";

const encoder = tokenEncoder();
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>
{
  console.log('event :>> ', event);
  const { userName, type} = JSON.parse(event.body as string);
  try {
    console.info(`getting config}`);
    const { data } = await axios.get(process.env.TOKEN_CONFIG_URI as string)
    console.info(`getting token ${userName}, ${type}`);
    const result = await encoder.encodeToken(userName, type, data)

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(error),
    };
  }
};
