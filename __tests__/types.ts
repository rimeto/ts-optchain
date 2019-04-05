/**
 * Type only tests. Do not execute.
 */

import { assert, IsExact, Has } from "conditional-type-checks";

import { oc } from "../src";

/**
 * Extract type from the array
 */
type ArrayType<T> = T extends Array<infer V> ? V : never;

interface X {
  a?: {
    b?: string;
    literal?: "literal";
    union?: "foo" | "bar";
    maybeNull: string | null;
    array?: (string | null)[];
    notNull: string;
  };
  exists: string;
  getter?: () => string;
}

declare const x: X;

const resWithDefault = oc(x).a.b("");
assert<IsExact<typeof resWithDefault, string>>(true);

const resMaybeNull = oc(x).a.maybeNull("");
assert<IsExact<typeof resMaybeNull, string>>(true);

const resUnion = oc(x).a.union("foo");
assert<Has<typeof resUnion, "foo">>(true);
assert<Has<typeof resUnion, "bar">>(true);

// Does not have null or undefined
assert<Has<typeof resUnion, undefined>>(false);
assert<Has<typeof resUnion, null>>(false);

const resNoDefault = oc(x).a.b();
// Has string and undefined
assert<Has<typeof resNoDefault, string>>(true);
assert<Has<typeof resNoDefault, undefined>>(true);

const resExists = oc(x).exists();
// Has string and undefined
assert<Has<typeof resExists, string>>(true);
assert<Has<typeof resExists, undefined>>(true);

const resFunctionWithDefault = oc(x).getter(() => "");
// Has the function and undefined
assert<Has<typeof resFunctionWithDefault, () => string>>(true);
assert<Has<typeof resFunctionWithDefault, undefined>>(false);

const resFunctionNoDefault = oc(x).getter();
// Has the function and undefined
assert<Has<typeof resFunctionNoDefault, () => string>>(true);
assert<Has<typeof resFunctionNoDefault, undefined>>(true);

const resNested = oc(x).a();
if (resNested) {
  // initial remove undefined
  assert<Has<typeof resNested.notNull, string>>(true);
  // Does not add undefineds to nested result objects
  assert<Has<typeof resNested.notNull, undefined>>(false);
}

const resArray = oc(x).a.array();

// I maybe undefined
assert<Has<typeof resArray, undefined>>(true);

type ResArrayType = ArrayType<NonNullable<typeof resArray>>;
// Has the string and null defined in the original type
assert<Has<ResArrayType, null>>(true);
assert<Has<ResArrayType, string>>(true);

const resArrayDefault = oc(x).a.array([]);
// The default removes the undefined
assert<Has<typeof resArrayDefault, undefined>>(false);

const resMaybeNullWithDefaultNull = oc(x).a.maybeNull(null);
assert<Has<typeof resMaybeNullWithDefaultNull, string>>(true);
assert<Has<typeof resMaybeNullWithDefaultNull, null>>(true);
