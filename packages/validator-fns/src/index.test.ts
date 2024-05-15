import { expect, test } from "vitest";
import {
  array,
  assert,
  boolean,
  date,
  is,
  number,
  object,
  sizeOf,
  string,
} from "./index.js";

test("assert string", () => {
  expect(() => assert(string(), "hello")).not.toThrow();
  expect(() => assert(string({ optional: true }), undefined)).not.toThrow();
  expect(() => assert(string({ nullable: true }), null)).not.toThrow();
  expect(() => assert(string({ pattern: /^[a-z]+$/ }), "hello")).not.toThrow();
  expect(() => assert(string({ minLength: 5 }), "hello")).not.toThrow();
  expect(() => assert(string({ maxLength: 5 }), "hello")).not.toThrow();
  expect(() => assert(string({ default: "hello" }), undefined)).not.toThrow();
  expect(() =>
    assert(string({ oneOf: ["foo", "bar", "baz"] as const }), "foo")
  ).not.toThrow();
  expect(() => assert(string(), 12345)).toThrowError(TypeError);
  expect(() => assert(string({ optional: true }), null)).toThrowError(
    TypeError
  );
  expect(() => assert(string({ nullable: true }), undefined)).toThrowError(
    TypeError
  );
  expect(() => assert(string({ pattern: /^[a-z]+$/ }), "12345")).toThrowError(
    TypeError
  );
  expect(() => assert(string({ minLength: 5 }), "1234")).toThrowError(
    TypeError
  );
  expect(() => assert(string({ maxLength: 3 }), "1234")).toThrowError(
    TypeError
  );
  expect(() =>
    assert(string({ oneOf: ["foo", "bar", "baz"] as const }), "hello")
  ).toThrowError(TypeError);
});

test("assert number", () => {
  expect(() => assert(number(), 123)).not.toThrow();
  expect(() => assert(number({ optional: true }), undefined)).not.toThrow();
  expect(() => assert(number({ nullable: true }), null)).not.toThrow();
  expect(() => assert(number({ oneOf: [4, 6, 8] as const }), 6)).not.toThrow();
  expect(() => assert(number({ min: 5 }), 5)).not.toThrow();
  expect(() => assert(number({ max: 5 }), 5)).not.toThrow();
  expect(() => assert(number({ default: 123 }), undefined)).not.toThrow();
  expect(() => assert(number({ integer: true }), 5)).not.toThrow();
  expect(() => assert(number(), "hello")).toThrowError(TypeError);
  expect(() => assert(number({ optional: true }), null)).toThrowError(
    TypeError
  );
  expect(() => assert(number({ nullable: true }), undefined)).toThrowError(
    TypeError
  );
  expect(() => assert(number({ min: 5 }), 4)).toThrowError(TypeError);
  expect(() => assert(number({ max: 5 }), 6)).toThrowError(TypeError);
  expect(() => assert(number({ integer: true }), 5.5)).toThrowError(TypeError);
  expect(() => assert(number({ oneOf: [4, 6, 8] as const }), 3)).toThrowError(
    TypeError
  );
});

test("assert boolean", () => {
  expect(() => assert(boolean(), true)).not.toThrow();
  expect(() => assert(boolean({ optional: true }), undefined)).not.toThrow();
  expect(() => assert(boolean({ nullable: true }), null)).not.toThrow();
  expect(() => assert(boolean({ default: false }), undefined)).not.toThrow();
  expect(() => assert(boolean({ oneOf: [true] as const }), true)).not.toThrow();
  expect(() => assert(boolean(), "hello")).toThrowError(TypeError);
  expect(() => assert(boolean({ optional: true }), null)).toThrowError(
    TypeError
  );
  expect(() => assert(boolean({ nullable: true }), undefined)).toThrowError(
    TypeError
  );
  expect(() => assert(boolean({ oneOf: [true] as const }), false)).toThrowError(
    TypeError
  );
});

