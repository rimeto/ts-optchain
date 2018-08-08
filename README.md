# Optional Chaining for TypeScript

The `ts-oc` library brings optional chaining with default value support to TypeScript with type preservation. Optional chaining leads to less verbose code and stronger type safety.

## Install

```bash
npm i --save ts-oc
```

### Requirements

* NodeJS >= 6
* TypeScript >= 2.8

## Example Usage

```typescript
import { oc } from 'ts-oc';

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


// Examples of deep object traversal using optional chaining vs traditional approach.
// Benefits of optional chaining accrue with depth and complexity of traversal.

oc(x).a(); // 'hello'
x.a;

oc(x).b.d(); // 'world'
x.b && x.b.d;

oc(x).c[0].u.v(); // -100
x.c && x.c[0] && x.c[0].u && x.c[0].u.v;

oc(x).c[100].u.v(); // undefined
x.c && x.c[100] && x.c[100].u && x.c[100].u.v;

oc(x).c[100].u.v(1234); // 1234
x.c && x.c[100] && x.c[100].u && x.c[100].u.v || 1234;

oc(x).e.f(); // undefined
x.e && x.e.f;

oc(x).e.f('optional default value'); // 'optional default value'
x.e && x.e.f || 'optional default value';

// NOTE: working with function value types can be risky. Additional run-time
// checks to verify that object types are functions before invocation are advised!
oc(x).e.g(() => 'Yo Yo')(); // 'Yo Yo'
(x.e && x.e.g || (() => 'Yo Yo'))();
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
  return user.home && user.home.address && user.home.address.street || defaultValue;
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

* Compile-time validation of the path `home.address.street`
* Compile-time validation of the expected type of the value at `home.address.street`
* Development-time code-completion assistance when manipulating the path `home.address.street` using tools like Visual Studio Code.

## Solution

Using the `ts-oc` utility, `getHomeStreet` can be concisely written as:

```typescript
import { oc } from 'ts-oc';

function getHomeStreet(user: IUser, defaultValue?: string) {
  return oc(user).home.address.street(defaultValue);
}
```

Other features of `ts-oc` include:

### Type Preservation

`ts-oc` preserves TypeScript typings through deep tree traversal. For example:

```typescript
// phoneNumberOptional is of type: string | undefined
const phoneNumberOptional = oc(user).home.phoneNumber();

// phoneNumberRequired is of type: string
const phoneNumberRequired = oc(user).home.phoneNumber('+1.555.123.4567');
```

### Array Types

`ts-oc` supports traversal of Array types by index. For example:

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

`ts-oc` supports traversal to function values. For example:

```typescript
interface IThing {
  getter?: () => string;
}

const thing: IThing = { ... };
const result = oc(thing).getter(() => 'Default Getter')();
```

### Code-Completion

`ts-oc` enables code-completion assistance in popular IDEs such as Visual Studio Code when writing tree-traversal code.

## Related Resources

* [Optional Chaining for JavaScript (TC39 Proposal)](https://github.com/tc39/proposal-optional-chaining)

## License

`ts-oc` is MIT Licensed.
