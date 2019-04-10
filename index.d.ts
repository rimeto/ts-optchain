/**
 * Copyright (C) 2019-present, Rimeto, LLC.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * A generic type that cannot be `undefined`.
 */
type Defined<T> = Exclude<T, undefined>;

/**
 * Data accessor interface to dereference the value of the `TSOCType`.
 */
interface TSOCDataAccessor<T> {
  /**
   * Data accessor without a default value. If no data exists,
   * `undefined` is returned.
   */
  (noDefaultValue?: undefined): Defined<T> | undefined;

  /**
   * Data accessor with default value.
   */
  (defaultValue: NonNullable<T>): NonNullable<T>;
  (nullDefaultValue: T extends null ? null : never): Defined<T>; // Null case
}

/**
 * `TSOCObjectWrapper` gives TypeScript visibility into the properties of
 * an `TSOCType` object at compile-time.
 */
type TSOCObjectWrapper<T> = { [K in keyof T]-?: TSOCType<T[K]> };

/**
 * `TSOCArrayWrapper` gives TypeScript visibility into the `TSOCType` values of an array
 * without exposing Array methods (it is problematic to attempt to invoke methods during
 * the course of an optional chain traversal).
 */
interface TSOCArrayWrapper<T> {
  length: TSOCType<number>;
  [K: number]: TSOCType<T>;
}

/**
 * Data accessor interface to dereference the value of an `any` type.
 * @extends TSOCDataAccessor<any>
 */
interface TSOCAny extends TSOCDataAccessor<any> {
  [K: string]: TSOCAny; // Enable deep traversal of arbitrary props
}

/**
 * `TSOCDataWrapper` selects between `TSOCArrayWrapper`, `TSOCObjectWrapper`, and `TSOCDataAccessor`
 * to wrap Arrays, Objects and all other types respectively.
 */
type TSOCDataWrapper<T> =
  0 extends (1 & T) // Is T any? (https://stackoverflow.com/questions/49927523/disallow-call-with-any/49928360#49928360)
    ? TSOCAny
    : T extends any[] // Is T array-like?
      ? TSOCArrayWrapper<T[number]>
      : T extends object // Is T object-like?
        ? TSOCObjectWrapper<T>
        : TSOCDataAccessor<T>;

/**
 * An object that supports optional chaining
 */
type TSOCType<T> = TSOCDataAccessor<T> & TSOCDataWrapper<NonNullable<T>>;

/**
 * Optional chaining with default values. To inspect a property value in
 * a tree-like structure, invoke it as a function, optionally passing a default value.
 *
 * @example
 *   // Given:
 *   const x = oc<T>({
 *     a: 'hello',
 *     b: { d: 'world' },
 *     c: [-100, 200, -300],
 *   });
 *
 *   // Then:
 *   x.a() === 'hello'
 *   x.b.d() === 'world'
 *   x.c[0]() === -100
 *   x.c[100]() === undefined
 *   x.c[100](1234) === 1234
 *   x.c.map((e) => e()) === [-100, 200, -300]
 *   x.d.e() === undefined
 *   x.d.e('optional default value') === 'optional default value'
 *   (x as any).y.z.a.b.c.d.e.f.g.h.i.j.k() === undefined
 */
export declare function oc<T>(data?: T): TSOCType<T>;
