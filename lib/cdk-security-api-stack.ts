import { CfnOutput, Stack, StackProps, aws_lambda_nodejs, aws_logs, aws_lambda, aws_apigateway, aws_dynamodb, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import setupAppConfig from './cdk-security-api-config';
import setupLambdaLayers from './cdk-security-api-layers';
import addUsersApi from './cdk-security-api-users-api';

export class CdkSecurityApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    
    new aws_dynamodb.CfnTable(this, 'Users', {
      keySchema: [{
        attributeName: 'id',
        keyType: 'HASH'
      }],
      attributeDefinitions: [
        {
          attributeName: 'id',
          attributeType: 'S'
        }
      ],
      tableName: 'Users',
      billingMode: 'PAY_PER_REQUEST'
    })

    setupAppConfig(this);
    const lambdaLayers = setupLambdaLayers(this);

    // FUNCTIONS
    const JwtLambdaAuthorizerFunction = new aws_lambda_nodejs.NodejsFunction(
      this,
      "JwtLambdaAuthorizer",
      {
        runtime: Runtime.NODEJS_16_X,
        awsSdkConnectionReuse: true,
        entry: "./src/api/jwtLambdaAuthorizer.ts",
        handler: "handler",
        memorySize: 256,
        logRetention: aws_logs.RetentionDays.ONE_WEEK,
        tracing: aws_lambda.Tracing.ACTIVE,
        layers: lambdaLayers.filter(l => l.node.id === 'tokenRsaKey' || l.node.id === 'ApiNodeModules'),
        bundling: {
          minify: true,
          target: 'es2020',
          externalModules: ['aws-lambda', 'jsonwebtoken']
        }
      }
    );

    Tags.of(JwtLambdaAuthorizerFunction).add('app', 'security');
    Tags.of(JwtLambdaAuthorizerFunction).add('env', 'dev');

    const getTokenFunction = new aws_lambda_nodejs.NodejsFunction(
      this,
      "GetToken",
      {
        runtime: Runtime.NODEJS_16_X,
        awsSdkConnectionReuse: true,
        entry: "./src/api/getToken.ts",
        handler: "handler",
        memorySize: 256,
        environment: {
          TOKEN_CONFIG_URI: 'http://localhost:2772/applications/SecurityApiConfig/environments/Development/configurations/SecurityConfigProfile',
        },
        logRetention: aws_logs.RetentionDays.ONE_WEEK,
        tracing: aws_lambda.Tracing.ACTIVE,
        layers: lambdaLayers,
        bundling: {
          minify: true,
          target: 'es2020',
          externalModules: ['aws-lambda', '@aws-sdk/client-kms', 'base64url', 'ms', 'axios', 'jsonwebtoken']
        }
      }
    );

    Tags.of(getTokenFunction).add('app', 'security');
    Tags.of(getTokenFunction).add('env', 'dev');

    getTokenFunction.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['appconfig:GetConfiguration', 'appconfig:GetLatestConfiguration', 'appconfig:StartConfigurationSession'],
      resources: [
        `arn:aws:appconfig:${this.region}:${this.account}:*`
      ]
    }));

    getTokenFunction.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['kms:Sign'],
      resources: [
        `arn:aws:kms:${this.region}:${this.account}:key/1755af86-36ab-4c93-9988-19968c7f3c1c`
      ]
    }));

    // CONFIGURE API GATEWAY
    const jwtAuthorizer = new aws_apigateway.RequestAuthorizer(this, 'jwtAuthorizer', {
      handler: JwtLambdaAuthorizerFunction,
      identitySources: [aws_apigateway.IdentitySource.header('Authorization')]
    });

    const api = new aws_apigateway.RestApi(this, "SecurityApi", {
      restApiName: "SecurityApi",
      deployOptions: {
        tracingEnabled: true,
        dataTraceEnabled: true,
        loggingLevel: aws_apigateway.MethodLoggingLevel.INFO,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowHeaders: [
          'Content-Type',
          'Authorization'
        ],
        allowMethods: ['OPTIONS','GET', 'POST', 'PUT', 'DELETE'],
        allowOrigins: ['http://localhost:8080'],
      }
    });

    const tokens = api.root.addResource("tokens");
    tokens.addMethod(
      "POST",
      new aws_apigateway.LambdaIntegration(getTokenFunction)
    );

    addUsersApi(this, lambdaLayers, api.root, jwtAuthorizer);
    
    new CfnOutput(this, "UsersApiURL", {
      value: `${api.url}users`,
    });
    new CfnOutput(this, "TokensApiUrl", {
      value: `${api.url}tokens`,
    });
  }
}