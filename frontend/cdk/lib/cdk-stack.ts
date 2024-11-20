import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import path = require('path')
import { Constants } from './const'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkStack extends cdk.Stack {
  constructor (scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // create a bucket for static content website
    const bucket = new cdk.aws_s3.Bucket(
      this,
      id.toLowerCase() + '-game-webui',
      {
        bucketName: id.toLowerCase() + '-game-webui',
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        websiteIndexDocument: 'index.html',
        publicReadAccess: false
      }
    )

    if (Constants.useCustomDomain) {
      const hostedZone = cdk.aws_route53.HostedZone.fromLookup(
        this,
        'HostedZone',
        {
          domainName: Constants.customDomain.slice(
            Constants.customDomain.indexOf('.') + 1
          )
        }
      )
      const certificate = new cdk.aws_certificatemanager.Certificate(
        this,
        'Certificate',
        {
          domainName: Constants.customDomain,
          validation:
            cdk.aws_certificatemanager.CertificateValidation.fromDns(hostedZone)
        }
      )

      const cloudfront = new cdk.aws_cloudfront.Distribution(
        this,
        'CloudFront',
        {
          defaultBehavior: {
            origin:
              cdk.aws_cloudfront_origins.S3BucketOrigin.withOriginAccessControl(
                bucket
              ),
            originRequestPolicy:
              cdk.aws_cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
            allowedMethods: cdk.aws_cloudfront.AllowedMethods.ALLOW_ALL,
            cachePolicy: cdk.aws_cloudfront.CachePolicy.CACHING_DISABLED,
            viewerProtocolPolicy:
              cdk.aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
          },

          domainNames: [Constants.customDomain],
          certificate: certificate,
          defaultRootObject: 'index.html',
          minimumProtocolVersion:
            cdk.aws_cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021
        }
      )

      new cdk.aws_route53.CnameRecord(this, 'CnameRecord', {
        zone: hostedZone,
        recordName: Constants.customDomain.split('.').slice(0, -2).join('.'),
        domainName: cloudfront.distributionDomainName
      })
    } else {
      const cloudfront = new cdk.aws_cloudfront.Distribution(
        this,
        'CloudFront',
        {
          defaultBehavior: {
            origin:
              cdk.aws_cloudfront_origins.S3BucketOrigin.withOriginAccessControl(
                bucket
              ),
            originRequestPolicy:
              cdk.aws_cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
            allowedMethods: cdk.aws_cloudfront.AllowedMethods.ALLOW_ALL,
            cachePolicy: cdk.aws_cloudfront.CachePolicy.CACHING_DISABLED,
            viewerProtocolPolicy:
              cdk.aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
          },

          // domainNames: [Constants.customDomain],
          // certificate: certificate,
          defaultRootObject: 'index.html',
          minimumProtocolVersion:
            cdk.aws_cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021
        }
      )
    }
  }
}
