"use strict";

const { v4: uuidv4 } = require("uuid");
const { GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient, TABLES } = require("../lib/dynamodb");
const {
  created,
  ok,
  badRequest,
  notFound,
  serverError,
  parseJsonBody,
} = require("../lib/response");
const { isNonEmptyString, isValidEmail } = require("../lib/validation");

/**
 * POST /customers
 */
async function create(event) {
  const parsed = parseJsonBody(event);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { fullName, email } = parsed.data;

  if (!isNonEmptyString(fullName)) {
    return badRequest("fullName is required");
  }
  if (!isValidEmail(email)) {
    return badRequest("email must be a valid email address");
  }

  const customer = {
    customerId: `cust_${uuidv4()}`,
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLES.customers,
        Item: customer,
      })
    );
    return created(customer);
  } catch (err) {
    console.error("createCustomer failed", err);
    return serverError();
  }
}

/**
 * GET /customers/{customerId}
 */
async function get(event) {
  const customerId = event.pathParameters?.customerId;
  if (!customerId) {
    return badRequest("customerId is required");
  }

  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.customers,
        Key: { customerId },
      })
    );

    if (!result.Item) {
      return notFound(`Customer not found: ${customerId}`);
    }

    return ok(result.Item);
  } catch (err) {
    console.error("getCustomer failed", err);
    return serverError();
  }
}

module.exports = {
  create,
  get,
};
