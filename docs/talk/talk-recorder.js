// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"QVnC":[function(require,module,exports) {
/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var runtime = (function (exports) {
  "use strict";

  var Op = Object.prototype;
  var hasOwn = Op.hasOwnProperty;
  var undefined; // More compressible than void 0.
  var $Symbol = typeof Symbol === "function" ? Symbol : {};
  var iteratorSymbol = $Symbol.iterator || "@@iterator";
  var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

  function wrap(innerFn, outerFn, self, tryLocsList) {
    // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
    var generator = Object.create(protoGenerator.prototype);
    var context = new Context(tryLocsList || []);

    // The ._invoke method unifies the implementations of the .next,
    // .throw, and .return methods.
    generator._invoke = makeInvokeMethod(innerFn, self, context);

    return generator;
  }
  exports.wrap = wrap;

  // Try/catch helper to minimize deoptimizations. Returns a completion
  // record like context.tryEntries[i].completion. This interface could
  // have been (and was previously) designed to take a closure to be
  // invoked without arguments, but in all the cases we care about we
  // already have an existing method we want to call, so there's no need
  // to create a new function object. We can even get away with assuming
  // the method takes exactly one argument, since that happens to be true
  // in every case, so we don't have to touch the arguments object. The
  // only additional allocation required is the completion record, which
  // has a stable shape and so hopefully should be cheap to allocate.
  function tryCatch(fn, obj, arg) {
    try {
      return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
      return { type: "throw", arg: err };
    }
  }

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  // Dummy constructor functions that we use as the .constructor and
  // .constructor.prototype properties for functions that return Generator
  // objects. For full spec compliance, you may wish to configure your
  // minifier not to mangle the names of these two functions.
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}

  // This is a polyfill for %IteratorPrototype% for environments that
  // don't natively support it.
  var IteratorPrototype = {};
  IteratorPrototype[iteratorSymbol] = function () {
    return this;
  };

  var getProto = Object.getPrototypeOf;
  var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
  if (NativeIteratorPrototype &&
      NativeIteratorPrototype !== Op &&
      hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
    // This environment has a native %IteratorPrototype%; use it instead
    // of the polyfill.
    IteratorPrototype = NativeIteratorPrototype;
  }

  var Gp = GeneratorFunctionPrototype.prototype =
    Generator.prototype = Object.create(IteratorPrototype);
  GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
  GeneratorFunctionPrototype.constructor = GeneratorFunction;
  GeneratorFunctionPrototype[toStringTagSymbol] =
    GeneratorFunction.displayName = "GeneratorFunction";

  // Helper for defining the .next, .throw, and .return methods of the
  // Iterator interface in terms of a single ._invoke method.
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function(method) {
      prototype[method] = function(arg) {
        return this._invoke(method, arg);
      };
    });
  }

  exports.isGeneratorFunction = function(genFun) {
    var ctor = typeof genFun === "function" && genFun.constructor;
    return ctor
      ? ctor === GeneratorFunction ||
        // For the native GeneratorFunction constructor, the best we can
        // do is to check its .name property.
        (ctor.displayName || ctor.name) === "GeneratorFunction"
      : false;
  };

  exports.mark = function(genFun) {
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
    } else {
      genFun.__proto__ = GeneratorFunctionPrototype;
      if (!(toStringTagSymbol in genFun)) {
        genFun[toStringTagSymbol] = "GeneratorFunction";
      }
    }
    genFun.prototype = Object.create(Gp);
    return genFun;
  };

  // Within the body of any async function, `await x` is transformed to
  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
  // `hasOwn.call(value, "__await")` to determine if the yielded value is
  // meant to be awaited.
  exports.awrap = function(arg) {
    return { __await: arg };
  };

  function AsyncIterator(generator, PromiseImpl) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);
      if (record.type === "throw") {
        reject(record.arg);
      } else {
        var result = record.arg;
        var value = result.value;
        if (value &&
            typeof value === "object" &&
            hasOwn.call(value, "__await")) {
          return PromiseImpl.resolve(value.__await).then(function(value) {
            invoke("next", value, resolve, reject);
          }, function(err) {
            invoke("throw", err, resolve, reject);
          });
        }

        return PromiseImpl.resolve(value).then(function(unwrapped) {
          // When a yielded Promise is resolved, its final value becomes
          // the .value of the Promise<{value,done}> result for the
          // current iteration.
          result.value = unwrapped;
          resolve(result);
        }, function(error) {
          // If a rejected Promise was yielded, throw the rejection back
          // into the async generator function so it can be handled there.
          return invoke("throw", error, resolve, reject);
        });
      }
    }

    var previousPromise;

    function enqueue(method, arg) {
      function callInvokeWithMethodAndArg() {
        return new PromiseImpl(function(resolve, reject) {
          invoke(method, arg, resolve, reject);
        });
      }

      return previousPromise =
        // If enqueue has been called before, then we want to wait until
        // all previous Promises have been resolved before calling invoke,
        // so that results are always delivered in the correct order. If
        // enqueue has not been called before, then it is important to
        // call invoke immediately, without waiting on a callback to fire,
        // so that the async generator function has the opportunity to do
        // any necessary setup in a predictable way. This predictability
        // is why the Promise constructor synchronously invokes its
        // executor callback, and why async functions synchronously
        // execute code before the first await. Since we implement simple
        // async functions in terms of async generators, it is especially
        // important to get this right, even though it requires care.
        previousPromise ? previousPromise.then(
          callInvokeWithMethodAndArg,
          // Avoid propagating failures to Promises returned by later
          // invocations of the iterator.
          callInvokeWithMethodAndArg
        ) : callInvokeWithMethodAndArg();
    }

    // Define the unified helper method that is used to implement .next,
    // .throw, and .return (see defineIteratorMethods).
    this._invoke = enqueue;
  }

  defineIteratorMethods(AsyncIterator.prototype);
  AsyncIterator.prototype[asyncIteratorSymbol] = function () {
    return this;
  };
  exports.AsyncIterator = AsyncIterator;

  // Note that simple async functions are implemented on top of
  // AsyncIterator objects; they just return a Promise for the value of
  // the final result produced by the iterator.
  exports.async = function(innerFn, outerFn, self, tryLocsList, PromiseImpl) {
    if (PromiseImpl === void 0) PromiseImpl = Promise;

    var iter = new AsyncIterator(
      wrap(innerFn, outerFn, self, tryLocsList),
      PromiseImpl
    );

    return exports.isGeneratorFunction(outerFn)
      ? iter // If outerFn is a generator, return the full iterator.
      : iter.next().then(function(result) {
          return result.done ? result.value : iter.next();
        });
  };

  function makeInvokeMethod(innerFn, self, context) {
    var state = GenStateSuspendedStart;

    return function invoke(method, arg) {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        if (method === "throw") {
          throw arg;
        }

        // Be forgiving, per 25.3.3.3.3 of the spec:
        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
        return doneResult();
      }

      context.method = method;
      context.arg = arg;

      while (true) {
        var delegate = context.delegate;
        if (delegate) {
          var delegateResult = maybeInvokeDelegate(delegate, context);
          if (delegateResult) {
            if (delegateResult === ContinueSentinel) continue;
            return delegateResult;
          }
        }

        if (context.method === "next") {
          // Setting context._sent for legacy support of Babel's
          // function.sent implementation.
          context.sent = context._sent = context.arg;

        } else if (context.method === "throw") {
          if (state === GenStateSuspendedStart) {
            state = GenStateCompleted;
            throw context.arg;
          }

          context.dispatchException(context.arg);

        } else if (context.method === "return") {
          context.abrupt("return", context.arg);
        }

        state = GenStateExecuting;

        var record = tryCatch(innerFn, self, context);
        if (record.type === "normal") {
          // If an exception is thrown from innerFn, we leave state ===
          // GenStateExecuting and loop back for another invocation.
          state = context.done
            ? GenStateCompleted
            : GenStateSuspendedYield;

          if (record.arg === ContinueSentinel) {
            continue;
          }

          return {
            value: record.arg,
            done: context.done
          };

        } else if (record.type === "throw") {
          state = GenStateCompleted;
          // Dispatch the exception by looping back around to the
          // context.dispatchException(context.arg) call above.
          context.method = "throw";
          context.arg = record.arg;
        }
      }
    };
  }

  // Call delegate.iterator[context.method](context.arg) and handle the
  // result, either by returning a { value, done } result from the
  // delegate iterator, or by modifying context.method and context.arg,
  // setting context.delegate to null, and returning the ContinueSentinel.
  function maybeInvokeDelegate(delegate, context) {
    var method = delegate.iterator[context.method];
    if (method === undefined) {
      // A .throw or .return when the delegate iterator has no .throw
      // method always terminates the yield* loop.
      context.delegate = null;

      if (context.method === "throw") {
        // Note: ["return"] must be used for ES3 parsing compatibility.
        if (delegate.iterator["return"]) {
          // If the delegate iterator has a return method, give it a
          // chance to clean up.
          context.method = "return";
          context.arg = undefined;
          maybeInvokeDelegate(delegate, context);

          if (context.method === "throw") {
            // If maybeInvokeDelegate(context) changed context.method from
            // "return" to "throw", let that override the TypeError below.
            return ContinueSentinel;
          }
        }

        context.method = "throw";
        context.arg = new TypeError(
          "The iterator does not provide a 'throw' method");
      }

      return ContinueSentinel;
    }

    var record = tryCatch(method, delegate.iterator, context.arg);

    if (record.type === "throw") {
      context.method = "throw";
      context.arg = record.arg;
      context.delegate = null;
      return ContinueSentinel;
    }

    var info = record.arg;

    if (! info) {
      context.method = "throw";
      context.arg = new TypeError("iterator result is not an object");
      context.delegate = null;
      return ContinueSentinel;
    }

    if (info.done) {
      // Assign the result of the finished delegate to the temporary
      // variable specified by delegate.resultName (see delegateYield).
      context[delegate.resultName] = info.value;

      // Resume execution at the desired location (see delegateYield).
      context.next = delegate.nextLoc;

      // If context.method was "throw" but the delegate handled the
      // exception, let the outer generator proceed normally. If
      // context.method was "next", forget context.arg since it has been
      // "consumed" by the delegate iterator. If context.method was
      // "return", allow the original .return call to continue in the
      // outer generator.
      if (context.method !== "return") {
        context.method = "next";
        context.arg = undefined;
      }

    } else {
      // Re-yield the result returned by the delegate method.
      return info;
    }

    // The delegate iterator is finished, so forget it and continue with
    // the outer generator.
    context.delegate = null;
    return ContinueSentinel;
  }

  // Define Generator.prototype.{next,throw,return} in terms of the
  // unified ._invoke helper method.
  defineIteratorMethods(Gp);

  Gp[toStringTagSymbol] = "Generator";

  // A Generator should always return itself as the iterator object when the
  // @@iterator function is called on it. Some browsers' implementations of the
  // iterator prototype chain incorrectly implement this, causing the Generator
  // object to not be returned from this call. This ensures that doesn't happen.
  // See https://github.com/facebook/regenerator/issues/274 for more details.
  Gp[iteratorSymbol] = function() {
    return this;
  };

  Gp.toString = function() {
    return "[object Generator]";
  };

  function pushTryEntry(locs) {
    var entry = { tryLoc: locs[0] };

    if (1 in locs) {
      entry.catchLoc = locs[1];
    }

    if (2 in locs) {
      entry.finallyLoc = locs[2];
      entry.afterLoc = locs[3];
    }

    this.tryEntries.push(entry);
  }

  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal";
    delete record.arg;
    entry.completion = record;
  }

  function Context(tryLocsList) {
    // The root entry object (effectively a try statement without a catch
    // or a finally block) gives us a place to store values thrown from
    // locations where there is no enclosing try statement.
    this.tryEntries = [{ tryLoc: "root" }];
    tryLocsList.forEach(pushTryEntry, this);
    this.reset(true);
  }

  exports.keys = function(object) {
    var keys = [];
    for (var key in object) {
      keys.push(key);
    }
    keys.reverse();

    // Rather than returning an object with a next method, we keep
    // things simple and return the next function itself.
    return function next() {
      while (keys.length) {
        var key = keys.pop();
        if (key in object) {
          next.value = key;
          next.done = false;
          return next;
        }
      }

      // To avoid creating an additional object, we just hang the .value
      // and .done properties off the next function object itself. This
      // also ensures that the minifier will not anonymize the function.
      next.done = true;
      return next;
    };
  };

  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) {
        return iteratorMethod.call(iterable);
      }

      if (typeof iterable.next === "function") {
        return iterable;
      }

      if (!isNaN(iterable.length)) {
        var i = -1, next = function next() {
          while (++i < iterable.length) {
            if (hasOwn.call(iterable, i)) {
              next.value = iterable[i];
              next.done = false;
              return next;
            }
          }

          next.value = undefined;
          next.done = true;

          return next;
        };

        return next.next = next;
      }
    }

    // Return an iterator with no values.
    return { next: doneResult };
  }
  exports.values = values;

  function doneResult() {
    return { value: undefined, done: true };
  }

  Context.prototype = {
    constructor: Context,

    reset: function(skipTempReset) {
      this.prev = 0;
      this.next = 0;
      // Resetting context._sent for legacy support of Babel's
      // function.sent implementation.
      this.sent = this._sent = undefined;
      this.done = false;
      this.delegate = null;

      this.method = "next";
      this.arg = undefined;

      this.tryEntries.forEach(resetTryEntry);

      if (!skipTempReset) {
        for (var name in this) {
          // Not sure about the optimal order of these conditions:
          if (name.charAt(0) === "t" &&
              hasOwn.call(this, name) &&
              !isNaN(+name.slice(1))) {
            this[name] = undefined;
          }
        }
      }
    },

    stop: function() {
      this.done = true;

      var rootEntry = this.tryEntries[0];
      var rootRecord = rootEntry.completion;
      if (rootRecord.type === "throw") {
        throw rootRecord.arg;
      }

      return this.rval;
    },

    dispatchException: function(exception) {
      if (this.done) {
        throw exception;
      }

      var context = this;
      function handle(loc, caught) {
        record.type = "throw";
        record.arg = exception;
        context.next = loc;

        if (caught) {
          // If the dispatched exception was caught by a catch block,
          // then let that catch block handle the exception normally.
          context.method = "next";
          context.arg = undefined;
        }

        return !! caught;
      }

      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        var record = entry.completion;

        if (entry.tryLoc === "root") {
          // Exception thrown outside of any try block that could handle
          // it, so set the completion value of the entire function to
          // throw the exception.
          return handle("end");
        }

        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc");
          var hasFinally = hasOwn.call(entry, "finallyLoc");

          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            } else if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            }

          } else if (hasFinally) {
            if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else {
            throw new Error("try statement without catch or finally");
          }
        }
      }
    },

    abrupt: function(type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev &&
            hasOwn.call(entry, "finallyLoc") &&
            this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }

      if (finallyEntry &&
          (type === "break" ||
           type === "continue") &&
          finallyEntry.tryLoc <= arg &&
          arg <= finallyEntry.finallyLoc) {
        // Ignore the finally entry if control is not jumping to a
        // location outside the try/catch block.
        finallyEntry = null;
      }

      var record = finallyEntry ? finallyEntry.completion : {};
      record.type = type;
      record.arg = arg;

      if (finallyEntry) {
        this.method = "next";
        this.next = finallyEntry.finallyLoc;
        return ContinueSentinel;
      }

      return this.complete(record);
    },

    complete: function(record, afterLoc) {
      if (record.type === "throw") {
        throw record.arg;
      }

      if (record.type === "break" ||
          record.type === "continue") {
        this.next = record.arg;
      } else if (record.type === "return") {
        this.rval = this.arg = record.arg;
        this.method = "return";
        this.next = "end";
      } else if (record.type === "normal" && afterLoc) {
        this.next = afterLoc;
      }

      return ContinueSentinel;
    },

    finish: function(finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) {
          this.complete(entry.completion, entry.afterLoc);
          resetTryEntry(entry);
          return ContinueSentinel;
        }
      }
    },

    "catch": function(tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if (record.type === "throw") {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }

      // The context.catch method must only be called with a location
      // argument that corresponds to a known catch block.
      throw new Error("illegal catch attempt");
    },

    delegateYield: function(iterable, resultName, nextLoc) {
      this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      };

      if (this.method === "next") {
        // Deliberately forget the last sent value so that we don't
        // accidentally pass it on to the delegate.
        this.arg = undefined;
      }

      return ContinueSentinel;
    }
  };

  // Regardless of whether this script is executing as a CommonJS module
  // or not, return the runtime object so that we can declare the variable
  // regeneratorRuntime in the outer scope, which allows this module to be
  // injected easily by `bin/regenerator --include-runtime script.js`.
  return exports;

}(
  // If this script is executing as a CommonJS module, use module.exports
  // as the regeneratorRuntime namespace. Otherwise create a new empty
  // object. Either way, the resulting object will be used to initialize
  // the regeneratorRuntime variable at the top of this file.
  typeof module === "object" ? module.exports : {}
));

