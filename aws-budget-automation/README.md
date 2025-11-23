# AWS Budget Automation - Auto Shutdown on Budget Exceeded

This automation setup will automatically stop/terminate AWS resources when your monthly budget exceeds $100.

## How It Works

1. **AWS Budgets** monitors your spending
2. When threshold is reached (e.g., 80% or 100%), it sends an alert to **SNS**
3. **SNS** triggers a **Lambda function**
4. **Lambda function** stops/terminates:
   - EC2 instances
   - RDS databases
   - ECS services (scales to 0)

## Setup Instructions

### Prerequisites
- AWS CLI configured with `ecoheart` profile
- Appropriate IAM permissions to create Lambda, IAM roles, SNS topics, and Budget actions

### Quick Setup

1. **Run the setup script:**
   ```bash
   cd aws-budget-automation
   chmod +x setup-budget-automation.sh
   ./setup-budget-automation.sh
   ```

2. **Configure Budget Actions in AWS Console:**
   - Go to AWS Budgets → Your Budget → Edit
   - Add action at 80% threshold (warning)
   - Add action at 100% threshold (shutdown)
   - Select SNS topic: `budget-alerts`

### Manual Setup (Alternative)

If you prefer to set up manually or the script fails:

#### 1. Create IAM Role
```bash
aws iam create-role \
  --role-name budget-shutdown-role \
  --assume-role-policy-document file://trust-policy.json \
  --profile ecoheart

aws iam put-role-policy \
  --role-name budget-shutdown-role \
  --policy-name budget-shutdown-policy \
  --policy-document file://iam-policy.json \
  --profile ecoheart
```

#### 2. Create Lambda Function
```bash
zip lambda_function.zip lambda_function.py

aws lambda create-function \
  --function-name budget-shutdown-handler \
  --runtime python3.11 \
  --role <ROLE_ARN> \
  --handler lambda_function.lambda_handler \
  --zip-file fileb://lambda_function.zip \
  --timeout 300 \
  --environment Variables="{ACTION_TYPE=stop}" \
  --profile ecoheart
```

#### 3. Create SNS Topic and Subscribe
```bash
# Create topic
SNS_ARN=$(aws sns create-topic --name budget-alerts --profile ecoheart --query 'TopicArn' --output text)

# Subscribe Lambda
aws sns subscribe \
  --topic-arn $SNS_ARN \
  --protocol lambda \
  --notification-endpoint <LAMBDA_ARN> \
  --profile ecoheart

# Grant permission
aws lambda add-permission \
  --function-name budget-shutdown-handler \
  --statement-id sns-invoke \
  --action lambda:InvokeFunction \
  --principal sns.amazonaws.com \
  --source-arn $SNS_ARN \
  --profile ecoheart
```

#### 4. Configure Budget Actions
Use AWS Console or CLI to add actions to your budget that trigger at:
- 80% threshold → Warning notification
- 100% threshold → Shutdown action

## Configuration Options

### Change Action Type (Stop vs Terminate)

**Stop (default)** - Resources can be restarted:
```bash
aws lambda update-function-configuration \
  --function-name budget-shutdown-handler \
  --environment Variables="{ACTION_TYPE=stop}" \
  --profile ecoheart
```

**Terminate** - Resources are permanently deleted:
```bash
aws lambda update-function-configuration \
  --function-name budget-shutdown-handler \
  --environment Variables="{ACTION_TYPE=terminate}" \
  --profile ecoheart
```

⚠️ **Warning**: Terminate permanently deletes resources. Use with caution!

## Testing

Test the Lambda function manually:
```bash
# Create a test event
cat > test-event.json <<EOF
{
  "Records": [{
    "Sns": {
      "Message": "{\"budgetName\":\"My Monthly Cost Budget\",\"budgetLimit\":{\"amount\":\"100.0\"},\"actualSpend\":{\"amount\":\"101.0\"},\"threshold\":{\"amount\":\"100.0\",\"type\":\"PERCENTAGE\"}}"
    }
  }]
}
EOF

# Invoke Lambda
aws lambda invoke \
  --function-name budget-shutdown-handler \
  --payload file://test-event.json \
  --profile ecoheart \
  response.json

cat response.json
```

## Monitoring

Check CloudWatch Logs for Lambda execution:
```bash
aws logs tail /aws/lambda/budget-shutdown-handler --follow --profile ecoheart
```

## Troubleshooting

1. **Lambda not triggered**: Check SNS subscription and Lambda permissions
2. **Resources not stopping**: Verify IAM role has necessary permissions
3. **Budget actions not working**: Ensure budget actions are properly configured in AWS Budgets

## Cost

- Lambda: Free tier includes 1M requests/month
- SNS: First 1M requests/month free
- Budgets: Free service
- **Total cost: ~$0 for typical usage**

## Safety Features

- Resources are STOPPED by default (not terminated)
- You can restart stopped resources manually
- Budget actions can be disabled in AWS Console
- Lambda logs all actions for audit trail

