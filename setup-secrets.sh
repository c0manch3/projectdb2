#!/bin/bash

# Script to add GitHub secrets for CI/CD
# Run: gh auth login first, then execute this script

REPO="c0manch3/projectdb2"

echo "Adding GitHub secrets for $REPO..."

# SSH Private Key for server access
gh secret set SSH_PRIVATE_KEY --repo $REPO < ~/.ssh/njs

# Database URLs (from backend/.env)
gh secret set DATABASE_URL --repo $REPO --body "postgresql://postgres.oeqdbufisashaxvfkkow:d2Tw7pXrsYPfk82Y@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
gh secret set DIRECT_URL --repo $REPO --body "postgresql://postgres.oeqdbufisashaxvfkkow:d2Tw7pXrsYPfk82Y@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

# JWT Secrets (generate new ones for production)
gh secret set JWT_ACCESS_SECRET --repo $REPO --body "projectdb2-access-secret-$(openssl rand -hex 32)"
gh secret set JWT_REFRESH_SECRET --repo $REPO --body "projectdb2-refresh-secret-$(openssl rand -hex 32)"

echo "Done! Secrets have been added to GitHub."
echo "You can verify at: https://github.com/$REPO/settings/secrets/actions"
