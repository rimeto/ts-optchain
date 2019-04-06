/**
 * Copyright (C) 2019-present, Rimeto, LLC.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

 import { Defined, TSOCType } from '../../'

/**
 * Proxy based implementation of optional chaining w/ default values.
 */
export function oc<T>(data?: T): TSOCType<T> {
  return new Proxy(
    ((defaultValue?: Defined<T>) => (data == null ? defaultValue : data)) as TSOCType<T>,
    {
      get: (target, key) => {
        const obj: any = target();
        return oc(typeof obj === 'object' ? obj[key] : undefined);
      },
    },
  );
}
