# Reference solution (private)

This branch (`cursor/reference-solution`) contains a complete implementation of the assessment handlers.

**Do not share this branch with candidates.**

## What’s included beyond the candidate template

- Full handlers in `src/handlers/` (customers, accounts, transactions)
- Shared validation in `src/lib/validation.js`
- Grader smoke script: `npm run test:smoke`
- Postman collection under `graders/postman/`
- Swagger UI at `/docs`

## Verify

```bash
npm install
npm run setup    # Docker required
npm start
# other terminal:
npm run test:smoke
```

## Candidate template

Branch `cursor/candidate-assessment-template` keeps `501` stubs for distribution.
