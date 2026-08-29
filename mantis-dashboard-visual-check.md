# Mantis Admin dashboard visual verification

- Desktop 1280x720: protected login surface remains centered and readable after adding dashboard controls; the Mantis entrypoint loads without horizontal overflow. The authorized dashboard state is protected behind Supabase Auth.
- Mobile 375x812: login card remains inside the viewport with readable fields and CTA. The responsive sidebar, dashboard grid, revenue chart, latest-orders table, language button, and theme button are implemented for the authorized state.
- Functional coverage: Product management and User management are available in the sidebar; Overview reads confirmed revenue, recent orders, product count, and customer profile count within RLS scope. Language and theme preferences persist in localStorage.
- Automated validation: regression suite, SQL layout check, TypeScript check, and production build completed successfully after the expansion.
