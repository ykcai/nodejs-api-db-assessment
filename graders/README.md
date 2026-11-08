# Grader assets (private)

Do **not** ship this folder to candidates if you want Postman assertions / smoke tests to stay internal.
Safe to keep on the reference-solution branch, or copy into a private grader repo.

## Postman

Import [`postman/Banking-API.postman_collection.json`](postman/Banking-API.postman_collection.json).

1. Start the API (`npm run setup && npm start`)
2. Run **Core** folder for junior bar
3. Run **Stretch** folder for mid/senior

## Smoke tests

On the **reference-solution** branch (or a completed candidate submission):

```bash
npm run setup
npm start
# other terminal:
npm run test:smoke
```

`test:smoke` expects a fully implemented API (not the 501 stubs).