test("assert array", () => {
  expect(() => assert(array(string()), ["abc"])).not.toThrow();
  expect(() => assert(array(number()), [])).not.toThrow();
  expect(() => assert(array(boolean({ optional: true })), [])).not.toThrow();
  expect(() =>
    assert(array(string(), { optional: true }), undefined)
  ).not.toThrow();
  expect(() => assert(array(string(), { nullable: true }), null)).not.toThrow();
  expect(() =>
    assert(array(number(), { minLength: 5 }), [1, 2, 3, 4, 5])
  ).not.toThrow();
  expect(() =>
    assert(array(number(), { maxLength: 5 }), [1, 2, 3, 4, 5])
  ).not.toThrow();
  expect(() =>
    assert(array(string(), { default: ["foo"] }), undefined)
  ).not.toThrow();
  expect(() => assert(array(string()), [1, 2, 3, 4, 5])).toThrowError(
    TypeError
  );
  expect(() => assert(array(string(), { optional: true }), null)).toThrowError(
    TypeError
  );
  expect(() =>
    assert(array(string(), { nullable: true }), undefined)
  ).toThrowError(TypeError);
  expect(() =>
    assert(array(number(), { minLength: 5 }), [1, 2, 3, 4])
  ).toThrowError(TypeError);
  expect(() =>
    assert(array(number(), { maxLength: 5 }), [1, 2, 3, 4, 5, 6])
  ).toThrowError(TypeError);
  expect(() => assert(array(boolean()), 123)).toThrowError(TypeError);
});

test("assert object", () => {
  expect(() => assert(object({}), {})).not.toThrow();
  expect(() => assert(object({ foo: string() }), { foo: "bar" })).not.toThrow();
  expect(() =>
    assert(object({ foo: array(string()) }), { foo: ["bar"] })
  ).not.toThrow();
  expect(() => assert(object({}, { optional: true }), undefined)).not.toThrow();
  expect(() => assert(object({}, { nullable: true }), null)).not.toThrow();
  expect(() =>
    assert(object({}, { default: { foo1: "bar" } }), undefined)
  ).not.toThrow();
  expect(() => {
    assert(object({ foo: string() }, { allowExtraProperties: true }), {
      foo: "hello",
      bar: 123,
    });
  }).not.toThrow();
  expect(() => assert(object({}), "hello")).toThrowError(TypeError);
  expect(() => assert(object({}, { optional: true }), null)).toThrowError(
    TypeError
  );
  expect(() => assert(object({}, { nullable: true }), undefined)).toThrowError(
    TypeError
  );
  expect(() =>
    assert(
      object({
        nested: object({
          name: string(),
        }),
      }),
      { nested: { name: 123 } }
    )
  ).toThrowError(TypeError);
  expect(() => {
    assert(object({ foo: string() }), { foo: "hello", bar: 123 });
  }).toThrowError(TypeError);
});

test("assert date", () => {
  expect(() => assert(date(), new Date())).not.toThrow();
  expect(() =>
    assert(date({ before: new Date(10) }), new Date(9))
  ).not.toThrow();
  expect(() =>
    assert(date({ after: new Date(10) }), new Date(11))
  ).not.toThrow();
  expect(() => assert(date({ nullable: true }), null)).not.toThrow();
  expect(() => assert(date({ optional: true }), undefined)).not.toThrow();
  expect(() => assert(date({ default: new Date(0) }), undefined)).not.toThrow();
  expect(() =>
    assert(date({ oneOf: [new Date(0), new Date(10)] as const }), new Date(0))
  ).not.toThrow();
  expect(() =>
    assert(date({ before: new Date(10) }), new Date(10))
  ).toThrowError(TypeError);
  expect(() =>
    assert(date({ after: new Date(10) }), new Date(10))
  ).toThrowError(TypeError);
  expect(() => assert(date(), "hello")).toThrowError(TypeError);
  expect(() => assert(date({ nullable: true }), undefined)).toThrowError(
    TypeError
  );
  expect(() => assert(date({ optional: true }), null)).toThrowError(TypeError);
  expect(() =>
    assert(date({ oneOf: [new Date(0), new Date(10)] as const }), new Date(5))
  ).toThrowError(TypeError);
});

test("sizeOf", () => {
  expect(sizeOf("123")).toBe(3);
  expect(sizeOf(123)).toBe(123);
  expect(sizeOf(456n)).toBe(456n);
  expect(sizeOf(["foo", "bar", "baz"])).toBe(3);
  expect(sizeOf(new Set())).toBe(0);
  expect(sizeOf(new Map())).toBe(0);
  expect(sizeOf(new Date() as unknown as number)).toBe(0);
});

test("is", () => {
  const v = string();
  expect(is(v, "hello")).toBeTruthy();
  expect(is(v, null)).toBeFalsy();
  expect(is(v, false)).toBeFalsy();
  expect(is(v, 123)).toBeFalsy();
});
