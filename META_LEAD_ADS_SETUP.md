# Facebook / Meta Lead Ads Integration Guide

This guide describes how Facebook Lead Ads connect into Shakti Yoga Kendra's CRM and how to configure Meta Webhooks.

---

## 🏗 Architecture & Flow

```text
Facebook/Instagram Ad 
       │
       ▼
User submits Instant Form 
       │
       ▼
Meta triggers webhook POST ──> /api/webhooks/facebook
       │
       ▼
Validate HMAC signature (x-hub-signature-256) with META_APP_SECRET
       │
       ▼
Fetch full lead data from Graph API using META_PAGE_ACCESS_TOKEN
(name, email, phone, city, program interest, custom answers)
       │
       ▼
Upsert into PostgreSQL (Lead & LeadActivity)
       │
       ▼
Send instant email alert to staff (ADMIN_EMAIL)
       │
       ▼
Visible in Admin Dashboard (/admin/leads)
```

---

## ⚙️ Configuration (.env)

Make sure the following variables are in `.env`:

```env
META_APP_ID="1564851198178595"
META_APP_SECRET="1697322e9d4d4c8e57e0bf8658d0c0bb"
META_WEBHOOK_VERIFY_TOKEN="shakti_yoga_verify_2024"
META_PAGE_ACCESS_TOKEN="<your_long_lived_page_access_token>"
```

---

## 🚀 Setup in Meta Developer Portal

### 1. Get Page Access Token
1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/).
2. Under **Meta App**, select your app (`1564851198178595`).
3. Under **User or Page**, select **Page Access Token** for **Shakti Yoga Kendra**.
4. Add permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_metadata`
   - `leads_retrieval`
5. Click **Generate Access Token** and grant permissions.
6. Copy the generated token into `.env` as `META_PAGE_ACCESS_TOKEN`.

### 2. Configure Webhook
1. Open [Meta for Developers](https://developers.facebook.com/apps/1564851198178595/).
2. Add **Webhooks** product (or go to Webhooks in the sidebar).
3. Select **Page** from the dropdown and click **Subscribe to this object**.
4. Set:
   - **Callback URL:** `https://<your-domain>/api/webhooks/facebook`
   - **Verify Token:** `shakti_yoga_verify_2024`
5. Click **Verify and Save**.

### 3. Subscribe to Page Events
1. In the Webhooks table, locate the `leadgen` row.
2. Click **Subscribe**.
3. Select the **Shakti Yoga Kendra** page to attach the subscription.

---

## 🧪 Testing

1. Open [Meta Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing).
2. Select Page: **Shakti Yoga Kendra**.
3. Select Form: your Lead Ad form.
4. Click **Create lead**.
5. The lead will be retrieved and saved into the database, viewable at `/admin/leads`.
