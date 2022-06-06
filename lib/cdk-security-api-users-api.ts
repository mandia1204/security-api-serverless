import { Stack, aws_lambda_nodejs, aws_logs, aws_lambda, aws_apigateway, Tags } from 'aws-cdk-lib';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

export default function addUsersApi(
    stack: Stack, 
    lambdaLayers: aws_lambda.ILayerVersion[],
    api:aws_apigateway.IResource,
    jwtAuthorizer: aws_apigateway.RequestAuthorizer) {
  const getUserFunction = new aws_lambda_nodejs.NodejsFunction(
    stack,
    "GetUser",
    {
      runtime: Runtime.NODEJS_16_X,
      awsSdkConnectionReuse: true,
      entry: "./src/api/getUser.ts",
      handler: "handler",
      memorySize: 256,
      logRetention: aws_logs.RetentionDays.ONE_WEEK,
      tracing: aws_lambda.Tracing.ACTIVE,
      layers: lambdaLayers.filter(l => l.node.id === 'ApiNodeModules'),
      bundling: {
        minify: true,
        target: 'es2020',
        externalModules: ['aws-lambda', '@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb', 'uuid']
      }
    }
  );

  getUserFunction.addToRolePolicy(new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['dynamodb:GetItem'],
    resources: [
      `arn:aws:dynamodb:${stack.region}:${stack.account}:table/Users`
    ]
  }));

  Tags.of(getUserFunction).add('app', 'security');
  Tags.of(getUserFunction).add('env', 'dev');

  const postUserFunction = new aws_lambda_nodejs.NodejsFunction(
    stack,
    "PostUser",
    {
      runtime: Runtime.NODEJS_16_X,
      awsSdkConnectionReuse: true,
      entry: "./src/api/postUser.ts",
      handler: "handler",
      memorySize: 256,
      logRetention: aws_logs.RetentionDays.ONE_WEEK,
      tracing: aws_lambda.Tracing.ACTIVE,
      layers: lambdaLayers.filter(l => l.node.id === 'ApiNodeModules'),
      bundling: {
        minify: true,
        target: 'es2020',
        externalModules: ['aws-lambda','@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb', 'uuid']
      }
    }
  );

  postUserFunction.addToRolePolicy(new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['dynamodb:PutItem'],
    resources: [
      `arn:aws:dynamodb:${stack.region}:${stack.account}:table/Users`
    ]
  }));

  Tags.of(postUserFunction).add('app', 'security');
  Tags.of(postUserFunction).add('env', 'dev');

  const users = api.addResource("users");
  const user = users.addResource("{userId}");
  
  user.addMethod(
      "GET",
      new aws_apigateway.LambdaIntegration(getUserFunction),
      {
        authorizer: jwtAuthorizer,
      },
  );
  users.addMethod(
    'POST',
    new aws_apigateway.LambdaIntegration(postUserFunction),
      {
        authorizer: jwtAuthorizer,
      }
  )
}