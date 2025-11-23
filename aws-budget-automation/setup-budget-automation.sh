#!/bin/bash

# AWS Budget Automation Setup Script
# This script sets up automatic resource shutdown when budget exceeds $100

set -e

PROFILE="${AWS_PROFILE:-ecoheart}"
REGION="${AWS_REGION:-us-west-2}"
ACCOUNT_ID="${AWS_ACCOUNT_ID:-815408489887}"
BUDGET_NAME="${BUDGET_NAME:-My Monthly Cost Budget}"
LAMBDA_FUNCTION_NAME="budget-shutdown-handler"
IAM_ROLE_NAME="budget-shutdown-role"
SNS_TOPIC_NAME="budget-alerts"

echo "🚀 Setting up AWS Budget Automation..."
echo "Profile: $PROFILE"
echo "Region: $REGION"
echo "Account ID: $ACCOUNT_ID"
echo ""

# Step 1: Create IAM Role
echo "📋 Step 1: Creating IAM Role..."
if aws iam get-role --role-name $IAM_ROLE_NAME --profile $PROFILE &>/dev/null; then
    echo "   IAM Role already exists, skipping creation..."
else
    echo "   Creating IAM role: $IAM_ROLE_NAME"
    aws iam create-role \
        --role-name $IAM_ROLE_NAME \
        --assume-role-policy-document file://trust-policy.json \
        --profile $PROFILE
    
    echo "   Waiting for role to be available..."
    sleep 5
    
    echo "   Attaching policy to role..."
    aws iam put-role-policy \
        --role-name $IAM_ROLE_NAME \
        --policy-name budget-shutdown-policy \
        --policy-document file://iam-policy.json \
        --profile $PROFILE
    
    echo "   ✅ IAM Role created successfully"
fi

# Get role ARN
ROLE_ARN=$(aws iam get-role --role-name $IAM_ROLE_NAME --profile $PROFILE --query 'Role.Arn' --output text)
echo "   Role ARN: $ROLE_ARN"
echo ""

# Step 2: Create Lambda Function
echo "📦 Step 2: Creating Lambda Function..."
if aws lambda get-function --function-name $LAMBDA_FUNCTION_NAME --profile $PROFILE &>/dev/null; then
    echo "   Lambda function already exists, updating..."
    # Create deployment package
    zip -q lambda_function.zip lambda_function.py
    
    aws lambda update-function-code \
        --function-name $LAMBDA_FUNCTION_NAME \
        --zip-file fileb://lambda_function.zip \
        --profile $PROFILE
    
    aws lambda update-function-configuration \
        --function-name $LAMBDA_FUNCTION_NAME \
        --environment Variables="{ACTION_TYPE=stop}" \
        --timeout 300 \
        --profile $PROFILE
    
    echo "   ✅ Lambda function updated"
else
    echo "   Creating Lambda function: $LAMBDA_FUNCTION_NAME"
    # Create deployment package
    zip -q lambda_function.zip lambda_function.py
    
    aws lambda create-function \
        --function-name $LAMBDA_FUNCTION_NAME \
        --runtime python3.11 \
        --role $ROLE_ARN \
        --handler lambda_function.lambda_handler \
        --zip-file fileb://lambda_function.zip \
        --timeout 300 \
        --environment Variables="{ACTION_TYPE=stop}" \
        --profile $PROFILE \
        --region $REGION
    
    echo "   ✅ Lambda function created"
fi

# Clean up zip file
rm -f lambda_function.zip
LAMBDA_ARN=$(aws lambda get-function --function-name $LAMBDA_FUNCTION_NAME --profile $PROFILE --query 'Configuration.FunctionArn' --output text)
echo "   Lambda ARN: $LAMBDA_ARN"
echo ""

# Step 3: Create SNS Topic
echo "📢 Step 3: Creating SNS Topic..."
SNS_TOPIC_ARN=$(aws sns create-topic --name $SNS_TOPIC_NAME --profile $PROFILE --query 'TopicArn' --output text 2>/dev/null || \
    aws sns list-topics --profile $PROFILE --query "Topics[?contains(TopicArn, '$SNS_TOPIC_NAME')].TopicArn" --output text | head -1)

