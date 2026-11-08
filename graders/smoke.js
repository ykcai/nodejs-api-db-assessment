"use strict";

/**
 * HTTP smoke tests for graders / reference solution.
 * Requires API on API_BASE (default http://localhost:3000) and seeded DB.
 *
 * Usage: npm run test:smoke
 */

const BASE = process.env.API_BASE || "http://localhost:3000";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${message}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${message}`);
  }
}

async function request(method, path, body) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, options);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text };
  }
  return { status: res.status, json, text };
}

async function main() {
  console.log(`Smoke tests against ${BASE}\n`);

  console.log("Docs");
  {
    const docs = await request("GET", "/docs");
    assert(docs.status === 200, "GET /docs → 200");
    assert(
      typeof docs.text === "string" && docs.text.includes("swagger-ui"),
      "GET /docs returns Swagger UI HTML"
    );

    const spec = await request("GET", "/openapi.yaml");
    assert(spec.status === 200, "GET /openapi.yaml → 200");
    assert(
      spec.text.includes("openapi:"),
      "GET /openapi.yaml looks like OpenAPI"
    );
  }

  console.log("\nCore — customers");
  {
    const missing = await request("GET", "/customers/does_not_exist");
    assert(missing.status === 404, "GET missing customer → 404");
    assert(missing.json?.error && missing.json?.message, "404 error shape");

    const seeded = await request("GET", "/customers/cust_001");
    assert(seeded.status === 200, "GET cust_001 → 200");
    assert(seeded.json?.email === "ada@example.com", "seeded customer email");

    const bad = await request("POST", "/customers", { fullName: "No Email" });
    assert(bad.status === 400, "POST customer missing email → 400");

    const created = await request("POST", "/customers", {
      fullName: "Grace Hopper",
      email: "grace@example.com",
    });
    assert(created.status === 201, "POST /customers → 201");
    assert(
      typeof created.json?.customerId === "string",
      "create returns customerId"
    );
  }

  console.log("\nCore — accounts");
  {
    const listed = await request("GET", "/customers/cust_001/accounts");
    assert(listed.status === 200, "GET accounts → 200");
    assert(Array.isArray(listed.json?.items), "list returns items[]");
    assert(listed.json.items.length >= 2, "cust_001 has seeded accounts");

    const account = await request("GET", "/accounts/acct_001");
    assert(account.status === 200, "GET acct_001 → 200");
    assert(typeof account.json?.balance === "number", "account has balance");

    const createdAcct = await request("POST", "/customers/cust_001/accounts", {
      type: "SAVINGS",
      currency: "CAD",
      initialBalance: 15,
    });
    assert(createdAcct.status === 201, "POST account → 201");
    assert(createdAcct.json?.balance === 15, "initialBalance applied");

    const noCustomer = await request(
      "POST",
      "/customers/does_not_exist/accounts",
      { type: "CHECKING", currency: "CAD" }
    );
    assert(noCustomer.status === 404, "POST account for missing customer → 404");
  }

  console.log("\nStretch — transactions");
  {
    const before = await request("GET", "/accounts/acct_001");
    const startBalance = before.json.balance;

    const deposit = await request("POST", "/accounts/acct_001/deposits", {
      amount: 10,
      currency: "CAD",
    });
    assert(deposit.status === 200, "deposit → 200");
    assert(
      deposit.json?.balance === Math.round((startBalance + 10) * 100) / 100,
      "deposit increases balance"
    );

    const withdraw = await request("POST", "/accounts/acct_001/withdrawals", {
      amount: 5,
      currency: "CAD",
    });
    assert(withdraw.status === 200, "withdraw → 200");

    const insufficient = await request(
      "POST",
      "/accounts/acct_001/withdrawals",
      { amount: 999999, currency: "CAD" }
    );
    assert(insufficient.status === 409, "insufficient funds → 409");

    const fromBefore = await request("GET", "/accounts/acct_001");
    const toBefore = await request("GET", "/accounts/acct_002");
    const transfer = await request("POST", "/transfers", {
      fromAccountId: "acct_001",
      toAccountId: "acct_002",
      amount: 1,
      currency: "CAD",
    });
    assert(transfer.status === 200, "transfer → 200");
    assert(transfer.json?.fromAccount && transfer.json?.toAccount, "transfer shape");
    assert(
      transfer.json.fromAccount.balance ===
        Math.round((fromBefore.json.balance - 1) * 100) / 100,
      "transfer debits source"
    );
    assert(
      transfer.json.toAccount.balance ===
        Math.round((toBefore.json.balance + 1) * 100) / 100,
      "transfer credits destination"
    );

    const fxMismatch = await request("POST", "/transfers", {
      fromAccountId: "acct_001",
      toAccountId: "acct_003",
      amount: 1,
      currency: "CAD",
    });
    assert(
      fxMismatch.status === 400 || fxMismatch.status === 409,
      "cross-currency transfer rejected"
    );
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
