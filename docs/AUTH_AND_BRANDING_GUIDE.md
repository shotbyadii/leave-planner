# Auth Branding & Email Customization Guide

This guide explains how to:
1. Update Supabase Email Templates to match the **Slate Design System** (so emails look official and high-trust, not like a scam).
2. Configure **Google OAuth Branding** to replace the raw `vyuiuhlzxjeqwzhwocbg.supabase.co` URL on the Google login prompt with your custom App Name, Logo, and Domain.

---

## 1. Updating Supabase Email Templates

Supabase sends unstyled plaintext emails by default. Replace them with the custom **Slate Design System** HTML templates created in `src/templates/emails/`.

### Steps to Apply:
1. Open your [Supabase Project Dashboard](https://supabase.com/dashboard/project/vyuiuhlzxjeqwzhwocbg).
2. Navigate to **Authentication** (in the left sidebar) $\rightarrow$ **Email Templates**.

---

### Template A: Confirm Signup (Email Verification)
- In the **Confirm signup** tab:
- **Subject**: `Confirm your Leave Planner account`
- **Body**: Copy the full HTML contents of:
  [`src/templates/emails/confirm-signup.html`](../src/templates/emails/confirm-signup.html)
- Click **Save**.

---

### Template B: Reset Password
- In the **Reset password** tab:
- **Subject**: `Reset your Leave Planner password`
- **Body**: Copy the full HTML contents of:
  [`src/templates/emails/reset-password.html`](../src/templates/emails/reset-password.html)
- Click **Save**.

---

### Template C: Magic Link (Optional)
- In the **Magic link** tab:
- **Subject**: `Your Leave Planner sign-in link`
- **Body**: Copy the full HTML contents of:
  [`src/templates/emails/magic-link.html`](../src/templates/emails/magic-link.html)
- Click **Save**.

---

## 2. Google OAuth Branding

When users click **Continue with Google**, Google displays the consent modal:
> **"Choose an account to continue to vyuiuhlzxjeqwzhwocbg.supabase.co"**

### Why does Google show `vyuiuhlzxjeqwzhwocbg.supabase.co`?
Google's OAuth standard shows the domain of the **Authorized Redirect URI** registered in your Google Cloud OAuth Client (`https://vyuiuhlzxjeqwzhwocbg.supabase.co/auth/v1/callback`).

Here is how to brand it:

### Step 1: Brand Your Google Cloud OAuth Consent Screen (Free & Immediate)
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project that hosts the OAuth Client ID.
3. In the left navigation, go to **APIs & Services** $\rightarrow$ **OAuth consent screen**.
4. Set the following fields:
   - **App name**: `Leave Planner` (or your company name).
   - **User support email**: Select your email address.
   - **App logo**: Upload a square logo (e.g. 120x120px app icon).
   - **Application home page**: `https://sba-leaveplanner.vercel.app`
   - **Application privacy policy link**: `https://sba-leaveplanner.vercel.app`
   - **Application terms of service link**: `https://sba-leaveplanner.vercel.app`
   - **Authorized domains**:
     - `supabase.co`
     - `vercel.app`
     - *(Your custom domain if applicable)*
   - **Developer contact information**: Your email address.
5. Click **Save and Continue**.
6. **Result**: Google immediately presents your official **App Logo** and **App Name ("Leave Planner")** at the top of the Google login dialog, establishing immediate trust.

---

### Step 2: Change the Domain URL from `*.supabase.co` to Your Own Domain (Optional)
To completely replace `vyuiuhlzxjeqwzhwocbg.supabase.co` with your own domain (e.g. `auth.yourdomain.com` or `yourdomain.com`):

#### Method A: Supabase Custom Domain (Supabase Pro Plan)
1. Go to **Supabase Dashboard** $\rightarrow$ **Project Settings** $\rightarrow$ **Custom Domains**.
2. Connect your custom domain (e.g. `auth.yourdomain.com`).
3. Update Google Cloud Console Credentials $\rightarrow$ **Authorized Redirect URIs** to:
   `https://auth.yourdomain.com/auth/v1/callback`
4. Update Supabase Google Auth Provider with the new URL.
5. Google will now display:
   > *"to continue to auth.yourdomain.com"*

#### Method B: Custom OAuth Proxy / Next.js Auth API (Advanced)
If you run an independent backend domain or reverse proxy on Vercel, the OAuth handshake redirects through your Vercel URL directly.
