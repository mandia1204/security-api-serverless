import { CfnOutput, Stack, StackProps, aws_lambda_nodejs, aws_logs, aws_lambda, aws_apigateway, aws_dynamodb, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import setupAppConfig from './cdk-security-api-config';
import setupLambdaLayers from './cdk-security-api-layers';

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
          attributeType: 'N'
        }
      ],
      tableName: 'Users',
      billingMode: 'PAY_PER_REQUEST'
    })

    setupAppConfig(this);
    const lambdaLayers = setupLambdaLayers(this);

    // FUNCTIONS
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
          minify: false,
          target: 'es2020',
          externalModules: ['@aws-sdk/client-kms', 'base64url', 'jwt-simple', 'moment']
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

    // CONFIGURE API GATEWAY
    const api = new aws_apigateway.RestApi(this, "SecurityApi", {
      restApiName: "SecurityApi",
      deployOptions: {
        tracingEnabled: true,
        dataTraceEnabled: true,
        loggingLevel: aws_apigateway.MethodLoggingLevel.INFO,
        metricsEnabled: true,
      }
    });

    const tokens = api.root.addResource("tokens");
    tokens.addMethod(
      "POST",
      new aws_apigateway.LambdaIntegration(getTokenFunction)
    );
    
    new CfnOutput(this, "ApiURL", {
      value: `${api.url}products`,
    });
    new CfnOutput(this, "SecurityApiUrl", {
      value: `${api.url}tokens`,
    });
  }
}