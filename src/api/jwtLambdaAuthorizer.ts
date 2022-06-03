import { APIGatewayAuthorizerWithContextResult, APIGatewayAuthorizerResultContext, APIGatewayRequestAuthorizerEvent } from "aws-lambda";
import { verifyToken } from './tokenVerifier';

interface ResponsePayload extends APIGatewayAuthorizerResultContext {
  accountId: string
}

export async function handler(event: APIGatewayRequestAuthorizerEvent): Promise<APIGatewayAuthorizerWithContextResult<ResponsePayload>>
{
  // console.log('event :>> ', event);
  const token = event.headers?.Authorization?.replace('Bearer ', '') as string;
  return verifyToken(token)
        .then(valid => {
          let response: APIGatewayAuthorizerWithContextResult<ResponsePayload> = {
            principalId: 'nothing',
            policyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Action: 'execute-api:Invoke',
                  Effect: valid ? 'Allow' : 'Deny',
                  Resource: event.methodArn
                }
              ]
            },
            context: {
                accountId: event.requestContext.accountId,
            }
          };
          return response;
  })
};