---
title: "Cloudflare Email Service — Standard Setup Guide"
---

# Cloudflare Email Service — Standard Setup Guide

> **Service Status:** Beta  
> **Domain:** `bekaa.eu`  
> **Sender:** `noreply@bekaa.eu`

---

## Prerequisites

- [x] Cloudflare account with Workers Paid plan
- [x] Domain `bekaa.eu` managed by Cloudflare DNS
- [ ] Email Service activated in Cloudflare Dashboard
- [ ] DNS records configured (SPF, DKIM, DMARC)

---

## Step 1: Activate Email Service

1. Go to [Cloudflare Dashboard → Email Sending](https://dash.cloudflare.com/?to=/:account/email-service/sending)
2. Click **Onboard Domain**
3. Select `bekaa.eu`
4. Click **Continue** to proceed with DNS configuration
5. Click **Add records and onboard** — this will add:
   - **MX records** on `cf-bounce.bekaa.eu` for bounce handling
   - **TXT record (SPF)** to authorize sending
   - **TXT record (DKIM)** for email authentication
   - **TXT record (DMARC)** on `_dmarc.bekaa.eu`

> **Note:** DNS changes typically propagate within 5-15 minutes for Cloudflare-managed domains.

---

## Step 2: Verify DNS Propagation

After onboarding, verify that all records are active:

```bash
# Check SPF
dig TXT cf-bounce.bekaa.eu

# Check DKIM
dig TXT *._domainkey.bekaa.eu

# Check DMARC
dig TXT _dmarc.bekaa.eu
```

The Cloudflare Dashboard will also show the status of each record.

---

## Step 3: Deploy API Gateway with Email Binding

The `wrangler.toml` already includes the email binding configuration:

```toml
# Dev (with remote for local testing)
[[send_email]]
name = "EMAIL"
remote = true

# Production
[[env.production.send_email]]
name = "EMAIL"
allowed_sender_addresses = ["noreply@bekaa.eu"]
```

Deploy to production:

```bash
cd apps/api-gateway
npx wrangler deploy --env production
```

---

## Step 4: Test Email Sending

Send a test email via the API:

```bash
curl -X POST https://standard-api.bekaa.eu/api/v1/email/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-session-token>" \
  -d '{
    "to": "your-email@example.com",
    "type": "welcome"
  }'
```

Expected response:

```json
{
  "success": true,
  "data": {
    "messageId": "msg_abc123...",
    "type": "welcome",
    "to": "your-email@example.com",
    "sentAt": "2026-05-04T12:00:00.000Z"
  },
  "trace_id": "..."
}
```

### Available Test Types

| Type | Description |
|---|---|
| `welcome` | Welcome email after sign-up |
| `verification` | Email verification with token link |
| `approval_request` | Artifact approval notification |
| `state_change` | Assessment state change notification |
| `report_ready` | Report download notification |
| `security_alert` | Security alert notification |

---

## Step 5: Verify in Inbox

1. Check the inbox for the address you specified in `to`
2. If not found, check the spam folder
3. Verify the email renders correctly in your email client
4. Confirm SPF/DKIM pass in email headers (look for `Authentication-Results`)

---

## Compliance Checklist

- [ ] **CAN-SPAM:** All automated emails include sender identification and unsubscribe mechanism
- [ ] **GDPR:** Email sending respects user consent and data processing agreements
- [ ] **Suppression Lists:** Cloudflare manages suppression lists for bounces/complaints automatically
- [ ] **DMARC Policy:** Consider upgrading from `p=none` to `p=quarantine` or `p=reject` after initial testing

---

## Monitoring

- **Metrics:** [Cloudflare Dashboard → Email Service → Metrics](https://dash.cloudflare.com/?to=/:account/email-service/sending)
- **Logs:** [Cloudflare Dashboard → Email Service → Logs](https://dash.cloudflare.com/?to=/:account/email-service/sending)
- **Error Codes:** See `packages/email/src/types.ts` for the full list of CF error codes

---

## Limits

| Metric | Limit |
|---|---|
| Recipients per email (to+cc+bcc) | 50 |
| Subject length | 998 chars |
| Message size | 5 MiB (25 MiB for verified addresses) |
| Custom headers | 16 KB |
| Daily sending | Variable (request increase via [form](https://forms.gle/ukpeZVLWLnKeixDu7)) |

---

## Pricing

| | Workers Free | Workers Paid |
|---|---|---|
| Outbound | ❌ | 3,000/month free, then $0.35/1,000 |
| Inbound (routing) | ✅ Unlimited | ✅ Unlimited |

---

## Troubleshooting

### Email not delivered
1. Check Cloudflare Email Logs for delivery status
2. Verify DNS records are active (SPF, DKIM, DMARC)
3. Check if recipient is on suppression list
4. Review error codes in API response

### `E_SENDER_NOT_VERIFIED`
- Domain onboarding incomplete — go to Dashboard and complete setup

### `E_RATE_LIMIT_EXCEEDED` / `E_DAILY_LIMIT_EXCEEDED`
- Wait and retry, or request limit increase via form

### `E_RECIPIENT_SUPPRESSED`
- Recipient has bounced or complained previously
- Review suppression list in Dashboard

