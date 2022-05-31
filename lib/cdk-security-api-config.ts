import { Stack, aws_appconfig } from 'aws-cdk-lib';
import fs from 'fs';
import path from 'path';

export default function setupAppConfig(stack: Stack) {
    const appConfig = new aws_appconfig.CfnApplication(stack, 'sc456a2', {
        name: 'SecurityApiConfig',
        description: 'Configuration for security api'
      });
  
      new aws_appconfig.CfnEnvironment(stack, 'Development', {
        applicationId: appConfig.ref,
        name: 'Development'
      });
  
      const profile = new aws_appconfig.CfnConfigurationProfile(stack, 'SecurityConfigProfile', {
        applicationId: appConfig.ref,
        type: 'AWS.Freeform',
        name: 'SecurityConfigProfile',
        locationUri: 'hosted',
        description: 'Security config profile, freeform json file.'
      });

      const configPath = path.join(__dirname, "..", "src/config/tokenConfig.json");
      const configStr = fs.readFileSync(configPath, {encoding:'utf8', flag:'r'});
      new aws_appconfig.CfnHostedConfigurationVersion(stack, 'v1', {
        applicationId: appConfig.ref,
        configurationProfileId: profile.ref,
        contentType: 'application/json',
        content: configStr
      })

      new aws_appconfig.CfnDeploymentStrategy(stack, 'SecurityConfigDeployStrategy', {
        name: 'SecurityConfigDeployStrategy',
        deploymentDurationInMinutes: 3,
        finalBakeTimeInMinutes: 1,
        growthType: 'LINEAR',
        growthFactor: 20,
        replicateTo: 'NONE'
      });    
}