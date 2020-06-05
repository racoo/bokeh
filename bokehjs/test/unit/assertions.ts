import {isString, isArray, isTypedArray, isPlainObject, isFunction, isIterable} from "@bokehjs/core/util/types"
import {is_equal, is_similar} from "@bokehjs/core/util/eq"
import {Class} from "@bokehjs/core/class"

type Constructor<T> = Function & {prototype: T}

type ToFn<T> = {
  to: Throw & NotThrow & Be<T>
}

type ToVal<T> = {
  to: Be<T>
}

type Throw = {
  throw(error_type?: Class<Error>, pattern?: RegExp | string): void
}

type NotThrow = {
  not: Throw
}

type Be<T> = {
  be: Assertions<T>
  not: NotBe<T>
}

type NotBe<T> = {
  be: Assertions<T>
}

type Assertions<T> = {
  equal(expected: T): void
  similar(expected: T, tolerance?: number): void
  identical(expected: T): void
  instanceof(type: any): void
  undefined: void
  null: void
  true: void
  false: void
  NaN: void
  empty: void
}

class Asserts implements Assertions<unknown> {
  constructor(readonly value: unknown, readonly negated: boolean = false) {}

  equal(expected: unknown): void {
    const {value} = this
    if (!is_equal(this.value, expected) == !this.negated) {
      const be = this.negated ? "not be" : "be"
      throw new ExpectationError(`expected ${value} to ${be} equal to ${expected}`)
    }
  }

  similar(expected: unknown, tolerance: number = 1e-4): void {
    const {value} = this
    if (!is_similar(this.value, expected, tolerance) == !this.negated) {
      const be = this.negated ? "not be" : "be"
      throw new ExpectationError(`expected ${value} to ${be} similar to ${expected} with ${tolerance} tolerance`)
    }
  }

  identical(expected: unknown): void {
    const {value} = this
    if (!Object.is(this.value, expected) == !this.negated) {
      const be = this.negated ? "not be" : "be"
      throw new ExpectationError(`expected ${value} to ${be} identical to ${expected}`)
    }
  }

  instanceof(expected: Constructor<unknown>): void {
    const {value} = this
    if (!(value instanceof expected) == !this.negated) {
      const be = this.negated ? "not be" : "be"
      throw new ExpectationError(`expected ${value} to ${be} an instance of ${expected}`)
    }
  }

  get undefined(): void {
    return this.equal(undefined)
  }
  get null(): void {
    return this.equal(null)
  }
  get false(): void {
    return this.equal(false)
  }
  get true(): void {
    return this.equal(true)
  }
  get NaN(): void {
    return this.equal(NaN)
  }

  get empty(): void {
    const {value} = this

    const is_empty = (() => {
      if (isArray(value) || isTypedArray(value))
        return value.length == 0
      else if (isPlainObject(value))
        return Object.keys(value).length == 0
      else if (isIterable(value))
        return value[Symbol.iterator]().next().done
      else
        return null
    })()

    if (is_empty == null) {
      throw new ExpectationError(`expected ${value} to be an array-like, a plain object or an iterable container`)
    }

    if (!is_empty == !this.negated) {
      const be = this.negated ? "not be" : "be"
      throw new ExpectationError(`expected ${value} to ${be} empty`)
    }

    return undefined
  }
}

export class ExpectationError extends Error {
  constructor(message: string) {
    super(message)
  }
}

function Throws(fn: () => unknown) {
  return function(error_type?: Class<Error>, pattern?: RegExp | string) {
    try {
      fn()
    } catch (error) {
      if (!(error instanceof Error)) {
        throw new ExpectationError(`expected ${fn} to throw a proper exception, got ${error}`)
      }

      if (error_type != null && !(error instanceof error_type)) {
        throw new ExpectationError(`expected ${fn} to throw an exception of type ${error_type}, got ${error}`)
      }

      if (pattern != null && !error.message.match(pattern)) {
        throw new ExpectationError(`expected ${fn} to throw an exception matching ${pattern}, got ${error}`)
      }

      return
    }

    throw new ExpectationError(`expected ${fn} to throw an exception, but it did not`)
  }
}

function NotThrows(fn: () => unknown) {
  return function(error_type?: Class<Error>, pattern?: RegExp | string) {
    try {
      fn()
    } catch (error) {
      if (!(error instanceof Error)) {
        throw new ExpectationError(`expected ${fn} to not throw, got ${error}`)
      }

      if (error_type != null && error instanceof error_type) {
        throw new ExpectationError(`expected ${fn} to not throw an exception of type ${error_type}, got ${error}`)
      }

      if (pattern instanceof RegExp) {
        if (error.message.match(pattern))
          throw new ExpectationError(`expected ${fn} to not throw an exception matching ${pattern}, got ${error}`)
      } else if (isString(pattern)) {
        if (error.message.includes(pattern))
          throw new ExpectationError(`expected ${fn} to not throw an exception including ${pattern}, got ${error}`)
      }
    }
  }
}

export function expect<T>(fn: () => T): ToFn<T>
export function expect<T>(val: T): ToVal<T>

export function expect<T>(fn_or_val: (() => T) | T): ToFn<T> | ToVal<T> {
  if (isFunction(fn_or_val)) {
    const fn = fn_or_val
    return {
      to: {
        throw: Throws(fn),
        be: new Asserts(fn),
        not: {
          throw: NotThrows(fn),
          be: new Asserts(fn, true)
        },
      },
    }
  } else {
    const val = fn_or_val
    return {
      to: {
        be: new Asserts(val),
        not: {be: new Asserts(val, true)},
      },
    }
  }
}

/*
.to.throw
.to.not.throw

.to.be.equal
.to.be.deep.equal
.to.be.instanceof
.to.be.undefined
.to.be.null
.to.be.false
.to.be.true
.to.be.NaN
.to.be.above
.to.be.below

.to.not.be.*

.to.be.closeTo
.to.be.empty
.to.be.within
*/
