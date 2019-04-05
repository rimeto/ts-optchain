/**
 * Copyright (C) 2018-present, Rimeto, LLC.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { oc } from '../../proxy';

describe('ts-optchain', () => {
  it('sanity checks', () => {
    interface X {
      a: string;
      b: { d: string };
      c: number[];
      d: { e: string } | null;
      e: { f: boolean } | null;
    }

    const x = oc<X>({
      a: 'hello',
      b: {
        d: 'world',
      },
      c: [-100, 200, -300],
      d: null,
      e: { f: false },
    });

    expect(x.a()).toEqual('hello');
    expect(x.b.d()).toEqual('world');
    expect(x.c[0]()).toEqual(-100);
    expect(x.c[100]()).toBeUndefined();
    expect(x.c[100](1234)).toEqual(1234);
    expect(x.d.e()).toBeUndefined();
    expect(x.d.e('optional default value')).toEqual('optional default value');
    expect(x.e.f()).toEqual(false);
  });

  it('optional chaining equivalence', () => {
    interface X {
      a?: string;
      b?: {
        d?: string;
      };
      c?: Array<{
        u?: {
          v?: number;
        };
      }>;
      e?: {
        f?: string;
        g?: () => string;
      };
    }

    const x: X = {
      a: 'hello',
      b: {
        d: 'world',
      },
      c: [{ u: { v: -100 } }, { u: { v: 200 } }, {}, { u: { v: -300 } }],
    };

    expect(oc(x).a()).toEqual(x.a);
    expect(oc(x).a(undefined)).toEqual(x.a);
    expect(oc(x).b.d()).toEqual(x.b && x.b.d);
    expect(oc(x).c[0].u.v()).toEqual(x.c && x.c[0] && x.c[0].u && (x as any).c[0].u.v);
    expect(oc(x).c[100].u.v()).toEqual(x.c && x.c[100] && x.c[100].u && (x as any).c[100].u.v);
    expect(oc(x).c[100].u.v(1234)).toEqual((x.c && x.c[100] && x.c[100].u && (x as any).c[100].u.v) || 1234);
    expect(oc(x).e.f()).toEqual(x.e && x.e.f);
    expect(oc(x).e.f('optional default value')).toEqual((x.e && x.e.f) || 'optional default value');
    expect(oc(x).e.g(() => 'Yo Yo')()).toEqual(((x.e && x.e.g) || (() => 'Yo Yo'))());
  });
});