try {
  regeneratorRuntime = runtime;
} catch (accidentalStrictMode) {
  // This module should not be running in strict mode, so the above
  // assignment should always work unless something is misconfigured. Just
  // in case runtime.js accidentally runs in strict mode, we can escape
  // strict mode using a global Function call. This could conceivably fail
  // if a Content Security Policy forbids using Function, but in that case
  // the proper solution is to fix the accidental strict mode problem. If
  // you've misconfigured your bundler to force strict mode and applied a
  // CSP to forbid Function, and you're not willing to fix either of those
  // problems, please detail your unique predicament in a GitHub issue.
  Function("r", "regeneratorRuntime = r")(runtime);
}

},{}],"FOZT":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.promiseCallback = promiseCallback;
exports.triggerEvent = triggerEvent;
exports.friendlyFloat = friendlyFloat;
exports.getChannelData = getChannelData;

/**
 * Turns a promise into callback.
 * 
 * @param {Promise} promise 
 * @param {function} cb 
 */
function promiseCallback(promise, cb) {
  return promise.then(function (result) {
    return cb(null, result);
  }).catch(function (err) {
    return cb(err, result);
  });
}
/**
 * Helper for dispatching a custom event.
 * Default EventInit values are implicitly used, meaning events cannot be captured nor bubbled.
 * 
 * @param {EventTarget} eventTarget 
 * @param {string} eventName 
 * @param {any} eventDetail 
 */


