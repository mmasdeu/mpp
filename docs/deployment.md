# Deployment

The site is deployed to **GitHub Pages** through **GitHub Actions**, as a static build.

## Base path

- The app is served from a sub-path on GitHub Pages (for example `/montserrat-pam-a-pam/`), so all asset and route URLs must respect a base path.
- The base path is set with the `BASE_PATH` environment variable at build time.
- For local development, `BASE_PATH` is left empty so the site is served from the root.
- Do not hard-code the base path in source files.

## Pipeline

Deployment is gated by the same checks that run on every push:

1. Install dependencies with `npm ci`.
2. Run `npm run validate` to check canonical data.
3. Run `npm test`.
4. Run `npm run build` with `BASE_PATH` set for the GitHub Pages URL.
5. Upload the build output and publish it to GitHub Pages.

Steps 2 and 3 must pass before step 5 runs. A failing validation or test blocks the deploy.

## Gate status

- The test workflow (`.github/workflows/test.yml`) runs validate, test and build on pushes and pull requests.
- The deploy job that publishes to GitHub Pages must depend on that validation and test job, so it runs only after both pass.
- Deployment must not run while the [data sources](data-sources.md) checks are incomplete.

## Checklist before a release

- Sample data has been replaced with extracted book data, or is clearly marked as placeholder.
- Map tile attribution is displayed.
- Copyright checks for text and photographs are recorded.
- The PWA manifest and service worker resolve correctly under `BASE_PATH`.
