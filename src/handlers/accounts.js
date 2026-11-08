"use strict";

const { v4: uuidv4 } = require("uuid");
const { GetCommand, PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient, TABLES } = require("../lib/dynamodb");
const {
  created,
  ok,
  badRequest,
  notFound,
  serverError,
  parseJsonBody,
} = require("../lib/response");
const {
  isValidAccountType,
  isValidCurrency,
  isFiniteNumber,
  roundMoney,
} = require("../lib/validation");

async function getCustomerOrNull(customerId) {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLES.customers,
      Key: { customerId },
    })
  );
  return result.Item || null;
}

/**
 * POST /customers/{customerId}/accounts
 */
async function create(event) {
  const customerId = event.pathParameters?.customerId;
  if (!customerId) {
    return badRequest("customerId is required");
  }

  const parsed = parseJsonBody(event);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { type, currency, initialBalance = 0 } = parsed.data;

  if (!isValidAccountType(type)) {
    return badRequest("type must be CHECKING or SAVINGS");
  }
  if (!isValidCurrency(currency)) {
    return badRequest("currency must be CAD or USD");
  }
  if (!isFiniteNumber(initialBalance) || initialBalance < 0) {
    return badRequest("initialBalance must be a number >= 0");
  }

  try {
    const customer = await getCustomerOrNull(customerId);
    if (!customer) {
      return notFound(`Customer not found: ${customerId}`);
    }

    const account = {
      accountId: `acct_${uuidv4()}`,
      customerId,
      type,
      currency,
      balance: roundMoney(initialBalance),
      status: "OPEN",
      createdAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLES.accounts,
        Item: account,
      })
    );

    return created(account);
  } catch (err) {
    console.error("createAccount failed", err);
    return serverError();
  }
}

/**
 * GET /customers/{customerId}/accounts
 */
async function list(event) {
  const customerId = event.pathParameters?.customerId;
  if (!customerId) {
    return badRequest("customerId is required");
  }

  try {
    const customer = await getCustomerOrNull(customerId);
    if (!customer) {
      return notFound(`Customer not found: ${customerId}`);
    }

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.accounts,
        IndexName: "CustomerIdIndex",
        KeyConditionExpression: "customerId = :customerId",
        ExpressionAttributeValues: {
          ":customerId": customerId,
        },
      })
    );

    return ok({ items: result.Items || [] });
  } catch (err) {
    console.error("listAccounts failed", err);
    return serverError();
  }
}

/**
 * GET /accounts/{accountId}
 */
async function get(event) {
  const accountId = event.pathParameters?.accountId;
  if (!accountId) {
    return badRequest("accountId is required");
  }

  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.accounts,
        Key: { accountId },
      })
    );

    if (!result.Item) {
      return notFound(`Account not found: ${accountId}`);
    }

    return ok(result.Item);
  } catch (err) {
    console.error("getAccount failed", err);
    return serverError();
  }
}

module.exports = {
  create,
  list,
  get,
};