function triggerEvent(eventTarget, eventName) {
  var eventDetail = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  eventTarget.dispatchEvent(new CustomEvent(eventName, {
    detail: eventDetail
  }));
}

function friendlyFloat(value, oldValue) {
  if (typeof value !== 'string') {
    return oldValue;
  }

  var lastChar = value.trim().substr(-1);
  var floatValue = parseFloat(value);

  if (lastChar === 'k' || lastChar === 'K') {
    floatValue *= 1000;
  }

  return floatValue;
}
/**
 * Get 'Transferable' raw audio samples from AudioBuffer.
 * This is a convenience function to pave over lack of ubiquitous copyFromChannel support.
 * 
 * @param {AudioBuffer} audioBuffer 
 * @param {number} channel 
 */


function getChannelData(audioBuffer, channel) {
  var channelData;

  if ('copyFromChannel' in audioBuffer) {
    channelData = new Float32Array(audioBuffer.length);
    audioBuffer.copyFromChannel(channelData, channel);
  } else {
    channelData = audioBuffer.getChannelData(channel).slice();
  }

  return channelData;
}
},{}],"TnXr":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TalkRecorder = void 0;

var _utils = require("./utils");

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }

function _construct(Parent, args, Class) { if (_isNativeReflectConstruct()) { _construct = Reflect.construct; } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var AudioContext = window.AudioContext || window.webkitAudioContext;
var OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext; // HACK: determine default worker URL using script tag's src attribute if available.

var workerUrl = "./lamemp3/worker.js";

if (document.currentScript && document.currentScript.src) {
  var scriptUrl = new URL(document.currentScript.src, document.baseURI).toString();
  var scriptBaseUrl = scriptUrl.substr(0, scriptUrl.lastIndexOf('/'));
  workerUrl = "".concat(scriptBaseUrl, "/lamemp3/worker.js");
}

console.log('default workerUrl', workerUrl);

var TalkRecorder = /*#__PURE__*/function (_HTMLElement) {
  _inherits(TalkRecorder, _HTMLElement);

  var _super = _createSuper(TalkRecorder);

  // Lowercased names of modifiable attributes to receive attributeChangedCallback on.
  function TalkRecorder() {
    _classCallCheck(this, TalkRecorder);

    return _super.call(this);
  } // Callback used to notify when an attribute in `observedAttributes` list changes value.
  // Also called before connectedCallback with each attribute's initial value.
  // Attributes covered include custom as well as built-in attributes, like style.
  // NOTE: attribute name will be in lowercase as specfied in the HTML spec.


  _createClass(TalkRecorder, [{
    key: "attributeChangedCallback",
    value: function attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'bitrate') {
        this.bitRate = (0, _utils.friendlyFloat)(newValue, oldValue);
      }
    } // Callback to notify custom element has been inserted into document.

  }, {
    key: "connectedCallback",
    value: function connectedCallback() {} // Callback to notify custom element has been removed from document.

  }, {
    key: "disconnectedCallback",
    value: function disconnectedCallback() {} // Callback to notify custom element's parentNode changes

  }, {
    key: "adoptedCallback",
    value: function adoptedCallback() {}
  }, {
    key: "isSupported",
    value: function isSupported() {
      return navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder && window.Worker && window.WebAssembly;
    }
  }, {
    key: "record",
    value: function () {
      var _record = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
        var _this = this;

        var options,
            getUserMediaOptions,
            blob,
            _args = arguments;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                options = _args.length > 0 && _args[0] !== undefined ? _args[0] : {};

                if (this.isSupported()) {
                  _context.next = 3;
                  break;
                }

                throw new Error('This browser does not support media recording');

              case 3:
                if (!this.stream) {
                  _context.next = 5;
                  break;
                }

                throw new Error('already recording');

              case 5:
                (0, _utils.triggerEvent)(this, 'record');
                options = Object.assign({}, {
                  type: 'opus',
                  timeslice: 20,
                  workerUrl: workerUrl
                }, options); // Use optional 'getUserMedia' field of recording call options to override.

                getUserMediaOptions = Object.assign({}, {
                  audio: true,
                  video: false,
                  channelCount: 1,
                  autoGainControl: true,
                  echoCancellation: true,
                  noiseSuppression: true
                }, options.getUserMedia); // start capturing audio

                _context.next = 10;
                return navigator.mediaDevices.getUserMedia(getUserMediaOptions);

              case 10:
                this.stream = _context.sent;
                this.addEventListener('stop', function (e) {
                  _this.stream.getTracks().forEach(function (track) {
                    return track.stop();
                  });

                  _this.stream = null;
                }, {
                  once: true
                });
                (0, _utils.triggerEvent)(this, 'stream', {
                  stream: this.stream
                });
                _context.prev = 13;

                if (!(options.type === 'opus')) {
                  _context.next = 20;
                  break;
                }

                _context.next = 17;
                return this._recordOpus(this.stream, options);

              case 17:
                blob = _context.sent;
                _context.next = 24;
                break;

              case 20:
                if (!(options.type === 'mp3')) {
                  _context.next = 24;
                  break;
                }

                _context.next = 23;
                return this._recordMP3(this.stream, options);

              case 23:
                blob = _context.sent;

              case 24:
                (0, _utils.triggerEvent)(this, 'recorded', {
                  blob: blob
                });
                return _context.abrupt("return", blob);

              case 28:
                _context.prev = 28;
                _context.t0 = _context["catch"](13);
                (0, _utils.triggerEvent)(this, 'error', {
                  error: _context.t0
                });
                throw _context.t0;

              case 32:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this, [[13, 28]]);
      }));

      function record() {
        return _record.apply(this, arguments);
      }

      return record;
    }()
  }, {
    key: "stop",
    value: function () {
      var _stop = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
        var reason,
            _args2 = arguments;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                reason = _args2.length > 0 && _args2[0] !== undefined ? _args2[0] : 'finish';
                (0, _utils.triggerEvent)(this, 'stop', {
                  reason: reason
                });

              case 2:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function stop() {
        return _stop.apply(this, arguments);
      }

      return stop;
    }()
  }, {
    key: "convert",
    value: function () {
      var _convert = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(audioBlob) {
        var _this2 = this;

        var options,
            inputSampleRate,
            audioData,
            inputPCM,
            bitRate,
            _args3 = arguments;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                options = _args3.length > 1 && _args3[1] !== undefined ? _args3[1] : {};
                (0, _utils.triggerEvent)(this, 'convert');
                options = Object.assign({}, {
                  sampleRate: 48000,
                  type: 'mp3',
                  workerUrl: workerUrl
                }, options); // decode audio samples using 48000 as default input sample rate.

                inputSampleRate = options.sampleRate || 48000;
                _context3.next = 6;
                return arrayBufferFromBlob(audioBlob);

              case 6:
                audioData = _context3.sent;
                _context3.next = 9;
                return decodeAudioData(audioData, inputSampleRate);

              case 9:
                inputPCM = _context3.sent;
                bitRate = this.bitRate || 64 * 1000; // MP3-specific default bitRate
                // Until direct to MP3 encoder implemented, record as Opus first then convert as a whole.

                return _context3.abrupt("return", withWorker(options.workerUrl, function (worker) {
                  var CHUNK_SIZE = 8192;
                  worker.postMessage({
                    type: 'init',
                    sampleRate: inputSampleRate,
                    bitRate: bitRate
                  }); // send to worker in chunks

                  var offset = 0;
                  var remain = inputPCM.length;

                  while (remain > 0) {
                    var length = remain > CHUNK_SIZE ? CHUNK_SIZE : remain; // slice out a chunk into its own ArrayBuffer

                    var chunk = new Float32Array(length);
                    chunk.set(inputPCM.slice(offset, offset + length), 0);
                    offset += length;
                    remain -= length;
                    worker.postMessage({
                      type: 'data',
                      data: chunk.buffer
                    }, [chunk.buffer]);
                  } // signal end of data


                  worker.postMessage({
                    type: 'flush'
                  });
                }).then(function (blob) {
                  (0, _utils.triggerEvent)(_this2, 'converted', {
                    blob: blob
                  });
                  return blob;
                }).catch(function (err) {
                  (0, _utils.triggerEvent)(_this2, 'error', {
                    error: err
                  });
                  throw err;
                }));

              case 12:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function convert(_x) {
        return _convert.apply(this, arguments);
      }

      return convert;
    }()
  }, {
    key: "_recordOpus",
    value: function () {
      var _recordOpus2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(stream, options) {
        var bitRate, mediaRecorderOptions, recorder;
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                bitRate = this.bitRate || 32 * 1000; // Uses 32k as default bitrate for Opus podcast
                // Use optional 'MediaRecorder' field of recording call options to override.

                mediaRecorderOptions = Object.assign({}, {
                  mimeType: 'audio/webm; codecs="opus"',
                  audioBitsPerSecond: bitRate
                }, options.MediaRecorder); // MediaRecorder instance had issues when reused.
                // So each recording session creates a new instance internally.

                recorder = new MediaRecorder(stream, mediaRecorderOptions); // Stop event is used to stop recording.

                this.addEventListener('stop', function (_ref) {
                  var reason = _ref.detail.reason;

                  if (!recorder || recorder.state !== 'recording') {
                    return;
                  }

                  recorder.stop();
                }, {
                  once: true
                }); // Time-sliced blobs from MediaRecorders are not guaranteed to honor logical boundaries.
                // So blobs are merged to form a proper opus packets in webm container is returned when stopped.
                // Override optional 'timeslice' recording option to change timeslice duration (default 20ms).
                // Note that resulting audio file's duration field is not set correctly on Chrome.

                return _context4.abrupt("return", new Promise(function (resolve, reject) {
                  var blobs = [];

                  recorder.ondataavailable = function (e) {
                    if (typeof e.data !== "undefined" && e.data.size > 0) {
                      blobs.push(e.data);
                    }
                  };

                  recorder.onstop = function (e) {
                    if (blobs.length > 0) {
                      resolve(new Blob(blobs, {
                        type: blobs[0].type
                      }));
                    } else {
                      resolve(null);
                    }
                  };

                  recorder.onerror = function (e) {
                    reject(e.error);
                  };

                  recorder.start(options.timeslice);
                }));

              case 5:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function _recordOpus(_x2, _x3) {
        return _recordOpus2.apply(this, arguments);
      }

      return _recordOpus;
    }()
  }, {
    key: "_recordMP3",
    value: function () {
      var _recordMP = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(stream, options) {
        var _this3 = this;

        var sampleRate;
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                sampleRate = stream.getAudioTracks()[0].getSettings().sampleRate;
                return _context5.abrupt("return", withWorker(options.workerUrl, function (worker) {
                  var bitRate = _this3.bitRate || 64 * 1024; // MP3-specific default bitrate for podcasting

                  worker.postMessage({
                    type: 'init',
                    sampleRate: sampleRate,
                    bitRate: bitRate
                  });

                  _this3._processStream(stream, function (samples) {
                    worker.postMessage({
                      type: 'data',
                      data: samples.buffer
                    }, [samples.buffer]);
                  });

                  _this3.addEventListener("stop", function (e) {
                    // signal end of data
                    worker.postMessage({
                      type: 'flush'
                    });
                  });
                }));

              case 2:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5);
      }));

      function _recordMP3(_x4, _x5) {
        return _recordMP.apply(this, arguments);
      }

      return _recordMP3;
    }()
  }, {
    key: "_processStream",
    value: function () {
      var _processStream2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(stream, processor) {
        var audioContext, sourceNode, processorNode;
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                audioContext = new AudioContext();
                sourceNode = audioContext.createMediaStreamSource(stream);
                processorNode = audioContext.createScriptProcessor(0, 1, 1);

                processorNode.onaudioprocess = function (e) {
                  return processor((0, _utils.getChannelData)(e.inputBuffer, 0));
                };

                sourceNode.connect(processorNode);
                processorNode.connect(audioContext.destination);
                this.addEventListener("stop", function (e) {
                  sourceNode.disconnect();
                });

              case 7:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function _processStream(_x6, _x7) {
        return _processStream2.apply(this, arguments);
      }

      return _processStream;
    }()
  }]);

  return TalkRecorder;
}( /*#__PURE__*/_wrapNativeSuper(HTMLElement));
/**
 * Reads all of blob data into an ArrayBuffer.
 * 
 * @param {Blob} blob 
 * 
 * @result {ArrayBuffer}
 */


