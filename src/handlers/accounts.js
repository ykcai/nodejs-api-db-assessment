"use strict";

const { notImplemented, parseJsonBody } = require("../lib/response");
// const { docClient, TABLES } = require("../lib/dynamodb");
// const { GetCommand, PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
// const { v4: uuidv4 } = require("uuid");

/**
 * POST /customers/{customerId}/accounts
 *
 * TODO: Create an account for an existing customer.
 * - Validate customer exists
 * - Validate type (CHECKING|SAVINGS) and currency (CAD|USD)
 * - initialBalance defaults to 0 and must be >= 0
 * - Persist to Accounts table (include customerId for the GSI)
 * - Return 201 with Account
 */
async function create(event) {
  const customerId = event.pathParameters?.customerId;
  const parsed = parseJsonBody(event);
  if (!parsed.ok) {
    return parsed.response;
  }

  return notImplemented(
    `Implement POST /customers/${customerId || "{customerId}"}/accounts`
  );
}

/**
 * GET /customers/{customerId}/accounts
 *
 * TODO: List accounts for a customer.
 * - Prefer Query on the CustomerIdIndex GSI (avoid Scan)
 * - Return 200: { items: Account[] }
 * - Return 404 if the customer does not exist
 */
async function list(event) {
  const customerId = event.pathParameters?.customerId;

  return notImplemented(
    `Implement GET /customers/${customerId || "{customerId}"}/accounts`
  );
}

/**
 * GET /accounts/{accountId}
 *
 * TODO: Get a single account including balance.
 * - Return 200 with Account, or 404 if missing
 */
async function get(event) {
  const accountId = event.pathParameters?.accountId;

  return notImplemented(
    `Implement GET /accounts/${accountId || "{accountId}"}`
  );
}

module.exports = {
  create,
  list,
  get,
};