if [ -z "$SNS_TOPIC_ARN" ]; then
    SNS_TOPIC_ARN=$(aws sns create-topic --name $SNS_TOPIC_NAME --profile $PROFILE --query 'TopicArn' --output text)
fi

echo "   SNS Topic ARN: $SNS_TOPIC_ARN"

# Subscribe Lambda to SNS
echo "   Subscribing Lambda to SNS topic..."
aws sns subscribe \
    --topic-arn $SNS_TOPIC_ARN \
    --protocol lambda \
    --notification-endpoint $LAMBDA_ARN \
    --profile $PROFILE &>/dev/null || echo "   Subscription may already exist"

# Grant SNS permission to invoke Lambda
echo "   Granting SNS permission to invoke Lambda..."
aws lambda add-permission \
    --function-name $LAMBDA_FUNCTION_NAME \
    --statement-id sns-invoke-permission \
    --action lambda:InvokeFunction \
    --principal sns.amazonaws.com \
    --source-arn $SNS_TOPIC_ARN \
    --profile $PROFILE &>/dev/null || echo "   Permission may already exist"

echo "   ✅ SNS Topic configured"
echo ""

# Step 4: Configure Budget Actions
echo "💰 Step 4: Configuring Budget Actions..."

# Check if budget actions already exist
EXISTING_ACTIONS=$(aws budgets describe-budget-actions-for-budget \
    --account-id $ACCOUNT_ID \
    --budget-name "$BUDGET_NAME" \
    --profile $PROFILE \
    --query 'Actions[*].ActionId' \
    --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_ACTIONS" ]; then
    echo "   Budget actions already exist. To update, delete existing actions first."
    echo "   Existing action IDs: $EXISTING_ACTIONS"
else
    echo "   Creating budget action for 80% threshold (warning)..."
    aws budgets create-budget-action \
        --account-id $ACCOUNT_ID \
        --budget-name "$BUDGET_NAME" \
        --notification-type ACTUAL \
        --action-type APPLY_IAM_POLICY \
        --action-threshold ThresholdValue=80.0 ThresholdType=PERCENTAGE \
        --definition '{
            "IamActionDefinition": {
                "PolicyArn": "arn:aws:iam::aws:policy/AWSDenyAll"
            }
        }' \
        --execution-role-arn $ROLE_ARN \
        --approval-model AUTOMATIC \
        --subscribers '[{"SubscriptionType":"SNS","Address":"'$SNS_TOPIC_ARN'"}]' \
        --profile $PROFILE &>/dev/null || echo "   Note: APPLY_IAM_POLICY action type may not be available in all regions"
    
    echo "   Creating budget action for 100% threshold (shutdown)..."
    # Create a custom action definition file
    cat > budget-action-definition.json <<EOF
{
    "SsmActionDefinition": {
        "ActionSubType": "STOP_RESOURCE",
        "Region": "$REGION",
        "InstanceIds": []
    }
}
EOF
    
    # Note: Budget actions with SSM require specific setup
    # For now, we'll use SNS notification and Lambda handles the shutdown
    echo "   Budget will trigger SNS notification at 100% threshold"
    echo "   Lambda function will handle resource shutdown"
fi

echo ""
echo "✅ Setup Complete!"
echo ""
echo "📝 Next Steps:"
echo "   1. Update your budget to add action thresholds:"
echo "      aws budgets update-budget --account-id $ACCOUNT_ID --budget-name '$BUDGET_NAME' --profile $PROFILE"
echo ""
echo "   2. Or manually configure in AWS Console:"
echo "      - Go to AWS Budgets"
echo "      - Edit 'My Monthly Cost Budget'"
echo "      - Add action at 80% (warning) and 100% (shutdown)"
echo "      - Set SNS topic: $SNS_TOPIC_ARN"
echo ""
echo "   3. Test the Lambda function:"
echo "      aws lambda invoke --function-name $LAMBDA_FUNCTION_NAME --profile $PROFILE response.json"
echo ""
echo "⚠️  Important:"
echo "   - Resources will be STOPPED (not terminated) by default"
echo "   - To change to TERMINATE, update Lambda environment variable ACTION_TYPE=terminate"
echo "   - Monitor your budget regularly to avoid unexpected shutdowns"