exports.TalkRecorder = TalkRecorder;

_defineProperty(TalkRecorder, "observedAttributes", ["bitrate"]);

function arrayBufferFromBlob(_x8) {
  return _arrayBufferFromBlob.apply(this, arguments);
}
/**
 * Decode compressed audio data into uncompressed (PCM) audio data.
 * 
 * @param {ArrayBuffer} audioData
 * 
 * @result {Float32Array}
 */


function _arrayBufferFromBlob() {
  _arrayBufferFromBlob = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee7(blob) {
    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            return _context7.abrupt("return", new Promise(function (resolve, reject) {
              var reader = new FileReader();
              reader.readAsArrayBuffer(blob);

              reader.onload = function () {
                return resolve(reader.result);
              };

              reader.onerror = function () {
                return reject(reader.error);
              };
            }));

          case 1:
          case "end":
            return _context7.stop();
        }
      }
    }, _callee7);
  }));
  return _arrayBufferFromBlob.apply(this, arguments);
}

function decodeAudioData(_x9) {
  return _decodeAudioData.apply(this, arguments);
}

function _decodeAudioData() {
  _decodeAudioData = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee8(audioData) {
    var sampleRate,
        audioCtx,
        audioBuffer,
        _args8 = arguments;
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            sampleRate = _args8.length > 1 && _args8[1] !== undefined ? _args8[1] : 48000;
            // OfflineAudioContext is more appropriate here but plain AudioContext
            // is used to avoid potential outstanding unreleased memory issue.
            audioCtx = new AudioContext({
              sampleRate: sampleRate
            });
            _context8.next = 4;
            return audioCtx.decodeAudioData(audioData);

          case 4:
            audioBuffer = _context8.sent;
            return _context8.abrupt("return", (0, _utils.getChannelData)(audioBuffer, 0));

          case 6:
          case "end":
            return _context8.stop();
        }
      }
    }, _callee8);
  }));
  return _decodeAudioData.apply(this, arguments);
}

