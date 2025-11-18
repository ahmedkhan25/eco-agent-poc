# Quick Start Checklist for Render Deployment

## ✅ Completed Automatically

- [x] Created `render.yaml` Blueprint configuration
- [x] Pushed code to GitHub repository
- [x] Created deployment guide

## 📋 Manual Steps Required

### Step 1: Google OAuth Setup (15 minutes)

**1.1 Create Google Cloud OAuth Credentials**
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com)
- [ ] Create new project or select existing
- [ ] Enable Google+ API (APIs & Services → Library)
- [ ] Configure OAuth consent screen (if prompted)
- [ ] Create OAuth 2.0 Client ID:
  - Type: Web application
  - Authorized redirect URIs:
    - `https://[your-supabase-project-id].supabase.co/auth/v1/callback`
    - `https://[your-render-app].onrender.com/auth/callback` (add after deployment)
- [ ] Copy Client ID and Client Secret

**1.2 Configure in Supabase**
- [ ] Go to Supabase Dashboard → Authentication → Providers
- [ ] Enable Google provider
- [ ] Enter Google Client ID and Client Secret
- [ ] Save configuration

**1.3 Update Supabase URLs** (do after deployment)
- [ ] Go to Authentication → URL Configuration
- [ ] Add Site URL: `https://[your-render-app].onrender.com`
- [ ] Add Redirect URL: `https://[your-render-app].onrender.com/auth/callback`

### Step 2: Deploy to Render (10 minutes)

**2.1 Create Blueprint**
- [ ] Go to [Render Dashboard](https://dashboard.render.com)
- [ ] Click "New" → "Blueprint"
- [ ] Connect GitHub account (if not connected)
- [ ] Select repository: `ahmedkhan25/eco-agent-poc`
- [ ] Click "Apply"

**2.2 Enter Environment Variables**

When prompted, enter these values:

| Variable | Where to Find |
|----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role key |
| `VALYU_API_KEY` | Your Valyu API key (get from platform.valyu.ai) |
| `OPENAI_API_KEY` | Your OpenAI API key (get from platform.openai.com) |
| `NEXT_PUBLIC_APP_URL` | Leave empty for now (set after deployment) |
| `DAYTONA_API_KEY` | Leave empty (can add later) |

**2.3 Deploy**
- [ ] Review configuration
- [ ] Click "Apply" to deploy
- [ ] Wait for deployment (5-10 minutes)
- [ ] Copy your service URL (format: `https://eco-agent-poc-xxx.onrender.com`)

### Step 3: Post-Deployment Configuration (5 minutes)

**3.1 Update Render Environment Variables**
- [ ] Go to Render Dashboard → Your Service → Environment
- [ ] Update `NEXT_PUBLIC_APP_URL` with your Render service URL

**3.2 Update Supabase Redirect URLs**
- [ ] Go to Supabase Dashboard → Authentication → URL Configuration
- [ ] Update Site URL to your Render service URL
- [ ] Ensure redirect URL includes: `https://[your-service].onrender.com/auth/callback`

**3.3 Update Google OAuth Redirect URIs**
- [ ] Go to Google Cloud Console → Credentials
- [ ] Edit your OAuth 2.0 Client ID
- [ ] Add redirect URI: `https://[your-service].onrender.com/auth/callback`
- [ ] Save

**3.4 Test**
- [ ] Visit your Render service URL
- [ ] Click "Sign in with Google"
- [ ] Complete OAuth flow
- [ ] Verify login works
- [ ] Test chat functionality

## 🎉 You're Done!

Your application should now be live on Render with Google OAuth authentication.

## 📚 Detailed Instructions

For more detailed instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## 🔧 Troubleshooting

- **Build fails?** Check Render logs for errors
- **OAuth not working?** Verify redirect URIs match exactly in all three places (Google, Supabase, Render)
- **Service not starting?** Check environment variables are all set correctly

