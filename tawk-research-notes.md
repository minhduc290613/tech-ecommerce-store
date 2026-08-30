# Integration research notes

## Tawk.to

- Official widget installation: https://help.tawk.to/article/adding-a-widget-to-your-website
- Official JavaScript API: https://developer.tawk.to/jsapi/
- The storefront integration should load the widget only when an Admin-configured enable flag and public property/widget identifiers are present. Secrets must not be embedded in the client; Tawk public widget identifiers are configuration values, not private API credentials.
- Admin controls should include enabled/disabled state, property ID, widget ID, locale, and optional visibility rules. Invalid or incomplete identifiers should leave the widget disabled rather than injecting a malformed script.

## Payment architecture decision

- International payment methods requiring automatic confirmation need provider-specific server credentials and webhook signature verification. Until the user supplies secrets, the Admin should expose configuration/status only and keep automatic processing disabled.
- Manual methods must remain available and must not be changed by an unconfigured automatic provider.
