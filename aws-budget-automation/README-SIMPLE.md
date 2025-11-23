# Simple AWS Budget Action Setup

This is a **much simpler** approach using AWS Budget Actions directly - no Lambda or SNS needed!

## What AWS Budget Actions Can Do

1. **Stop EC2/RDS instances** - Directly stop specific instances when budget threshold is exceeded
2. **Apply IAM Deny Policy** - Prevent new resources from being created
3. **Apply Service Control Policy (SCP)** - For organizations

## Quick Setup (2 Steps)

### Step 1: Create IAM Role

```bash
cd aws-budget-automation
chmod +x setup-budget-action.sh
./setup-budget-action.sh
```

This creates the IAM role that AWS Budgets needs to perform actions.

### Step 2: Configure Budget Action in AWS Console

1. Go to [AWS Budgets Console](https://console.aws.amazon.com/billing/home#/budgets)
2. Click on **"My Monthly Cost Budget"**
3. Click **"Edit"**
4. Scroll to **"Configure alerts"** section
5. Add an alert threshold at **100%** (or $100 absolute)
6. Click **"Add Action"**
7. Select IAM role: **AWSBudgetsActionRole**
8. Choose action type: **"Target specific EC2 or RDS instances"**
9. Select instances to stop:
   - Choose **"All instances"** to stop everything, OR
   - Select specific instance IDs
10. Choose **"Yes"** for automatic execution
11. Click **"Save"**

## Alternative: Apply IAM Deny Policy (CLI)

If you want to prevent new resources instead of stopping existing ones:

```bash
chmod +x apply-iam-deny-action.sh
./apply-iam-deny-action.sh
```

This applies `AWSDenyAll` policy when budget reaches 100%, preventing new resource creation.

## How It Works

- **AWS Budgets** monitors your spending
- When threshold is reached (100% = $100), it **automatically**:
  - Stops your selected EC2/RDS instances, OR
  - Applies IAM deny policy to prevent new resources
- No Lambda, no SNS, no code needed!

## Testing

1. Check your current budget:
   ```bash
   aws budgets describe-budgets --account-id ${AWS_ACCOUNT_ID:-815408489887} --profile ecoheart
   ```

2. View configured actions:
   ```bash
   aws budgets describe-budget-actions-for-budget \
     --account-id ${AWS_ACCOUNT_ID:-815408489887} \
     --budget-name "My Monthly Cost Budget" \
     --profile ecoheart
   ```

## Important Notes

- **Stopping instances**: They can be restarted manually later
- **IAM Deny Policy**: Prevents new resources but doesn't stop existing ones
- **Automatic vs Manual**: Choose "automatic" for immediate action, "manual" for approval workflow
- **Multiple Actions**: You can configure multiple actions at different thresholds (e.g., 80% warning, 100% shutdown)

## Cost

- **AWS Budgets**: Free service
- **Budget Actions**: Free
- **Total cost: $0**

## Troubleshooting

- **Action not running**: Check IAM role has correct permissions
- **Instances not stopping**: Verify instance IDs are correct in action configuration
- **Can't create action**: Ensure IAM role exists and has `AWSBudgetsActionRole` name

