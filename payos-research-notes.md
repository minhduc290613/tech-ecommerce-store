# PayOS integration research

## Official sources reviewed

- https://payos.vn/docs/
- https://payos.vn/docs/sdks/back-end/node/
- https://payos.vn/docs/sdks/intro

## Verified implementation facts

PayOS documents a server-side Node SDK package named `@payos/node`. The SDK is initialized with `clientId`, `apiKey`, and `checksumKey`, which must remain server-side. Payment links are created with `paymentRequests.create()` using fields including `orderCode`, `amount`, `description`, `items`, `cancelUrl`, and `returnUrl`; the response includes `checkoutUrl`. Webhook payloads are verified with `payOS.webhooks.verify(req.body)` before updating an order. PayOS describes the flow as: create a link, redirect the customer to PayOS checkout/VietQR, receive the return URL result, and separately receive the full payment result through the merchant webhook. The official docs also note HTTP 429 rate limits, so checkout creation and webhook handlers need controlled retries/idempotency.

## Scope decision

Implement PayOS as a separate payment method. The frontend requests a server-created checkout URL; credentials are never exposed to the browser or stored in the public site settings table. Until the user supplies PayOS credentials through secure project configuration, the Admin panel should show PayOS as `not configured` and checkout must refuse to create a live link rather than pretending success.
