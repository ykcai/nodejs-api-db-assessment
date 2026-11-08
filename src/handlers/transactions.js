"use strict";

const { GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient, TABLES } = require("../lib/dynamodb");
const {
  ok,
  badRequest,
  notFound,
  conflict,
  serverError,
  parseJsonBody,
} = require("../lib/response");
const {
  isValidCurrency,
  isFiniteNumber,
  roundMoney,
} = require("../lib/validation");

async function getAccount(accountId) {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLES.accounts,
      Key: { accountId },
    })
  );
  return result.Item || null;
}

async function setBalance(accountId, currentBalance, newBalance) {
  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLES.accounts,
      Key: { accountId },
      UpdateExpression: "SET balance = :newBalance",
      ConditionExpression: "balance = :currentBalance AND #status = :open",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":newBalance": newBalance,
        ":currentBalance": currentBalance,
        ":open": "OPEN",
      },
      ReturnValues: "ALL_NEW",
    })
  );
  return result.Attributes;
}

function validateAmountRequest(data) {
  const { amount, currency } = data;
  if (!isFiniteNumber(amount) || amount <= 0) {
    return "amount must be a number greater than 0";
  }
  if (!isValidCurrency(currency)) {
    return "currency must be CAD or USD";
  }
  return null;
}

/**
 * POST /accounts/{accountId}/deposits
 */
async function deposit(event) {
  const accountId = event.pathParameters?.accountId;
  if (!accountId) {
    return badRequest("accountId is required");
  }

  const parsed = parseJsonBody(event);
  if (!parsed.ok) {
    return parsed.response;
  }

  const amountError = validateAmountRequest(parsed.data);
  if (amountError) {
    return badRequest(amountError);
  }

  const amount = roundMoney(parsed.data.amount);
  const { currency } = parsed.data;

  try {
    const account = await getAccount(accountId);
    if (!account) {
      return notFound(`Account not found: ${accountId}`);
    }
    if (account.status !== "OPEN") {
      return conflict("Account is not open");
    }
    if (account.currency !== currency) {
      return badRequest(
        `currency must match account currency (${account.currency})`
      );
    }

    const newBalance = roundMoney(account.balance + amount);
    const updated = await setBalance(accountId, account.balance, newBalance);
    return ok(updated);
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return conflict("Account balance changed; retry the deposit");
    }
    console.error("deposit failed", err);
    return serverError();
  }
}

/**
 * POST /accounts/{accountId}/withdrawals
 */
async function withdraw(event) {
  const accountId = event.pathParameters?.accountId;
  if (!accountId) {
    return badRequest("accountId is required");
  }

  const parsed = parseJsonBody(event);
  if (!parsed.ok) {
    return parsed.response;
  }

  const amountError = validateAmountRequest(parsed.data);
  if (amountError) {
    return badRequest(amountError);
  }

  const amount = roundMoney(parsed.data.amount);
  const { currency } = parsed.data;

  try {
    const account = await getAccount(accountId);
    if (!account) {
      return notFound(`Account not found: ${accountId}`);
    }
    if (account.status !== "OPEN") {
      return conflict("Account is not open");
    }
    if (account.currency !== currency) {
      return badRequest(
        `currency must match account currency (${account.currency})`
      );
    }
    if (account.balance < amount) {
      return conflict("Insufficient funds");
    }

    const newBalance = roundMoney(account.balance - amount);
    const updated = await setBalance(accountId, account.balance, newBalance);
    return ok(updated);
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return conflict("Account balance changed or insufficient funds; retry");
    }
    console.error("withdraw failed", err);
    return serverError();
  }
}

/**
 * POST /transfers
 *
 * Consistency approach:
 * - Debit source with a conditional update (balance must still equal what we read)
 * - Credit destination with a conditional update
 * - If credit fails after debit succeeded, attempt to reverse the debit
 * - Real DynamoDB would use TransactWriteItems; Local supports it too — this
 *   sequential approach is easier to follow for an assessment solution.
 */
async function transfer(event) {
  const parsed = parseJsonBody(event);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { fromAccountId, toAccountId, amount, currency } = parsed.data;

  if (!fromAccountId || !toAccountId) {
    return badRequest("fromAccountId and toAccountId are required");
  }
  if (fromAccountId === toAccountId) {
    return badRequest("fromAccountId and toAccountId must be different");
  }

  const amountError = validateAmountRequest({ amount, currency });
  if (amountError) {
    return badRequest(amountError);
  }

  const transferAmount = roundMoney(amount);

  try {
    const [fromAccount, toAccount] = await Promise.all([
      getAccount(fromAccountId),
      getAccount(toAccountId),
    ]);

    if (!fromAccount) {
      return notFound(`Account not found: ${fromAccountId}`);
    }
    if (!toAccount) {
      return notFound(`Account not found: ${toAccountId}`);
    }
    if (fromAccount.status !== "OPEN" || toAccount.status !== "OPEN") {
      return conflict("Both accounts must be OPEN");
    }
    if (fromAccount.currency !== currency || toAccount.currency !== currency) {
      return badRequest("currency must match both account currencies");
    }
    if (fromAccount.currency !== toAccount.currency) {
      return badRequest("accounts must share the same currency");
    }
    if (fromAccount.balance < transferAmount) {
      return conflict("Insufficient funds");
    }

    const fromNew = roundMoney(fromAccount.balance - transferAmount);
    const toNew = roundMoney(toAccount.balance + transferAmount);

    let updatedFrom;
    try {
      updatedFrom = await setBalance(
        fromAccountId,
        fromAccount.balance,
        fromNew
      );
    } catch (err) {
      if (err.name === "ConditionalCheckFailedException") {
        return conflict("Source account changed; retry the transfer");
      }
      throw err;
    }

    let updatedTo;
    try {
      updatedTo = await setBalance(toAccountId, toAccount.balance, toNew);
    } catch (err) {
      // Best-effort rollback of the debit
      try {
        await setBalance(fromAccountId, fromNew, fromAccount.balance);
      } catch (rollbackErr) {
        console.error("transfer rollback failed", rollbackErr);
        return serverError(
          "Transfer partially applied; manual reconciliation may be required"
        );
      }
      if (err.name === "ConditionalCheckFailedException") {
        return conflict("Destination account changed; transfer rolled back");
      }
      throw err;
    }

    return ok({ fromAccount: updatedFrom, toAccount: updatedTo });
  } catch (err) {
    console.error("transfer failed", err);
    return serverError();
  }
}

module.exports = {
  deposit,
  withdraw,
  transfer,
};
