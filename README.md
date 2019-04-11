# Optional Chaining for TypeScript

The `ts-optchain` module is an implementation of optional chaining with default value support for TypeScript. `ts-optchain` helps the developer produce less verbose code while preserving TypeScript typings when traversing deep property structures. This library serves as an interim solution pending JavaScript/TypeScript built-in support for optional chaining in future releases (see: [Related Resources](#related)).

This module includes two optional chaining implementations:

* **ES6 Proxy Implementation**: trivial setup, but *incompatible with legacy browsers, such as IE 11.*
* **TypeScript Custom Code Transformer**: [faster performance](#benchmarks) and compatible with legacy browsers.

## Installation

```bash
npm i --save ts-optchain
```

### ES6 Proxy

No additional configuration is required to use the ES6 Proxy implementation of `ts-optchain`.

The ES6 Proxy implementation of `ts-optchain` requires NodeJS >= 6 or [compatible JS environment](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy#Browser_compatibility)

**IMPORTANT: ES6 Proxy is NOT supported by many legacy browsers, including IE 11 and older versions of ReactNative Android!**

Consider using one of the following alternative implementations if support for legacy browsers is a requirement.

### TypeScript Custom Code Transformer

[TTypescript](https://github.com/cevek/ttypescript) is a tool allows the developer to apply the TypeScript custom transformer automatically at build time. Configuration is as simple as adding the `plugins` property to `compilerOptions` in `tsconfig.json`, e.g.:

```typescript
// tsconfig.json
{
    "compilerOptions": {
        "plugins": [
            { "transform": "ts-optchain/transform" },
        ]
    },
}
```

The developer can then build + transform via the command line, webpack, ts-node, etc. Please see the [usage instructions](https://github.com/cevek/ttypescript#how-to-use).

After setup, the code:

```typescript
  import { oc } from 'ts-optchain';
  const obj: T = { /* ... */ };
  const value = oc(obj).propA.propB.propC(defaultValue);
```

...will be automatically transformed to:

```typescript
  const value =
    (obj != null && obj.propA != null && obj.propA.propB != null && obj.propA.propB.propC != null)
      ? obj.propA.propB.propC
      : defaultValue;
```

### Babel Plugin

For developers using `babel` with a need for legacy browser support, consider using the derivative project [`babel-plugin-ts-optchain`](https://github.com/epeli/babel-plugin-ts-optchain).

## Example Usage

```typescript
import { oc } from 'ts-optchain';

interface I {
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

const x: I = {
  a: 'hello',
  b: {
    d: 'world',
  },
  c: [{ u: { v: -100 } }, { u: { v: 200 } }, {}, { u: { v: -300 } }],
};

// Here are a few examples of deep object traversal using (a) optional chaining vs
// (b) logic expressions. Each of the following pairs are equivalent in
// result. Note how the benefits of optional chaining accrue with
// the depth and complexity of the traversal.

oc(x).a(); // 'hello'
x.a;

oc(x).b.d(); // 'world'
x.b && x.b.d;

oc(x).c[0].u.v(); // -100
x.c && x.c[0] && x.c[0].u && x.c[0].u.v;

oc(x).c[100].u.v(); // undefined
x.c && x.c[100] && x.c[100].u && x.c[100].u.v;

oc(x).c[100].u.v(1234); // 1234
(x.c && x.c[100] && x.c[100].u && x.c[100].u.v) || 1234;

oc(x).e.f(); // undefined
x.e && x.e.f;

oc(x).e.f('optional default value'); // 'optional default value'
(x.e && x.e.f) || 'optional default value';

// NOTE: working with function value types can be risky. Additional run-time
// checks to verify that object types are functions before invocation are advised!
oc(x).e.g(() => 'Yo Yo')(); // 'Yo Yo'
((x.e && x.e.g) || (() => 'Yo Yo'))();
```

## Problem

When traversing tree-like property structures, the developer often must check for existence of intermediate nodes to avoid run-time exceptions. While TypeScript is helpful in requiring the necessary existence checks at compile-time, the final code is still quite cumbersome. For example, given the interfaces:

```typescript
interface IAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

interface IHome {
  address?: IAddress;
  phoneNumber?: string;
}

interface IUser {
  home?: IHome;
}
```

Without support for optional chaining built into TypeScript yet, an implementation for a method to extract the home street string from this structure would look like:

```typescript
function getHomeStreet(user: IUser, defaultValue?: string) {
  return (user.home && user.home.address && user.home.address.street) || defaultValue;
}
```

This implementation is tedious to write. Utilities like `lodash`'s `get(...)` can help tighten the implementation, namely:

```typescript
import { get } from 'lodash';

function getHomeStreet(user: IUser, defaultValue?: string) {
  return get(user, 'home.address.street', defaultValue);
}
```

However, when using tools like `lodash` the developer loses the benefits of:

- Compile-time validation of the path `home.address.street`
- Compile-time validation of the expected type of the value at `home.address.street`
- Development-time code-completion assistance when manipulating the path `home.address.street` using tools like Visual Studio Code.

## Solution

Using the `ts-optchain` utility, `getHomeStreet` can be concisely written as:

```typescript
import { oc } from 'ts-optchain';

function getHomeStreet(user: IUser, defaultValue?: string) {
  return oc(user).home.address.street(defaultValue);
}
```

Other features of `ts-optchain` include:

### Type Preservation

`ts-optchain` preserves TypeScript typings through deep tree traversal. For example:

```typescript
// phoneNumberOptional is of type: string | undefined
const phoneNumberOptional = oc(user).home.phoneNumber();

// phoneNumberRequired is of type: string
const phoneNumberRequired = oc(user).home.phoneNumber('+1.555.123.4567');
```

### Array Types

`ts-optchain` supports traversal of Array types by index. For example:

```typescript
interface IItem {
  name?: string;
}

interface ICollection {
  items?: IItem[];
}

function getFirstItemName(collection: ICollection) {
  // Return type: string
  return oc(collection).items[0].name('No Name Item');
}
```

### Function Types

`ts-optchain` supports traversal to function values. For example:

```typescript
interface IThing {
  getter?: () => string;
}

const thing: IThing = { ... };
const result = oc(thing).getter(() => 'Default Getter')();
```

### Code-Completion

`ts-optchain` enables code-completion assistance in popular IDEs such as Visual Studio Code when writing tree-traversal code.

## <a name="benchmarks"></a>Benchmarks

Comparing the ES6 Proxy implementation vs the TypeScript custom transformer implementation.

### Test case:

```typescript
oc(testData).a.b.c();
```

### Results:

||`ts-optchain`|`ts-optchain/transform`||
|--|--:|--:|--:|
|Chrome 72|`2,352,109 ops/s ±1.16%`|`628,693,809 ops/s ±0.44%`|`267x`|
|Safari 12|`752,298 ops/s ±1.47%`|`1,760,808,177 ops/s ±0.93%`|`2,340x`|
|Firefox 65|`272,155 ops/s ±4.78%`|`793,869,896 ops/s ±0.82%`|`2,916x`|


## <a name="related"></a>Related Resources

- [Optional Chaining in TypeScript](https://medium.com/inside-rimeto/optional-chaining-in-typescript-622c3121f99b)
- [Optional Chaining for JavaScript (TC39 Proposal)](https://github.com/tc39/proposal-optional-chaining)

## License

`ts-optchain` is MIT Licensed.
