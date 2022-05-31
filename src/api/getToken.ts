import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import http from 'http';
import tokenEncoder from "./tokenEncoder";

const encoder = tokenEncoder();
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>
{
  console.log('event :>> ', event);
  const { userName, type} = JSON.parse(event.body as string);
  try {
    console.info(`getting config}`);
    const res = await new Promise<any>((resolve, _) => {
      http.get(process.env.TOKEN_CONFIG_URI as string, resolve);
    });

    let configData: string = await new Promise((resolve, reject) => {
      let data = '';
      res.on('data', (chunk: any) => data += chunk);
      res.on('error', (err: any) => reject(err));
      res.on('end', () => resolve(data));
    });

    console.info(`getting token ${userName}, ${type}`);
    const result = await encoder.encodeToken(userName, type, JSON.parse(configData))

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
