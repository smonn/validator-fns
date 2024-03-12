import { expect, test } from "vitest";
import { array, assert, boolean, is, number, object, string } from "./index.js";

test("assert string", () => {
  expect(() => assert(string(), "hello")).not.toThrow();
  expect(() => assert(string({ optional: true }), undefined)).not.toThrow();
  expect(() => assert(string({ nullable: true }), null)).not.toThrow();
  expect(() => assert(string({ pattern: /^[a-z]+$/ }), "hello")).not.toThrow();
  expect(() => assert(string({ minLength: 5 }), "hello")).not.toThrow();
  expect(() => assert(string({ maxLength: 5 }), "hello")).not.toThrow();
  expect(() => assert(string({ default: "hello" }), undefined)).not.toThrow();
  expect(() => assert(string(), 12345)).toThrowError(TypeError);
  expect(() => assert(string({ optional: true }), null)).toThrowError(
    TypeError,
  );
  expect(() => assert(string({ nullable: true }), undefined)).toThrowError(
    TypeError,
  );
  expect(() => assert(string({ pattern: /^[a-z]+$/ }), "12345")).toThrowError(
    TypeError,
  );
  expect(() => assert(string({ minLength: 5 }), "1234")).toThrowError(
    TypeError,
  );
});

test("assert number", () => {
  expect(() => assert(number(), 123)).not.toThrow();
  expect(() => assert(number({ optional: true }), undefined)).not.toThrow();
  expect(() => assert(number({ nullable: true }), null)).not.toThrow();
  expect(() => assert(number({ min: 5 }), 5)).not.toThrow();
  expect(() => assert(number({ max: 5 }), 5)).not.toThrow();
  expect(() => assert(number({ default: 123 }), undefined)).not.toThrow();
  expect(() => assert(number({ integer: true }), 5)).not.toThrow();
  expect(() => assert(number(), "hello")).toThrowError(TypeError);
  expect(() => assert(number({ optional: true }), null)).toThrowError(
    TypeError,
  );
  expect(() => assert(number({ nullable: true }), undefined)).toThrowError(
    TypeError,
  );
  expect(() => assert(number({ min: 5 }), 4)).toThrowError(TypeError);
  expect(() => assert(number({ max: 5 }), 6)).toThrowError(TypeError);
  expect(() => assert(number({ integer: true }), 5.5)).toThrowError(TypeError);
});

test("assert boolean", () => {
  expect(() => assert(boolean(), true)).not.toThrow();
  expect(() => assert(boolean({ optional: true }), undefined)).not.toThrow();
  expect(() => assert(boolean({ nullable: true }), null)).not.toThrow();
  expect(() => assert(boolean({ default: false }), undefined)).not.toThrow();
  expect(() => assert(boolean(), "hello")).toThrowError(TypeError);
  expect(() => assert(boolean({ optional: true }), null)).toThrowError(
    TypeError,
  );
  expect(() => assert(boolean({ nullable: true }), undefined)).toThrowError(
    TypeError,
  );
});

test("assert array", () => {
  expect(() => assert(array(string()), ["abc"])).not.toThrow();
  expect(() => assert(array(number()), [])).not.toThrow();
  expect(() => assert(array(boolean({ optional: true })), [])).not.toThrow();
  expect(() =>
    assert(array(string(), { optional: true }), undefined),
  ).not.toThrow();
  expect(() => assert(array(string(), { nullable: true }), null)).not.toThrow();
  expect(() =>
    assert(array(number(), { minLength: 5 }), [1, 2, 3, 4, 5]),
  ).not.toThrow();
  expect(() =>
    assert(array(number(), { maxLength: 5 }), [1, 2, 3, 4, 5]),
  ).not.toThrow();
  expect(() =>
    assert(array(string(), { default: ["foo"] }), undefined),
  ).not.toThrow();
  expect(() => assert(array(string()), [1, 2, 3, 4, 5])).toThrowError(
    TypeError,
  );
  expect(() => assert(array(string(), { optional: true }), null)).toThrowError(
    TypeError,
  );
  expect(() =>
    assert(array(string(), { nullable: true }), undefined),
  ).toThrowError(TypeError);
  expect(() =>
    assert(array(number(), { minLength: 5 }), [1, 2, 3, 4]),
  ).toThrowError(TypeError);
  expect(() =>
    assert(array(number(), { maxLength: 5 }), [1, 2, 3, 4, 5, 6]),
  ).toThrowError(TypeError);
});

test("assert object", () => {
  expect(() => assert(object({}), {})).not.toThrow();
  expect(() => assert(object({ foo: string() }), { foo: "bar" })).not.toThrow();
  expect(() =>
    assert(object({ foo: array(string()) }), { foo: ["bar"] }),
  ).not.toThrow();
  expect(() => assert(object({}, { optional: true }), undefined)).not.toThrow();
  expect(() => assert(object({}, { nullable: true }), null)).not.toThrow();
  expect(() => assert(object({  }, { default: { foo1: 'bar' } }), undefined)).not.toThrow();
  expect(() => assert(object({}), "hello")).toThrowError(TypeError);
  expect(() => assert(object({}, { optional: true }), null)).toThrowError(
    TypeError,
  );
  expect(() => assert(object({}, { nullable: true }), undefined)).toThrowError(
    TypeError,
  );
});
