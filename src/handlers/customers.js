"use strict";

const { notImplemented, parseJsonBody } = require("../lib/response");
// const { docClient, TABLES } = require("../lib/dynamodb");
// const { GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
// const { v4: uuidv4 } = require("uuid");

/**
 * POST /customers
 *
 * TODO: Create a customer in DynamoDB.
 * - Validate fullName and email (see openapi/openapi.yaml)
 * - Generate a customerId
 * - Persist to Customers table
 * - Return 201 with the Customer object
 */
async function create(event) {
  const parsed = parseJsonBody(event);
  if (!parsed.ok) {
    return parsed.response;
  }

  // const { fullName, email } = parsed.data;
  return notImplemented("Implement POST /customers");
}

/**
 * GET /customers/{customerId}
 *
 * TODO: Load a customer by id from DynamoDB.
 * - Read customerId from event.pathParameters
 * - Return 200 with Customer, or 404 if missing
 */
async function get(event) {
  const customerId = event.pathParameters?.customerId;

  if (!customerId) {
    return notImplemented("Implement GET /customers/{customerId}");
  }

  return notImplemented(`Implement GET /customers/${customerId}`);
}

module.exports = {
  create,
  get,
};
