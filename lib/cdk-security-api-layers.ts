import { Stack, aws_s3, aws_lambda, aws_s3_deployment } from 'aws-cdk-lib';
import { Source } from 'aws-cdk-lib/aws-s3-deployment';
import { ILayerVersion, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import path from 'path';

export default function setupLambdaLayers(stack: Stack): ILayerVersion[] {
  const bucket = new aws_s3.Bucket(stack, 'SecurityApiTokenConfig', {
    bucketName: 'security-api-token-config'
  });

  const assetsPath = path.join(__dirname, "..", "src/assets");
  new aws_s3_deployment.BucketDeployment(stack, 'Assets', {
    destinationBucket: bucket,
    sources: [Source.asset(assetsPath)]
  });

  const tokenRsaKeyLayer = new aws_lambda.LayerVersion(stack, 'tokenRsaKey', {
    compatibleRuntimes: [
      aws_lambda.Runtime.NODEJS_14_X,
      aws_lambda.Runtime.NODEJS_16_X
    ],
    code: aws_lambda.Code.fromBucket(bucket, 'keys.zip'),
    description: 'Rsa key for signing',
  });

  const modulesLayer = new aws_lambda.LayerVersion(stack, 'ApiNodeModules', {
    compatibleRuntimes: [
      aws_lambda.Runtime.NODEJS_14_X,
      aws_lambda.Runtime.NODEJS_16_X
    ],
    code: aws_lambda.Code.fromBucket(bucket, 'modules.zip'),
    description: 'Rsa key for signing',
  });

  const appConfigArn = 'arn:aws:lambda:us-east-2:728743619870:layer:AWS-AppConfig-Extension:50';
  const appConfigExtension = LayerVersion.fromLayerVersionArn(stack, "appConfigExtension", appConfigArn);

  return [tokenRsaKeyLayer, modulesLayer, appConfigExtension]
}