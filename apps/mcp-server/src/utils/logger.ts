import { CloudWatchLogsClient, PutLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";

export class AWSAuditLogger {
  private client: CloudWatchLogsClient;
  private logGroupName = "/homepilot/mcp-agent";
  private logStreamName = `run-${new Date().toISOString().split('T')[0]}`;

  constructor(region: string = process.env.AWS_REGION || 'us-east-1') {
    this.client = new CloudWatchLogsClient({ region });
  }

  public async logToolExecution(runId: string, toolName: string, latency: number, status: 'success' | 'failed') {
    const timestamp = Date.now();
    const message = JSON.stringify({ runId, toolName, latency, status, timestamp });

    try {
      const command = new PutLogEventsCommand({
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
        logEvents: [
          { message, timestamp }
        ]
      });
      await this.client.send(command);
    } catch (error) {
      console.error("[AWS CloudWatch] Failed to push log:", error);
      // Fallback to standard console out to prevent application crash
    }
  }
}
