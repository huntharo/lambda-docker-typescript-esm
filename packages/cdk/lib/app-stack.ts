import { Construct } from 'constructs';
import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { TimeToLive } from '@cloudcomponents/cdk-temp-stack';
import { ServiceConstruct } from './service-construct';

interface AppProps extends StackProps {
  readonly local: {
    /**
     * Time after which to automatically delete all resources.
     */
    readonly ttl?: Duration;

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

export interface IAppStack {
  readonly service: ServiceConstruct;
}

export class AppStack extends Stack implements IAppStack {
  private _service: ServiceConstruct;
  public get service(): ServiceConstruct {
    return this._service;
  }

  constructor(scope: Construct, id: string, props: AppProps) {
    super(scope, id, props);

    const { local } = props;
    const { ttl, provisionedConcurrentExecutions = 0 } = local;

    // Set stack to delete if this is a PR build
    if (ttl !== undefined) {
      new TimeToLive(this, 'TimeToLive', {
        ttl,
      });
    }

    //
    // Create arm64 lambda
    //
    new ServiceConstruct(this, 'service-arm64', {
      memorySize: 512,
      arch: 'arm64',
      autoDeleteEverything: ttl !== undefined,
      provisionedConcurrentExecutions: provisionedConcurrentExecutions
        ? provisionedConcurrentExecutions
        : undefined,
    });

    //
    // Create amd64 lambda
    //
    new ServiceConstruct(this, 'service-amd64', {
      memorySize: 512,
      arch: 'x86_64',
      autoDeleteEverything: ttl !== undefined,
      provisionedConcurrentExecutions: provisionedConcurrentExecutions
        ? provisionedConcurrentExecutions
        : undefined,
    });
  }
}
