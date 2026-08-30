# Integration visual verification

- Desktop 1280×720: storefront header/hero rendered without horizontal overflow; Mantis Admin login shell rendered with existing brand and form controls.
- Mobile 375×812: storefront header remains within viewport; Mantis Admin login card fits mobile width without horizontal overflow.
- The Integrations panel requires an authorized session to inspect; source-level tests cover its fields, provider gating and save handler.
- Tawk is loaded only when the public Property ID and Widget ID pass validation and the setting is explicitly enabled. Automatic payment processing remains disabled until server-side secrets/webhooks are configured.
