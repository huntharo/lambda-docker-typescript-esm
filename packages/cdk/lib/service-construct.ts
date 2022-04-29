import { Construct } from 'constructs';
import { Duration, RemovalPolicy, Tags } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import path from 'path';
import os from 'os';

interface ServiceProps {
  /**
   * Architecture to build for and run on
   *
   * @default x86_64
   */
  readonly arch?: 'arm64' | 'x86_64';

  /**
   * Type of function to create
   */
  readonly functionType?: 'docker' | 'zip';

  /**
   * Auth type to use
   *
   * @default NONE
   */
  readonly authType?: lambda.FunctionUrlAuthType;

  /**
   * Optional lambda function name.
   * Also used for the CloudWatch LogGroup for the function.
   *
   * @default - auto assigned
   */
  readonly lambdaFuncServiceName?: string;

  /**
   * Automatically clean up durable resources (e.g. for PR builds).
   * @default false
   */
  readonly autoDeleteEverything?: boolean;

  /**
   * The amount of memory, in MB, that is allocated to your Lambda function.
   *
   * Lambda uses this value to proportionally allocate the amount of CPU power. For more information, see Resource Model in the AWS Lambda Developer Guide.
   *
   * 1769 MB is 1 vCPU seconds of credits per second
   *
   * @default 512
   */
  readonly memorySize?: number;

  /**
   * Disables bundling for test builds so that snapshots remain stable
   *
   * @default false
   */
  readonly isTestBuild?: boolean;

  readonly provisionedConcurrentExecutions?: number;
}

export interface IServiceExports {
  readonly serviceFunc: lambda.IFunction;

  readonly serviceFuncUrl: lambda.IFunctionUrl;
}

export class ServiceConstruct extends Construct implements IServiceExports {
  private _serviceFunc: lambda.Function;
  public get serviceFunc(): lambda.IFunction {
    return this._serviceFunc;
  }

  private _serviceFuncUrl: lambda.FunctionUrl;
  public get serviceFuncUrl(): lambda.IFunctionUrl {
    return this._serviceFuncUrl;
  }

  /**
   * Construct for the service that reads from DynamoDB
   * @param scope
   * @param id
   * @param props
   */
  constructor(scope: Construct, id: string, props: ServiceProps) {
    super(scope, id);

    const {
      autoDeleteEverything,
      lambdaFuncServiceName,
      memorySize = 512, // 1769 MB is 1 vCPU seconds of credits per second
      arch = 'x86_64',
      authType = lambda.FunctionUrlAuthType.NONE,
      functionType = 'docker',
      isTestBuild = false,
    } = props;

    //
    // Create the Lambda Function
    //
    if (functionType === 'docker') {
      this._serviceFunc = new lambda.DockerImageFunction(this, 'lambda-func', {
        code: lambda.DockerImageCode.fromImageAsset('./', {
          buildArgs: {
            arch: arch === 'x86_64' ? 'amd64' : arch,
            archImage: arch,
          },
        }),
        functionName: lambdaFuncServiceName,
        architecture: arch === 'x86_64' ? lambda.Architecture.X86_64 : lambda.Architecture.ARM_64,
        logRetention: logs.RetentionDays.ONE_MONTH,
        memorySize,
        timeout: Duration.seconds(20),
        // This doesn't actually add insights for Docker, but it does add the IAM
        // permissions... so... leave it here as a kludge.
        // https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Lambda-Insights-Getting-Started-docker.html
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
        tracing: lambda.Tracing.ACTIVE,
        environment: {
          NODE_ENV: 'production', // This is used by next.js and is always 'production'
        },
      });
    } else {
      this._serviceFunc = new lambdaNodejs.NodejsFunction(this, 'lambda-func', {
        entry: 'packages/lambda/src/index.ts',
        functionName: lambdaFuncServiceName,
        logRetention: logs.RetentionDays.ONE_MONTH,
        memorySize,
        timeout: Duration.seconds(20),
        runtime: lambda.Runtime.NODEJS_14_X,
        environment: {
          NODE_ENV: 'production', // This is used by next.js and is always 'production'
        },
        bundling: {
          minify: false,
          externalModules: ['./server.js'],
          commandHooks: {
            beforeInstall: () => [],
            beforeBundling: () => ['npm run build'],
            afterBundling: (inputDir: string, outputDir: string) => {
              return [
                `${os.platform() === 'win32' ? 'copy' : 'cp'} ${path.join(
                  inputDir,
                  'packages',
                  'cjs-app',
                  'dist',
                  'server.js',
                )} ${outputDir}`,
              ];
            },
          },
          sourceMap: !isTestBuild,
          tsconfig: 'packages/lambda/tsconfig.json',
          format: lambdaNodejs.OutputFormat.ESM,
          // Thanks: https://github.com/evanw/esbuild/issues/253#issuecomment-1042853416
          target: 'node14.8',
        },
      });
    }
    if (lambdaFuncServiceName !== undefined) {
      Tags.of(this._serviceFunc).add('Name', lambdaFuncServiceName);
    }
    if (autoDeleteEverything) {
      this._serviceFunc.applyRemovalPolicy(RemovalPolicy.DESTROY);
    }

    this._serviceFuncUrl = this._serviceFunc.addFunctionUrl({
      authType,
    });
  }
}
