# AWS Integration

This document outlines the required IAM roles and policies for Bedrock Runtime and CloudWatch logging in the Homepilot project.

## CloudWatch Logging

To allow the `AWSAuditLogger` to publish to CloudWatch:

1.  **IAM Policy:**
    ```json
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": [
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:PutLogEvents"
          ],
          "Resource": "arn:aws:logs:*:*:log-group:/homepilot/mcp-agent:*"
        }
      ]
    }
    ```

2.  **IAM Role:** Attach this policy to the execution role used by the `mcp-server` application.

## Bedrock Runtime

To allow the `BedrockProvider` to invoke models:

1.  **IAM Policy:**
    ```json
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": [
            "bedrock:InvokeModel",
            "bedrock:InvokeModelWithResponseStream"
          ],
          "Resource": "arn:aws:bedrock:*:*:model/*"
        }
      ]
    }
    ```

2.  **IAM Role:** Attach this policy to the same execution role or use dedicated credentials via environment variables (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`).
