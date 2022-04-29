import { Construct } from 'constructs';
import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { TimeToLive } from '@cloudcomponents/cdk-temp-stack';
import { ServiceConstruct } from './service-construct';

interface AppProps extends StackProps {
  readonly local: {
    /**
     * Time after which to automatically delete all resources.
     */
    readonly ttl?: Duration;

    /**
     * Auth type to use
     *
     * @default NONE
     */
    readonly authType?: lambda.FunctionUrlAuthType;

    /**
     * Number of concurrent executions to pre-provision.
     *
     * Note: this costs $$$ even if idle
     *
     * @default 0
     */
    readonly provisionedConcurrentExecutions?: number;
  };
}

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props: AppProps) {
    super(scope, id, props);

    const { local } = props;
    const {
      authType = lambda.FunctionUrlAuthType.NONE,
      ttl,
      provisionedConcurrentExecutions = 0,
    } = local;

    // Set stack to delete if this is a PR build
    if (ttl !== undefined) {
      new TimeToLive(this, 'TimeToLive', {
        ttl,
      });
    }

    //
    // Create arm64 lambda
    //
    const serviceARM = new ServiceConstruct(this, 'service-arm64', {
      memorySize: 512,
      arch: 'arm64',
      autoDeleteEverything: ttl !== undefined,
      provisionedConcurrentExecutions: provisionedConcurrentExecutions
        ? provisionedConcurrentExecutions
        : undefined,
      authType,
    });

    //
    // Create arm64 lambda
    //
    const serviceARMZip = new ServiceConstruct(this, 'service-arm64-zip', {
      memorySize: 512,
      arch: 'arm64',
      functionType: 'zip',
      autoDeleteEverything: ttl !== undefined,
      provisionedConcurrentExecutions: provisionedConcurrentExecutions
        ? provisionedConcurrentExecutions
        : undefined,
      authType,
    });

    //
    // Create amd64 lambda
    //
    const serviceAMD = new ServiceConstruct(this, 'service-amd64', {
      memorySize: 512,
      arch: 'x86_64',
      autoDeleteEverything: ttl !== undefined,
      provisionedConcurrentExecutions: provisionedConcurrentExecutions
        ? provisionedConcurrentExecutions
        : undefined,
      authType,
    });

    new CfnOutput(this, 'service-url-arm', {
      value: serviceARM.serviceFuncUrl.url,
      exportName: `${this.stackName}-service-url-arm`,
    });

    new CfnOutput(this, 'service-url-arm-zip', {
      value: serviceARMZip.serviceFuncUrl.url,
      exportName: `${this.stackName}-service-url-arm-zip`,
    });

    new CfnOutput(this, 'service-url-amd', {
      value: serviceAMD.serviceFuncUrl.url,
      exportName: `${this.stackName}-service-url-amd`,
    });
  }
}
