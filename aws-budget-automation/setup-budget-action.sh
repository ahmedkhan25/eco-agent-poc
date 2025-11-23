#!/bin/bash

# Simple AWS Budget Action Setup
# This sets up an IAM role for AWS Budgets to stop resources when budget exceeds $100

set -e

PROFILE="${AWS_PROFILE:-ecoheart}"
REGION="${AWS_REGION:-us-west-2}"
ACCOUNT_ID="${AWS_ACCOUNT_ID:-815408489887}"
BUDGET_NAME="${BUDGET_NAME:-My Monthly Cost Budget}"
IAM_ROLE_NAME="AWSBudgetsActionRole"

echo "🚀 Setting up AWS Budget Action..."
echo "Profile: $PROFILE"
echo "Region: $REGION"
echo "Account ID: $ACCOUNT_ID"
echo ""

# Step 1: Create IAM Role for AWS Budgets
echo "📋 Step 1: Creating IAM Role for AWS Budgets..."

if aws iam get-role --role-name $IAM_ROLE_NAME --profile $PROFILE &>/dev/null; then
    echo "   ✅ IAM Role already exists: $IAM_ROLE_NAME"
else
    echo "   Creating IAM role: $IAM_ROLE_NAME"
    aws iam create-role \
        --role-name $IAM_ROLE_NAME \
        --assume-role-policy-document file://budget-action-trust-policy.json \
        --profile $PROFILE
    
    echo "   Waiting for role to be available..."
    sleep 5
    
    echo "   Attaching AWS managed policy..."
    # Attach the AWS managed policy for budget actions
    aws iam attach-role-policy \
        --role-name $IAM_ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/AWSBudgetsActionsWithAWSResourceControlAccess \
        --profile $PROFILE
    
    echo "   ✅ IAM Role created successfully"
fi

# Get role ARN
ROLE_ARN=$(aws iam get-role --role-name $IAM_ROLE_NAME --profile $PROFILE --query 'Role.Arn' --output text)
echo "   Role ARN: $ROLE_ARN"
echo ""

echo "✅ Setup Complete!"
echo ""
echo "📝 Next Steps - Configure Budget Action:"
echo ""
echo "Option 1: Using AWS Console (Recommended)"
echo "   1. Go to AWS Budgets: https://console.aws.amazon.com/billing/home#/budgets"
echo "   2. Click on 'My Monthly Cost Budget'"
echo "   3. Click 'Edit'"
echo "   4. Scroll to 'Configure alerts' section"
echo "   5. Add an alert threshold at 100% (or $100)"
echo "   6. Click 'Add Action'"
echo "   7. Select IAM role: $IAM_ROLE_NAME"
echo "   8. Choose action type: 'Target specific EC2 or RDS instances'"
echo "   9. Select instances to stop (or 'All instances')"
echo "   10. Choose 'Yes' for automatic execution"
echo "   11. Save the budget"
echo ""
echo "Option 2: Using AWS CLI"
echo "   Run the following command to add a budget action:"
echo ""
echo "   aws budgets create-budget-action \\"
echo "     --account-id $ACCOUNT_ID \\"
echo "     --budget-name '$BUDGET_NAME' \\"
echo "     --notification-type ACTUAL \\"
echo "     --action-type APPLY_IAM_POLICY \\"
echo "     --action-threshold ThresholdValue=100.0 ThresholdType=PERCENTAGE \\"
echo "     --definition '{\"IamActionDefinition\":{\"PolicyArn\":\"arn:aws:iam::aws:policy/AWSDenyAll\"}}' \\"
echo "     --execution-role-arn $ROLE_ARN \\"
echo "     --approval-model AUTOMATIC \\"
echo "     --profile $PROFILE"
echo ""
echo "⚠️  Note:"
echo "   - Budget actions can stop EC2/RDS instances OR apply IAM policies"
echo "   - For stopping instances, use AWS Console (easier to select instances)"
echo "   - For applying IAM deny policy, use CLI command above"
echo "   - You can configure multiple actions at different thresholds"

