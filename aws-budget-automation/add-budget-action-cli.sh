#!/bin/bash

# Add Budget Action via CLI to stop EC2/RDS instances
# This is an example - adjust instance IDs as needed

PROFILE="${AWS_PROFILE:-ecoheart}"
ACCOUNT_ID="${AWS_ACCOUNT_ID:-815408489887}"
BUDGET_NAME="${BUDGET_NAME:-My Monthly Cost Budget}"
IAM_ROLE_NAME="AWSBudgetsActionRole"

# Get role ARN
ROLE_ARN=$(aws iam get-role --role-name $IAM_ROLE_NAME --profile $PROFILE --query 'Role.Arn' --output text)

# Get all running EC2 instances
echo "Finding EC2 instances..."
EC2_INSTANCES=$(aws ec2 describe-instances \
    --filters "Name=instance-state-name,Values=running" \
    --query 'Reservations[*].Instances[*].InstanceId' \
    --output text \
    --profile $PROFILE)

# Get all running RDS instances
echo "Finding RDS instances..."
RDS_INSTANCES=$(aws rds describe-db-instances \
    --query 'DBInstances[?DBInstanceStatus==`available`].DBInstanceIdentifier' \
    --output text \
    --profile $PROFILE 2>/dev/null || echo "")

if [ -z "$EC2_INSTANCES" ] && [ -z "$RDS_INSTANCES" ]; then
    echo "⚠️  No running EC2 or RDS instances found."
    echo "   You can still create the action - it will stop instances when they exist."
    echo ""
    echo "   To create action that applies IAM deny policy instead, run:"
    echo "   ./apply-iam-deny-action.sh"
    exit 0
fi

echo "EC2 Instances to stop: $EC2_INSTANCES"
echo "RDS Instances to stop: $RDS_INSTANCES"
echo ""

# Create action definition JSON
ACTION_DEF=$(cat <<EOF
{
  "SsmActionDefinition": {
    "ActionSubType": "STOP_RESOURCE",
    "Region": "us-west-2",
    "InstanceIds": [$(echo $EC2_INSTANCES | tr ' ' '\n' | sed 's/^/"/;s/$/"/' | paste -sd,)]
  }
}
EOF
)

echo "Creating budget action..."
aws budgets create-budget-action \
    --account-id $ACCOUNT_ID \
    --budget-name "$BUDGET_NAME" \
    --notification-type ACTUAL \
    --action-type APPLY_SCP \
    --action-threshold ThresholdValue=100.0 ThresholdType=PERCENTAGE \
    --definition "$ACTION_DEF" \
    --execution-role-arn $ROLE_ARN \
    --approval-model AUTOMATIC \
    --profile $PROFILE

echo ""
echo "✅ Budget action created!"
echo ""
echo "Note: AWS Budget Actions with SSM require specific setup."
echo "For stopping instances, AWS Console is recommended for easier configuration."