function withWorker(workerUrl, workHandler) {
  // Needs a Web Worker and WebAssembly supporting browser
  if (!window.Worker || !window.WebAssembly) {
    throw new Error('Worker and WebAssembly features not available');
  }

  return new Promise(function (resolve, reject) {
    var worker;

    if (new URL(workerUrl).host === window.location.host) {
      worker = new Worker(workerUrl);
    } else {
      worker = new Worker(URL.createObjectURL(new Blob(["importScripts(\"".concat(workerUrl, "\");")])));
    }

    worker.onmessage = function (msg) {
      switch (msg.data.type) {
        case 'ready':
          workHandler(worker);
          break;

        case 'done':
          worker.terminate();
          resolve(msg.data.blob);
          break;
      }
    };

    worker.onerror = function (err) {
      reject(err);
    };
  });
}
},{"./utils":"FOZT"}],"q5gj":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

require("regenerator-runtime/runtime");

var _TalkRecorder = require("./TalkRecorder");

Object.keys(_TalkRecorder).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _TalkRecorder[key];
    }
  });
});

if (typeof window !== 'undefined') {
  window.TalkRecorder = _TalkRecorder.TalkRecorder;

  if ('customElements' in window) {
    customElements.define("talk-recorder", _TalkRecorder.TalkRecorder);
  }
}
},{"regenerator-runtime/runtime":"QVnC","./TalkRecorder":"TnXr"}]},{},["q5gj"], null)
//# sourceMappingURL=/talk-recorder.js.map