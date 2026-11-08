"use strict";

const { notImplemented, parseJsonBody } = require("../lib/response");
// const { docClient, TABLES } = require("../lib/dynamodb");
// const { GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

/**
 * POST /accounts/{accountId}/deposits
 *
 * STRETCH (mid-senior): Credit the account balance.
 * - Validate amount > 0 and currency matches the account
 * - Update balance in DynamoDB
 * - Return 200 with updated Account
 */
async function deposit(event) {
  const accountId = event.pathParameters?.accountId;
  const parsed = parseJsonBody(event);
  if (!parsed.ok) {
    return parsed.response;
  }

  return notImplemented(
    `Stretch: implement POST /accounts/${accountId || "{accountId}"}/deposits`
  );
}

/**
 * POST /accounts/{accountId}/withdrawals
 *
 * STRETCH (mid-senior): Debit the account balance.
 * - Reject with 409 if insufficient funds
 * - Return 200 with updated Account
 */
async function withdraw(event) {
  const accountId = event.pathParameters?.accountId;
  const parsed = parseJsonBody(event);
  if (!parsed.ok) {
    return parsed.response;
  }

  return notImplemented(
    `Stretch: implement POST /accounts/${accountId || "{accountId}"}/withdrawals`
  );
}

/**
 * POST /transfers
 *
 * STRETCH (mid-senior): Move funds between two accounts.
 * - Same currency required
 * - Insufficient funds → 409
 * - Think about partial-failure / consistency (document your approach)
 * - Return 200: { fromAccount, toAccount }
 */
async function transfer(event) {
  const parsed = parseJsonBody(event);
  if (!parsed.ok) {
    return parsed.response;
  }

  return notImplemented("Stretch: implement POST /transfers");
}

module.exports = {
  deposit,
  withdraw,
  transfer,
};
