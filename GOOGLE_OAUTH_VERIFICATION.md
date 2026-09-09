# Google OAuth Verification Checklist for PassNotice

This document outlines the steps required to configure and submit PassNotice for Google OAuth verification so that advocates can connect their Gmail accounts to send legal notices.

## 1. Application Architecture & Justification

- **Application Name:** PassNotice
- **Application Purpose:** PassNotice is workflow automation software that allows advocates and legal professionals to generate and send legal notices.
- **Requested Scopes:**
  - `https://www.googleapis.com/auth/gmail.send`
  - `https://www.googleapis.com/auth/userinfo.email`
- **Justification for `gmail.send`:** PassNotice requests Gmail send permission so an advocate can authorize PassNotice to send legal notices directly from the advocate's own Gmail account. The permission is used exclusively to send the emails generated and explicitly requested by the advocate through the PassNotice interface. PassNotice does *not* read, modify, or manage the advocate's mailbox.

## 2. Google Cloud Console Configuration

### A. OAuth Consent Screen
- **User Type:** External
- **App Name:** PassNotice
- **User Support Email:** hello@passnotice.com (or your configured Google Cloud admin email)
- **App Logo:** Upload a square, professional logo matching the PassNotice brand.
- **App Domain Links:**
  - **Application Homepage:** `https://your-production-domain.com/`
  - **Privacy Policy Link:** `https://your-production-domain.com/privacy`
  - **Terms of Service Link:** `https://your-production-domain.com/terms`
- **Authorized Domains:** `your-production-domain.com`

### B. OAuth Credentials (Client ID)
- **Application Type:** Web Application
- **Authorized JavaScript Origins:**
  - `https://your-production-domain.com`
- **Authorized Redirect URIs:**
  - `https://api.your-production-domain.com/api/gmail/callback` (or wherever the backend is hosted)
  
*Note: During development, these were `http://localhost:3000` and `http://localhost:4000/api/gmail/callback`.*

## 3. Deployment Checklist

Before submitting for verification, ensure the following are completed in your production environment:

- [ ] Ensure all environment variables are correctly set for production:
  - `FRONTEND_URL` in backend `.env`
  - `GOOGLE_CLIENT_ID` in backend `.env`
  - `GOOGLE_CLIENT_SECRET` in backend `.env` (Never expose this to the frontend)
  - `GOOGLE_REDIRECT_URI` in backend `.env`
  - `NEXT_PUBLIC_API_URL` in frontend `.env.production`
- [ ] Ensure the PassNotice homepage is accessible without authentication.
- [ ] Ensure the `/privacy` and `/terms` pages are accessible without authentication.
- [ ] Test the full OAuth flow manually using the exact production URLs.
- [ ] Confirm that access tokens and refresh tokens are encrypted at rest in the database (this is implemented via `lib/encryption.ts` in the backend).

## 4. Verification Demo Flow

Google Trust & Safety will ask for a video demonstrating how the scopes are used. You must record a screencast showing:

1. **Login:** Log in to PassNotice.
2. **OAuth Initiation:** Navigate to the Settings page and click "Connect Gmail".
3. **Consent Screen Details:** Show the OAuth consent screen. Ensure the URL bar clearly shows the Client ID.
4. **Grant Access:** Complete the OAuth consent flow, granting the send permission.
5. **Usage of Scope:** Navigate to the Clients page, generate a notice for a client, and click "Send via Gmail".
6. **Result:** Show that the email was successfully sent from the connected advocate's account (optionally by showing the sent email in the advocate's sent box or the success confirmation on PassNotice).
7. **Disconnect:** Show the process of disconnecting the Gmail account from the Settings page.

## 5. Security Summary

- PassNotice's backend handles the entire OAuth handshake.
- Tokens are encrypted before being written to the database.
- The `GOOGLE_CLIENT_SECRET` is never transmitted to the browser.
- Tokens are never exposed to the frontend; the frontend simply requests the backend to send an email on its behalf.
