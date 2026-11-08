"use strict";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCOUNT_TYPES = new Set(["CHECKING", "SAVINGS"]);
const CURRENCIES = new Set(["CAD", "USD"]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidEmail(value) {
  return isNonEmptyString(value) && EMAIL_RE.test(value.trim());
}

function isValidAccountType(value) {
  return ACCOUNT_TYPES.has(value);
}

function isValidCurrency(value) {
  return CURRENCIES.has(value);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/** Round to 2 decimal places (currency). */
function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

module.exports = {
  ACCOUNT_TYPES,
  CURRENCIES,
  isNonEmptyString,
  isValidEmail,
  isValidAccountType,
  isValidCurrency,
  isFiniteNumber,
  roundMoney,
};
