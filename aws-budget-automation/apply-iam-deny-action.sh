#!/bin/bash

# Add Budget Action to apply IAM Deny Policy when budget exceeds threshold
# This prevents new resources from being created

PROFILE="${AWS_PROFILE:-ecoheart}"
ACCOUNT_ID="${AWS_ACCOUNT_ID:-815408489887}"
BUDGET_NAME="${BUDGET_NAME:-My Monthly Cost Budget}"
IAM_ROLE_NAME="AWSBudgetsActionRole"

# Get role ARN
ROLE_ARN=$(aws iam get-role --role-name $IAM_ROLE_NAME --profile $PROFILE --query 'Role.Arn' --output text)

echo "Creating budget action to apply IAM Deny Policy at 100% threshold..."
echo ""

aws budgets create-budget-action \
    --account-id $ACCOUNT_ID \
    --budget-name "$BUDGET_NAME" \
    --notification-type ACTUAL \
    --action-type APPLY_IAM_POLICY \
    --action-threshold ThresholdValue=100.0 ThresholdType=PERCENTAGE \
    --definition '{
        "IamActionDefinition": {
            "PolicyArn": "arn:aws:iam::aws:policy/AWSDenyAll"
        }
    }' \
    --execution-role-arn $ROLE_ARN \
    --approval-model AUTOMATIC \
    --profile $PROFILE

echo ""
echo "✅ Budget action created!"
echo ""
echo "This action will apply the AWSDenyAll policy when your budget reaches 100%."
echo "This prevents new resources from being created but doesn't stop existing ones."
echo ""
echo "To stop existing EC2/RDS instances, use AWS Console to add another action:"
echo "1. Go to AWS Budgets console"
echo "2. Edit your budget"
echo "3. Add action to target specific EC2/RDS instances"

