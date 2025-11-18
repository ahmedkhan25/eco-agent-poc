# Deployment Guide for Render

This guide walks you through deploying the eco-agent-poc application to Render with Supabase and Google OAuth authentication.

## Prerequisites

- ✅ Supabase project with tables set up
- ✅ Valyu API key
- ✅ OpenAI API key
- ⚠️ Google OAuth credentials (setup instructions below)
- ⚠️ Daytona API key (optional, can add later)

## Step 1: Set Up Google OAuth Credentials

### 1.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Enter project name (e.g., "eco-agent-poc")
4. Click "Create"
5. Wait for project creation to complete

### 1.2 Enable Required APIs

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Google+ API" and enable it
3. Search for "Google Identity" and ensure it's enabled

### 1.3 Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. If prompted, configure OAuth consent screen:
   - User Type: **External** (unless you have Google Workspace)
   - App name: **Eco Agent POC** (or your preferred name)
   - User support email: Your email
   - Developer contact: Your email
   - Click **"Save and Continue"**
   - Scopes: Click **"Save and Continue"** (default scopes are fine)
   - Test users: Add your email if needed, then **"Save and Continue"**
4. Back in Credentials, click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
5. Application type: **Web application**
6. Name: **Eco Agent POC Web Client**
7. **Authorized JavaScript origins:**
   - `https://[your-supabase-project-id].supabase.co`
   - `https://[your-render-app-name].onrender.com` (you'll add this after deployment)
8. **Authorized redirect URIs:**
   - `https://[your-supabase-project-id].supabase.co/auth/v1/callback`
   - `https://[your-render-app-name].onrender.com/auth/callback` (you'll add this after deployment)
9. Click **"Create"**
10. **Copy the Client ID and Client Secret** - you'll need these for Supabase

### 1.4 Configure Google Provider in Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Authentication** → **Providers**
4. Find **Google** in the list and click to expand
5. Toggle **"Enable Google provider"** to ON
6. Enter your **Google Client ID** (from step 1.3)
7. Enter your **Google Client Secret** (from step 1.3)
8. Click **"Save"**

### 1.5 Configure Supabase URL Settings

1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. **Site URL:** Leave as default for now (you'll update after deployment)
3. **Redirect URLs:** Add these URLs:
   - `https://[your-render-app-name].onrender.com/auth/callback`
   - `http://localhost:3000/auth/callback` (for local testing)

**Note:** Replace `[your-render-app-name]` with your actual Render service name after deployment.

## Step 2: Deploy to Render

### 2.1 Create Blueprint in Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub account if not already connected
4. Select repository: **ahmedkhan25/eco-agent-poc**
5. Render will detect `render.yaml` automatically
6. Click **"Apply"**

### 2.2 Configure Environment Variables

Render will prompt you to enter values for environment variables marked with `sync: false`. Enter the following:

**Required Environment Variables:**

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Value: Your Supabase project URL
   - Format: `https://[project-id].supabase.co`
   - Find in: Supabase Dashboard → Project Settings → API → Project URL

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Value: Your Supabase anonymous/public key
   - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Find in: Supabase Dashboard → Project Settings → API → anon public key

3. **SUPABASE_SERVICE_ROLE_KEY**
   - Value: Your Supabase service role key (keep secret!)
   - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Find in: Supabase Dashboard → Project Settings → API → service_role key
   - ⚠️ **Keep this secret - never expose client-side**

4. **VALYU_API_KEY**
   - Value: Your Valyu API key
   - Format: `aOGm3BhbWQ1v2cqhyAYL1azUPypHQumd6pDnRQNl` (your actual key)

5. **OPENAI_API_KEY**
   - Value: Your OpenAI API key
   - Format: `sk-proj-...` (your actual key)

6. **NEXT_PUBLIC_APP_URL**
   - Value: Leave empty for now - you'll set this after deployment
   - After deployment, set to: `https://[your-service-name].onrender.com`

**Optional Environment Variables (can add later):**

7. **DAYTONA_API_KEY**
   - Value: Leave empty for now (can add later)
   - Required for Python code execution features

8. **DAYTONA_API_URL**
   - Value: Already set to `https://api.daytona.io` in render.yaml

9. **DAYTONA_TARGET**
   - Value: Already set to `latest` in render.yaml

### 2.3 Deploy

1. Review all environment variables
2. Click **"Apply"** to start deployment
3. Monitor the build logs in Render Dashboard
4. Wait for deployment to complete (5-10 minutes)

## Step 3: Post-Deployment Configuration

### 3.1 Get Your Render Service URL

1. After deployment completes, go to your service page in Render Dashboard
2. Find your service URL (format: `https://eco-agent-poc-[random].onrender.com`)
3. Copy this URL

### 3.2 Update Environment Variables

1. In Render Dashboard, go to your service → **Environment**
2. Update **NEXT_PUBLIC_APP_URL** with your Render service URL:
   - Value: `https://[your-service-name].onrender.com`

### 3.3 Update Supabase Redirect URLs

1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Update **Site URL** to your Render service URL:
   - `https://[your-service-name].onrender.com`
3. Ensure **Redirect URLs** includes:
   - `https://[your-service-name].onrender.com/auth/callback`

### 3.4 Update Google OAuth Redirect URIs

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Add to **Authorized redirect URIs**:
   - `https://[your-service-name].onrender.com/auth/callback`
5. Click **"Save"**

### 3.5 Redeploy (if needed)

If you updated environment variables, Render will automatically redeploy. Otherwise, you can manually trigger a redeploy from the Render Dashboard.

## Step 4: Test Deployment

1. Visit your Render service URL: `https://[your-service-name].onrender.com`
2. Click **"Sign in with Google"**
3. Complete Google OAuth flow
4. Verify you're logged in
5. Test chat functionality
6. Check Supabase Dashboard → **Authentication** → **Users** to see your user

## Troubleshooting

### Build Fails

- **Error:** `npm install` fails
  - **Solution:** The build command uses `--legacy-peer-deps` flag, which should handle dependency conflicts

- **Error:** Missing environment variables
  - **Solution:** Check Render Dashboard → Environment and ensure all required variables are set

### OAuth Not Working

- **Error:** "redirect_uri_mismatch"
  - **Solution:** Verify redirect URIs in Google Cloud Console match exactly (including https://)
  - **Solution:** Check Supabase redirect URLs configuration

- **Error:** Google provider not enabled
  - **Solution:** Verify Google provider is enabled in Supabase Dashboard → Authentication → Providers

### Database Errors

- **Error:** "relation does not exist"
  - **Solution:** Verify all tables were created in Supabase (run schema.sql if needed)

- **Error:** "permission denied"
  - **Solution:** Check Row Level Security policies are enabled in Supabase

### Service Not Starting

- **Error:** Port binding issues
  - **Solution:** Next.js uses port 3000 by default, which Render handles automatically

- **Error:** Service spins down
  - **Solution:** Free tier services spin down after 15 minutes of inactivity. First request after spin-down takes longer.

## Adding Daytona API Key Later

When you get your Daytona API key:

1. Go to Render Dashboard → Your Service → **Environment**
2. Add or update **DAYTONA_API_KEY** with your key
3. Render will automatically redeploy

## Next Steps

- Monitor service logs in Render Dashboard
- Set up custom domain (optional)
- Upgrade to paid tier for always-on service (optional)
- Configure monitoring and alerts (optional)

## Support

- Render Documentation: https://render.com/docs
- Supabase Documentation: https://supabase.com/docs
- Google OAuth Setup: https://developers.google.com/identity/protocols/oauth2

