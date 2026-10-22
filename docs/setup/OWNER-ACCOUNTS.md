# Accounts the Owner Needs to Create (low-cost setup)

Prepared for Chai Tapri. Updated 20 Oct 2026 for the low-cost setup. Prices checked that day (USD unless marked).

**Why you own these, not us:** each account holds your business's money, data or website address. If you own them and invite us as a team member, you keep full control. You can remove our access at any time, and nothing is stuck if you change developers.

**Golden rules**
- Use **one shared business email** for all of these (not a personal inbox, not a staff member's email).
- Turn on **two-step verification (MFA)** on every account.
- **Never send passwords, API keys, bank or ID details to us** by email or chat. Use each service's "invite member" button.
- Keep the logins in a password manager the business controls.

## Checklist (in this order)

| # | Account | What it's for | Plan & cost | What to do | Invite us as |
|---|---|---|---|---|---|
| 1 | **Business email for accounts** (e.g. a new Gmail) | Owns all the accounts below | Free | Create it, turn on MFA | — |
| 2 | **GitHub** organisation (github.com) | Stores the website's code (private) | **Free** | Create a free organisation (e.g. "chai-tapri") | **Member** (we create the repository) |
| 3 | **Cloudflare** (cloudflare.com) | Runs the website, scheduled order checks, file storage and DNS | **Workers Paid: US$5/month.** No per-person fee | Create an account, then subscribe to **Workers Paid** under Workers & Pages → Plans | **Member** with Workers/DNS access (we'll tell you which role when you invite) |
| 4 | **Neon** (neon.com) | The database (Sydney region) | **Free to start.** Upgrade to the Launch plan (~US$11–15/month) **before launch**. On the free plan, the database switches off for the rest of the month if its monthly hours run out | Create an organisation on the Free plan. We create the projects | **Member** |
| 5 | **Stripe** (stripe.com/au) | Takes card, Apple Pay and Google Pay payments. Pays out to your bank | **No monthly fee.** 1.65% + A$0.30 per Australian card payment | Sign up as an Australian business. To go live, Stripe asks **you** for the business details (legal name, ABN), the owner's/director's identity and the payout bank account. Enter these only inside Stripe. We can build in test mode before that's finished | **Developer** role |
| 6 | **Domain name** (e.g. `chaitapri.com.au`) from any Australian registrar | The website address and email sender | ~A$25–45/year | Check it's available and register it. A `.com.au` needs an **active ABN**, and the name should match your business name. We'll then ask you to switch its nameservers to Cloudflare (free DNS), done together | — |
| 7 | **Resend** (resend.com) | Sends order emails (received, accepted, ready) | **Free** (100 emails/day ≈ 33 orders/day). Pro **US$20/month** once orders regularly pass ~25 a day | Create an account with the business email | **Member** |
| 8 | **Sentry** (sentry.io) | Tells us when something breaks | Free tier | Create an organisation | **Member** |

**No longer needed** (compared with the earlier plan): Vercel (saves ~US$40/month), GitHub Team (saves US$8/month).
**Later, not in this phase:** Uber Direct developer access (delivery, slice 2), a Google Cloud account (address search for delivery, slice 2).

## What it costs
- **During the build:** about **US$5/month (≈ A$8)** + the domain.
- **Around launch**, with the recommended database upgrade: about **US$16–20/month**, rising to ~US$40/month if order emails pass the free limit.
- **Per sale/delivery:** Stripe's fee on each payment. Uber Direct's fee per delivery when delivery is added.

## What we need back from you
1. Invites from accounts 2, 3, 4, 5, 7 and 8 sent to our developer email.
2. Confirmation of the business's **legal name and ABN** (Valam Enterprise Pty Ltd, ABN 31 696 781 405?). Stripe and the domain must be in the right name.
3. The domain name you'd like.
4. Who the **owner/staff users** of the order screen will be (names + emails). Each person sets their own password and authenticator app.

Setting this up takes about **1–2 hours** of your time, plus Stripe's identity check (usually quick, sometimes a day or two).
