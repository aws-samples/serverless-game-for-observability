import { Construct } from "constructs";
import * as cdk from 'aws-cdk-lib';
import * as aps from 'aws-cdk-lib/aws-aps';


export class OpenSourceObservability {
    public workspace: aps.CfnWorkspace
    constructor(scope: Construct, id: string, props?: any) {
        // create a amazon managed prometheus workspace
        this.workspace = new aps.CfnWorkspace(scope, 'MyCfnWorkspace', {
            alias: 'serverless-observability-workspace'
        });

        // create role for grafana to access prometheus workspace
        const role = new cdk.aws_iam.Role(scope, 'grafana-role', {
            assumedBy: new cdk.aws_iam.ServicePrincipal('grafana.amazonaws.com'),
            managedPolicies: [
                cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonPrometheusFullAccess')
            ]
        });

        // create a grafana workspace
        const grafana = new cdk.aws_grafana.CfnWorkspace(scope, 'grafana-workspace', {
            accountAccessType: 'CURRENT_ACCOUNT',
            name: 'serverless-observability-workspace',
            authenticationProviders: ['AWS_SSO'],
            permissionType: 'SERVICE_MANAGED',
            dataSources: ['PROMETHEUS'],
            roleArn: role.roleArn,
            
        });

        // add output for amp remote write endpoint
        new cdk.CfnOutput(scope, 'AmpRemoteWriteEndpoint', { value: this.workspace.attrPrometheusEndpoint });
        
    }
}