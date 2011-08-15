/*
 * jQuery JSONP Core Plugin 2.1.4 (2010-11-17)
 * 
 * http://code.google.com/p/jquery-jsonp/
 *
 * Copyright (c) 2010 Julian Aubourg
 *
 * This document is licensed as free software under the terms of the
 * MIT License: http://www.opensource.org/licenses/mit-license.php
 */
( function( $ , setTimeout ) {
	
	// ###################### UTILITIES ##
	
	// Noop
	function noop() {
	}
	
	// Generic callback
	function genericCallback( data ) {
		lastValue = [ data ];
	}

	// Add script to document
	function appendScript( node ) {
		head.insertBefore( node , head.firstChild );
	}
	
	// Call if defined
	function callIfDefined( method , object , parameters ) {
		return method && method.apply( object.context || object , parameters );
	}
	
	// Give joining character given url
	function qMarkOrAmp( url ) {
		return /\?/ .test( url ) ? "&" : "?";
	}
	
	var // String constants (for better minification)
		STR_ASYNC = "async",
		STR_CHARSET = "charset",
		STR_EMPTY = "",
		STR_ERROR = "error",
		STR_JQUERY_JSONP = "_jqjsp",
		STR_ON = "on",
		STR_ONCLICK = STR_ON + "click",
		STR_ONERROR = STR_ON + STR_ERROR,
		STR_ONLOAD = STR_ON + "load",
		STR_ONREADYSTATECHANGE = STR_ON + "readystatechange",
		STR_REMOVE_CHILD = "removeChild",
		STR_SCRIPT_TAG = "<script/>",
		STR_SUCCESS = "success",
		STR_TIMEOUT = "timeout",
		
		// Shortcut to jQuery.browser
		browser = $.browser,
		
		// Head element (for faster use)
		head = $( "head" )[ 0 ] || document.documentElement,
		// Page cache
		pageCache = {},
		// Counter
		count = 0,
		// Last returned value
		lastValue,
		
		// ###################### DEFAULT OPTIONS ##
		xOptionsDefaults = {
			//beforeSend: undefined,
			//cache: false,
			callback: STR_JQUERY_JSONP,
			//callbackParameter: undefined,
			//charset: undefined,
			//complete: undefined,
			//context: undefined,
			//data: "",
			//dataFilter: undefined,
			//error: undefined,
			//pageCache: false,
			//success: undefined,
			//timeout: 0,
			//traditional: false,		
			url: location.href
		};
	
	// ###################### MAIN FUNCTION ##
	function jsonp( xOptions ) {
		
		// Build data with default
		xOptions = $.extend( {} , xOptionsDefaults , xOptions );
		
		// References to xOptions members (for better minification)
		var completeCallback = xOptions.complete,
			dataFilter = xOptions.dataFilter,
			callbackParameter = xOptions.callbackParameter,
			successCallbackName = xOptions.callback,
			cacheFlag = xOptions.cache,
			pageCacheFlag = xOptions.pageCache,
			charset = xOptions.charset,
			url = xOptions.url,
			data = xOptions.data,
			timeout = xOptions.timeout,
			pageCached,
			
			// Abort/done flag
			done = 0,
			
			// Life-cycle functions
			cleanUp = noop;
		
		// Create the abort method
		xOptions.abort = function() { 
			! done++ &&	cleanUp(); 
		};

		// Call beforeSend if provided (early abort if false returned)
		if ( callIfDefined( xOptions.beforeSend, xOptions , [ xOptions ] ) === false || done ) {
			return xOptions;
		}
			
		// Control entries
		url = url || STR_EMPTY;
		data = data ? ( (typeof data) == "string" ? data : $.param( data , xOptions.traditional ) ) : STR_EMPTY;
			
		// Build final url
		url += data ? ( qMarkOrAmp( url ) + data ) : STR_EMPTY;
		
		// Add callback parameter if provided as option
		callbackParameter && ( url += qMarkOrAmp( url ) + encodeURIComponent( callbackParameter ) + "=?" );
		
		// Add anticache parameter if needed
		! cacheFlag && ! pageCacheFlag && ( url += qMarkOrAmp( url ) + "_" + ( new Date() ).getTime() + "=" );
		
		// Replace last ? by callback parameter
		url = url.replace( /=\?(&|$)/ , "=" + successCallbackName + "$1" );
		
		// Success notifier
		function notifySuccess( json ) {
			! done++ && setTimeout( function() {
				cleanUp();
				// Pagecache if needed
				pageCacheFlag && ( pageCache [ url ] = { s: [ json ] } );
				// Apply the data filter if provided
				dataFilter && ( json = dataFilter.apply( xOptions , [ json ] ) );
				// Call success then complete
				callIfDefined( xOptions.success , xOptions , [ json , STR_SUCCESS ] );
				callIfDefined( completeCallback , xOptions , [ xOptions , STR_SUCCESS ] );
			} , 0 );
		}
		
		// Error notifier
		function notifyError( type ) {
			! done++ && setTimeout( function() {
				// Clean up
				cleanUp();
				// If pure error (not timeout), cache if needed
				pageCacheFlag && type != STR_TIMEOUT && ( pageCache[ url ] = type );
				// Call error then complete
				callIfDefined( xOptions.error , xOptions , [ xOptions , type ] );
				callIfDefined( completeCallback , xOptions , [ xOptions , type ] );
			} , 0 );
		}
	    
		// Check page cache
		pageCacheFlag && ( pageCached = pageCache[ url ] ) 
			? ( pageCached.s ? notifySuccess( pageCached.s[ 0 ] ) : notifyError( pageCached ) )
			:
			// Initiate request
			setTimeout( function( script , scriptAfter , timeoutTimer ) {
				
				if ( ! done ) {
				
					// If a timeout is needed, install it
					timeoutTimer = timeout > 0 && setTimeout( function() {
						notifyError( STR_TIMEOUT );
					} , timeout );
					
					// Re-declare cleanUp function
					cleanUp = function() {
						timeoutTimer && clearTimeout( timeoutTimer );
						script[ STR_ONREADYSTATECHANGE ]
							= script[ STR_ONCLICK ]
							= script[ STR_ONLOAD ]
							= script[ STR_ONERROR ]
							= null;
						head[ STR_REMOVE_CHILD ]( script );
						scriptAfter && head[ STR_REMOVE_CHILD ]( scriptAfter );
					};
					
					// Install the generic callback
					// (BEWARE: global namespace pollution ahoy)
					window[ successCallbackName ] = genericCallback;

					// Create the script tag
					script = $( STR_SCRIPT_TAG )[ 0 ];
					script.id = STR_JQUERY_JSONP + count++;
					
					// Set charset if provided
					if ( charset ) {
						script[ STR_CHARSET ] = charset;
					}
					
					// Callback function
					function callback( result ) {
						( script[ STR_ONCLICK ] || noop )();
						result = lastValue;
						lastValue = undefined;
						result ? notifySuccess( result[ 0 ] ) : notifyError( STR_ERROR );
					}
										
					// IE: event/htmlFor/onclick trick
					// One can't rely on proper order for onreadystatechange
					// We have to sniff since FF doesn't like event & htmlFor... at all
					if ( browser.msie ) {
						
						script.event = STR_ONCLICK;
						script.htmlFor = script.id;
						script[ STR_ONREADYSTATECHANGE ] = function() {
							/loaded|complete/.test( script.readyState ) && callback();
						};
						
					// All others: standard handlers
					} else {					
					
						script[ STR_ONERROR ] = script[ STR_ONLOAD ] = callback;
						
						browser.opera ?
							
							// Opera: onerror is not called, use synchronized script execution
							( ( scriptAfter = $( STR_SCRIPT_TAG )[ 0 ] ).text = "jQuery('#" + script.id + "')[0]." + STR_ONERROR + "()" )
							
							// Firefox: set script as async to avoid blocking scripts (3.6+ only)
							: script[ STR_ASYNC ] = STR_ASYNC;
							
						;
					}
					
					// Set source
					script.src = url;
					
					// Append main script
					appendScript( script );
					
					// Opera: Append trailing script
					scriptAfter && appendScript( scriptAfter );
				}
				
			} , 0 );
		
		return xOptions;
	}
	
	// ###################### SETUP FUNCTION ##
	jsonp.setup = function( xOptions ) {
		$.extend( xOptionsDefaults , xOptions );
	};

	// ###################### INSTALL in jQuery ##
	$.jsonp = jsonp;
	
} )( jQuery , setTimeout );// Instantiate objects based on a JSON "record". The record must be a statement
// array in the following form:
//
//     [ "{verb} {subject}", arg0, arg1, arg2, ... argn ]
//
// Each record is processed from a passed `context` which starts from the
// global (ie. `window`) context if unspecified.
//
// - `@literal` Evaluate `subject` and return its value as a scalar. Useful for
//   referencing API constants, object properties or other values.
// - `@new` Call `subject` as a constructor with args `arg0 - argn`. The
//   newly created object will be the new context.
// - `@call` Call `subject` as a function with args `arg0 - argn` in the
//   global namespace. The return value will be the new context.
// - `@chain` Call `subject` as a method of the current context with args `arg0
//   - argn`. The return value will be the new context.
// - `@inject` Call `subject` as a method of the current context with args
//   `arg0 - argn`. The return value will *not* affect the context.
// - `@group` Treat `arg0 - argn` as a series of statement arrays that share a
//   context. Each statement will be called in serial and affect the context
//   for the next statement.
//
// Requirements:
//
// - Underscore.js
// - jQuery @TODO: only used for $.browser check. Could probably be removed.
//
// Usage:
//
//     var gmap = ['@new google.maps.Map',
//         ['@call document.getElementById', 'gmap'],
//         {
//             center: [ '@new google.maps.LatLng', 0, 0 ],
//             zoom: 2,
//             mapTypeId: [ '@literal google.maps.MapTypeId.ROADMAP' ]
//         }
//     ];
//     wax.Record(gmap);
var wax = wax || {};
wax.Record = function(obj, context) {
    var getFunction = function(head, cur) {
        var ret = _.reduce(head.split('.'), function(part, segment) {
            return [part[1] || part[0], part[1] ? part[1][segment] : part[0][segment]];
        }, [cur || window, null]);
        if (ret[0] && ret[1]) {
            return ret;
        } else {
            throw head + ' not found.';
        }
    };
    var makeObject = function(fn_name, args) {
        var fn_obj = getFunction(fn_name),
            obj;
        args = args.length ? wax.Record(args) : [];

        // real browsers
        if (Object.create) {
            obj = Object.create(fn_obj[1].prototype);
            fn_obj[1].apply(obj, args);
        // lord have mercy on your soul.
        } else {
            switch (args.length) {
                case 0: obj = new fn_obj[1](); break;
                case 1: obj = new fn_obj[1](args[0]); break;
                case 2: obj = new fn_obj[1](args[0], args[1]); break;
                case 3: obj = new fn_obj[1](args[0], args[1], args[2]); break;
                case 4: obj = new fn_obj[1](args[0], args[1], args[2], args[3]); break;
                case 5: obj = new fn_obj[1](args[0], args[1], args[2], args[3], args[4]); break;
                default: break;
            }
        }
        return obj;
    };
    var runFunction = function(fn_name, args, cur) {
        var fn_obj = getFunction(fn_name, cur);
        var fn_args = args.length ? wax.Record(args) : [];
        // @TODO: This is currently a stopgap measure that calls methods like
        // `foo.bar()` in the context of `foo`. It will probably be necessary
        // in the future to be able to call `foo.bar()` from other contexts.
        if (cur && fn_name.indexOf('.') === -1) {
            return fn_obj[1].apply(cur, fn_args);
        } else {
            return fn_obj[1].apply(fn_obj[0], fn_args);
        }
    };
    var isKeyword = function(string) {
        return _.isString(string) && (_.indexOf([
            '@new',
            '@call',
            '@literal',
            '@chain',
            '@inject',
            '@group'
        ], string.split(' ')[0]) !== -1);
    };
    var altersContext = function(string) {
        return _.isString(string) && (_.indexOf([
            '@new',
            '@call',
            '@chain'
        ], string.split(' ')[0]) !== -1);
    };
    var getStatement = function(obj) {
        if (_.isArray(obj) && obj[0] && isKeyword(obj[0])) {
            return {
                verb: obj[0].split(' ')[0],
                subject: obj[0].split(' ')[1],
                object: obj.slice(1)
            };
        }
        return false;
    };

    var i,
        fn = false,
        ret = null,
        child = null,
        statement = getStatement(obj);
    if (statement) {
        switch (statement.verb) {
        case '@group':
            for (i = 0; i < statement.object.length; i++) {
                ret = wax.Record(statement.object[i], context);
                child = getStatement(statement.object[i]);
                if (child && altersContext(child.verb)) {
                    context = ret;
                }
            }
            return context;
        case '@new':
            return makeObject(statement.subject, statement.object);
        case '@literal':
            fn = getFunction(statement.subject);
            return fn ? fn[1] : null;
        case '@inject':
            return runFunction(statement.subject, statement.object, context);
        case '@chain':
            return runFunction(statement.subject, statement.object, context);
        case '@call':
            return runFunction(statement.subject, statement.object, null);
        }
    } else if (obj !== null && typeof obj === 'object') {
        var keys = _.keys(obj);
        for (i = 0; i < keys.length; i++) {
            var key = keys[i];
            obj[key] = wax.Record(obj[key], context);
        }
        return obj;
    } else {
        return obj;
    }
};
//     Underscore.js 1.1.4
//     (c) 2011 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore is freely distributable under the MIT license.
//     Portions of Underscore are inspired or borrowed from Prototype,
//     Oliver Steele's Functional, and John Resig's Micro-Templating.
//     For all details and documentation:
//     http://documentcloud.github.com/underscore

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var slice            = ArrayProto.slice,
      unshift          = ArrayProto.unshift,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) { return new wrapper(obj); };

  // Export the Underscore object for **CommonJS**, with backwards-compatibility
  // for the old `require()` API. If we're not in CommonJS, add `_` to the
  // global object.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = _;
    _._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.1.4';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects implementing `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    var value;
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (_.isNumber(obj.length)) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = memo !== void 0;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial && index === 0) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError("Reduce of empty array with no initial value");
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return memo !== void 0 ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var reversed = (_.isArray(obj) ? obj.slice() : _.toArray(obj)).reverse();
    return _.reduce(reversed, iterator, memo, context);
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    each(obj, function(value, index, list) {
      if (!iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator = iterator || _.identity;
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator = iterator || _.identity;
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result = iterator.call(context, value, index, list)) return breaker;
    });
    return result;
  };

  // Determine if a given value is included in the array or object using `===`.
  // Aliased as `contains`.
  _.include = _.contains = function(obj, target) {
    var found = false;
    if (obj == null) return found;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    any(obj, function(value) {
      if (found = value === target) return true;
    });
    return found;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    return _.map(obj, function(value) {
      return (method ? value[method] : value).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Return the maximum element or (element-based computation).
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj)) return Math.max.apply(Math, obj);
    var result = {computed : -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj)) return Math.min.apply(Math, obj);
    var result = {computed : Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, iterator, context) {
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria, b = right.criteria;
      return a < b ? -1 : a > b ? 1 : 0;
    }), 'value');
  };

  // Use a comparator function to figure out at what index an object should
  // be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator) {
    iterator = iterator || _.identity;
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >> 1;
      iterator(array[mid]) < iterator(obj) ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(iterable) {
    if (!iterable)                return [];
    if (iterable.toArray)         return iterable.toArray();
    if (_.isArray(iterable))      return iterable;
    if (_.isArguments(iterable))  return slice.call(iterable);
    return _.values(iterable);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    return _.toArray(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head`. The **guard** check allows it to work
  // with `_.map`.
  _.first = _.head = function(array, n, guard) {
    return n && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the first entry of the array. Aliased as `tail`.
  // Especially useful on the arguments object. Passing an **index** will return
  // the rest of the values in the array from that index onward. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = function(array, index, guard) {
    return slice.call(array, _.isUndefined(index) || guard ? 1 : index);
  };

  // Get the last element of an array.
  _.last = function(array) {
    return array[array.length - 1];
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, function(value){ return !!value; });
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array) {
    return _.reduce(array, function(memo, value) {
      if (_.isArray(value)) return memo.concat(_.flatten(value));
      memo[memo.length] = value;
      return memo;
    }, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    var values = slice.call(arguments, 1);
    return _.filter(array, function(value){ return !_.include(values, value); });
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted) {
    return _.reduce(array, function(memo, el, i) {
      if (0 == i || (isSorted === true ? _.last(memo) != el : !_.include(memo, el))) memo[memo.length] = el;
      return memo;
    }, []);
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersect = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) results[i] = _.pluck(args, "" + i);
    return results;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    if (isSorted) {
      var i = _.sortedIndex(array, item);
      return array[i] === item ? i : -1;
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item);
    for (var i = 0, l = array.length; i < l; i++) if (array[i] === item) return i;
    return -1;
  };


  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item) {
    if (array == null) return -1;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) return array.lastIndexOf(item);
    var i = array.length;
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    var args  = slice.call(arguments),
        solo  = args.length <= 1,
        start = solo ? 0 : args[0],
        stop  = solo ? args[0] : args[1],
        step  = args[2] || 1,
        len   = Math.max(Math.ceil((stop - start) / step), 0),
        idx   = 0,
        range = new Array(len);
    while (idx < len) {
      range[idx++] = start;
      start += step;
    }
    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Binding with arguments is also known as `curry`.
  _.bind = function(func, obj) {
    var args = slice.call(arguments, 2);
    return function() {
      return func.apply(obj || {}, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length == 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher = hasher || _.identity;
    return function() {
      var key = hasher.apply(this, arguments);
      return key in memo ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(func, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Internal function used to implement `_.throttle` and `_.debounce`.
  var limit = function(func, wait, debounce) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      var throttler = function() {
        timeout = null;
        func.apply(context, args);
      };
      if (debounce) clearTimeout(timeout);
      if (debounce || !timeout) timeout = setTimeout(throttler, wait);
    };
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    return limit(func, wait, false);
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds.
  _.debounce = function(func, wait) {
    return limit(func, wait, true);
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func].concat(slice.call(arguments));
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = slice.call(arguments);
    return function() {
      var args = slice.call(arguments);
      for (var i=funcs.length-1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (_.isArray(obj)) return _.range(0, obj.length);
    var keys = [];
    for (var key in obj) if (hasOwnProperty.call(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    return _.map(obj, _.identity);
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    return _.filter(_.keys(obj), function(key){ return _.isFunction(obj[key]); }).sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) obj[prop] = source[prop];
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    // Check object identity.
    if (a === b) return true;
    // Different types?
    var atype = typeof(a), btype = typeof(b);
    if (atype != btype) return false;
    // Basic equality test (watch out for coercions).
    if (a == b) return true;
    // One is falsy and the other truthy.
    if ((!a && b) || (a && !b)) return false;
    // Unwrap any wrapped objects.
    if (a._chain) a = a._wrapped;
    if (b._chain) b = b._wrapped;
    // One of them implements an isEqual()?
    if (a.isEqual) return a.isEqual(b);
    // Check dates' integer values.
    if (_.isDate(a) && _.isDate(b)) return a.getTime() === b.getTime();
    // Both are NaN?
    if (_.isNaN(a) && _.isNaN(b)) return false;
    // Compare regular expressions.
    if (_.isRegExp(a) && _.isRegExp(b))
      return a.source     === b.source &&
             a.global     === b.global &&
             a.ignoreCase === b.ignoreCase &&
             a.multiline  === b.multiline;
    // If a is not an object by this point, we can't handle it.
    if (atype !== 'object') return false;
    // Check for different array lengths before comparing contents.
    if (a.length && (a.length !== b.length)) return false;
    // Nothing else worked, deep compare the contents.
    var aKeys = _.keys(a), bKeys = _.keys(b);
    // Different object sizes?
    if (aKeys.length != bKeys.length) return false;
    // Recursive comparison of contents.
    for (var key in a) if (!(key in b) || !_.isEqual(a[key], b[key])) return false;
    return true;
  };

  // Is a given array or object empty?
  _.isEmpty = function(obj) {
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (hasOwnProperty.call(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType == 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an arguments object?
  _.isArguments = function(obj) {
    return !!(obj && hasOwnProperty.call(obj, 'callee'));
  };

  // Is a given value a function?
  _.isFunction = function(obj) {
    return !!(obj && obj.constructor && obj.call && obj.apply);
  };

  // Is a given value a string?
  _.isString = function(obj) {
    return !!(obj === '' || (obj && obj.charCodeAt && obj.substr));
  };

  // Is a given value a number?
  _.isNumber = function(obj) {
    return !!(obj === 0 || (obj && obj.toExponential && obj.toFixed));
  };

  // Is the given value `NaN`? `NaN` happens to be the only value in JavaScript
  // that does not equal itself.
  _.isNaN = function(obj) {
    return obj !== obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false;
  };

  // Is a given value a date?
  _.isDate = function(obj) {
    return !!(obj && obj.getTimezoneOffset && obj.setUTCFullYear);
  };

  // Is the given value a regular expression?
  _.isRegExp = function(obj) {
    return !!(obj && obj.test && obj.exec && (obj.ignoreCase || obj.ignoreCase === false));
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function (n, iterator, context) {
    for (var i = 0; i < n; i++) iterator.call(context, i);
  };

  // Add your own custom functions to the Underscore object, ensuring that
  // they're correctly added to the OOP wrapper as well.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      addToWrapper(name, _[name] = obj[name]);
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = idCounter++;
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(str, data) {
    var c  = _.templateSettings;
    var tmpl = 'var __p=[],print=function(){__p.push.apply(__p,arguments);};' +
      'with(obj||{}){__p.push(\'' +
      str.replace(/\\/g, '\\\\')
         .replace(/'/g, "\\'")
         .replace(c.interpolate, function(match, code) {
           return "'," + code.replace(/\\'/g, "'") + ",'";
         })
         .replace(c.evaluate || null, function(match, code) {
           return "');" + code.replace(/\\'/g, "'")
                              .replace(/[\r\n\t]/g, ' ') + "__p.push('";
         })
         .replace(/\r/g, '\\r')
         .replace(/\n/g, '\\n')
         .replace(/\t/g, '\\t')
         + "');}return __p.join('');";
    var func = new Function('obj', tmpl);
    return data ? func(data) : func;
  };

  // The OOP Wrapper
  // ---------------

  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.
  var wrapper = function(obj) { this._wrapped = obj; };

  // Expose `wrapper.prototype` as `_.prototype`
  _.prototype = wrapper.prototype;

  // Helper function to continue chaining intermediate results.
  var result = function(obj, chain) {
    return chain ? _(obj).chain() : obj;
  };

  // A method to easily add functions to the OOP wrapper.
  var addToWrapper = function(name, func) {
    wrapper.prototype[name] = function() {
      var args = slice.call(arguments);
      unshift.call(args, this._wrapped);
      return result(func.apply(_, args), this._chain);
    };
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    wrapper.prototype[name] = function() {
      method.apply(this._wrapped, arguments);
      return result(this._wrapped, this._chain);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    wrapper.prototype[name] = function() {
      return result(method.apply(this._wrapped, arguments), this._chain);
    };
  });

  // Start chaining a wrapped Underscore object.
  wrapper.prototype.chain = function() {
    this._chain = true;
    return this;
  };

  // Extracts the result from a wrapped and chained object.
  wrapper.prototype.value = function() {
    return this._wrapped;
  };

})();
// Wax GridUtil
// ------------

// Wax header
var wax = wax || {};

// Nondrag
// -------
// A simple abstraction from the `mousemove` handler that doesn't
// trigger mousemove events while dragging.
(function($) {
    $.fn.extend({
        nondrag: function(callback) {
            $(this).bind('mousedown mouseup mousemove', function(evt) {
                var down = false;
                if (evt.type === 'mouseup') {
                    down = false;
                } else if (down || evt.type === 'mousedown') {
                    down = true;
                    // Don't trigger the callback if this is a drag.
                    return;
                }
                callback(evt);
            });
            return this;
        }
    });
})(jQuery);

// Request
// -------
// Request data cache. `callback(data)` where `data` is the response data.
wax.request = {
    cache: {},
    locks: {},
    promises: {},
    get: function(url, callback) {
        // Cache hit.
        if (this.cache[url]) {
            return callback(this.cache[url]);
        // Cache miss.
        } else {
            this.promises[url] = this.promises[url] || [];
            this.promises[url].push(callback);
            // Lock hit.
            if (this.locks[url]) return;
            // Request.
            var that = this;
            this.locks[url] = true;
            $.jsonp({
                url: url,
                context: this,
                callback: 'grid',
                callbackParameter: 'callback',
                success: function(data) {
                    that.locks[url] = false;
                    that.cache[url] = data;
                    for (var i = 0; i < that.promises[url].length; i++) {
                        that.promises[url][i](that.cache[url]);
                    }
                },
                error: function() {
                    that.locks[url] = false;
                    that.cache[url] = null;
                    for (var i = 0; i < that.promises[url].length; i++) {
                        that.promises[url][i](that.cache[url]);
                    }
                }
            });
        }
    }
};

// GridInstance
// ------------
// GridInstances are queryable, fully-formed
// objects for acquiring features from events.
wax.GridInstance = function(grid_tile, formatter) {
    this.grid_tile = grid_tile;
    this.formatter = formatter;
    this.tileRes = 4;
};

// Resolve the UTF-8 encoding stored in grids to simple
// number values.
// See the [utfgrid section of the mbtiles spec](https://github.com/mapbox/mbtiles-spec/blob/master/1.1/utfgrid.md)
// for details.
wax.GridInstance.prototype.resolveCode = function(key) {
  (key >= 93) && key--;
  (key >= 35) && key--;
  key -= 32;
  return key;
};

wax.GridInstance.prototype.getFeature = function(x, y, tile_element, options) {
  if (!(this.grid_tile && this.grid_tile.grid)) return;
  var tileX, tileY;
  if (tile_element.left && tile_element.top) {
      tileX = tile_element.left;
      tileY = tile_element.top;
  } else {
      var $tile_element = $(tile_element);
      // IE problem here - though recoverable, for whatever reason
      tileX = $tile_element.offset().left;
      tileY = $tile_element.offset().top;
  }
  if (Math.floor((y - tileY) / this.tileRes) > 256 ||
    Math.floor((x - tileX) / this.tileRes) > 256) return;

  var key = this.grid_tile.grid[
     Math.floor((y - tileY) / this.tileRes)
  ].charCodeAt(
     Math.floor((x - tileX) / this.tileRes)
  );

  key = this.resolveCode(key);

  // If this layers formatter hasn't been loaded yet,
  // download and load it now.
  if (this.grid_tile.keys[key]) {
    return this.formatter.format(
      options,
      this.grid_tile.data[this.grid_tile.keys[key]]
    );
  }
};

// GridManager
// -----------
// Generally one GridManager will be used per map.
wax.GridManager = function() {
    this.grid_tiles = {};
    this.key_maps = {};
    this.formatters = {};
    this.locks = {};
};

// Get a grid - calls `callback` with either a `GridInstance`
// object or false. Behind the scenes, this calls `getFormatter`
// and gets grid data, and tries to avoid re-downloading either.
wax.GridManager.prototype.getGrid = function(url, callback) {
    var that = this;
    that.getFormatter(that.formatterUrl(url), function(f) {
        if (!f) return callback(false);

        wax.request.get(that.tileDataUrl(url), function(t) {
            callback(new wax.GridInstance(t, f));
        });
    });
};

// Create a cross-browser event object
wax.GridManager.prototype.makeEvent = function(evt) {
  return {
    target: evt.target || evt.srcElement,
    pX: evt.pageX || evt.clientX,
    pY: evt.pageY || evt.clientY,
    evt: evt
  };
};

// Simplistically derive the URL of the grid data endpoint from a tile URL
wax.GridManager.prototype.tileDataUrl = function(url) {
  return url.replace(/(\.png|\.jpg|\.jpeg)(\d*)/, '.grid.json');
};

// Simplistically derive the URL of the formatter function from a tile URL
wax.GridManager.prototype.formatterUrl = function(url) {
  return url.replace(/\d+\/\d+\/\d+\.\w+/, 'layer.json');
};

// Request and save a formatter, passed to `callback()` when finished.
wax.GridManager.prototype.getFormatter = function(url, callback) {
  var that = this;
  // Formatter is cached.
  if (typeof this.formatters[url] !== 'undefined') {
    callback(this.formatters[url]);
    return;
  } else {
    wax.request.get(url, function(data) {
        if (data && data.formatter) {
            that.formatters[url] = new wax.Formatter(data);
        } else {
            that.formatters[url] = false;
        }
        callback(that.formatters[url]);
    });
  }
};

// Formatter
// ---------
wax.Formatter = function(obj) {
    // Prevent against just any input being used.
    if (obj.formatter && typeof obj.formatter === 'string') {
        try {
            // Ugly, dangerous use of eval.
            eval('this.f = ' + obj.formatter);
        } catch (e) {
            // Syntax errors in formatter
            console && console.log(e);
        }
    } else {
        this.f = function() {};
    }
};

// Wrap the given formatter function in order to
// catch exceptions that it may throw.
wax.Formatter.prototype.format = function(options, data) {
    try {
        return this.f(options, data);
    } catch (e) {
        console && console.log(e);
    }
};
// Wax Legend
// ----------

// Wax header
var wax = wax || {};

wax.Legend = function(context, container) {
    this.context = context;
    this.container = container || $('<div class="wax-legends"></div>');
    this.legends = {};
    $(this.context).append(this.container);
};

wax.Legend.prototype.render = function(urls) {
    $('.wax-legend', this.container).hide();

    var render = $.proxy(function(url, content) {
        if (!content) {
            this.legends[url] = false;
        } else if (this.legends[url]) {
            this.legends[url].show();
        } else {
            this.legends[url] = $("<div class='wax-legend'></div>").append(content);
            this.container.append(this.legends[url]);
        }
    }, this);
    for (var i = 0; i < urls.length; i++) {
        var url = this.legendUrl(urls[i]);
        wax.request.get(url, function(data) {
            (data && data.legend) && (render(url, data.legend));
        });
    }
};

wax.Legend.prototype.legendUrl = function(url) {
    return url.replace(/\d+\/\d+\/\d+\.\w+/, 'layer.json');
};

// Wax GridUtil
// ------------

// Wax header
var wax = wax || {};
wax.tooltip = {};

// Get the active tooltip for a layer or create a new one if no tooltip exists.
// Hide any tooltips on layers underneath this one.
wax.tooltip.getToolTip = function(feature, context, index, evt) {
    var tooltip = $(context).children('div.wax-tooltip-' +
        index +
        ':not(.removed)');
    if (tooltip.size() === 0) {
        tooltip = $("<div class='wax-tooltip wax-tooltip-" +
            index +
            "'>" +
            '</div>').html(feature);
        if (!$(context).triggerHandler('addedtooltip', [tooltip, context, evt])) {
            $(context).append(tooltip);
        }
    }
    for (var i = (index - 1); i > 0; i--) {
        var fallback = $('div.wax-tooltip-' + i + ':not(.removed)');
        if (fallback.size() > 0) {
            fallback.addClass('hidden').hide();
        }
    }
    return tooltip;
};

// Expand a tooltip to be a "popup". Suspends all other tooltips from being
// shown until this popup is closed or another popup is opened.
wax.tooltip.click = function(feature, context, index) {
    var tooltip = wax.tooltip.getToolTip(feature, context, index);
    var close = $('<a href="#close" class="close">Close</a>');
    close.click(function() {
        tooltip
            .addClass('removed')
            .fadeOut('fast', function() { $(this).remove(); });
        return false;
    });
    tooltip
        .addClass('wax-popup')
        .html(feature)
        .append(close);
};

// Show a tooltip.
wax.tooltip.select = function(feature, context, layer_id, evt) {
    if (!feature) return;

    wax.tooltip.getToolTip(feature, context, layer_id, evt);
    $(context).css('cursor', 'pointer');
    $('div', context).css('cursor', 'pointer');
};

// Hide all tooltips on this layer and show the first hidden tooltip on the
// highest layer underneath if found.
wax.tooltip.unselect = function(feature, context, layer_id, evt) {
    $(context)
        .css('cursor', 'default');
    if (layer_id) {
        $('div.wax-tooltip-' + layer_id + ':not(.wax-popup)')
            .remove();
    } else {
        $('div.wax-tooltip:not(.wax-popup)')
            .remove();
    }

    // TODO: remove
    $('div', context).css('cursor', 'default');

    $('div.wax-tooltip:first')
        .removeClass('hidden')
        .show();

    $(context).triggerHandler('removedtooltip', [feature, context, evt])
};
// Wax for Google Maps API v3
// --------------------------

// Wax header
var wax = wax || {};
wax.g = wax.g || {};

// Controls constructor.
wax.g.Controls = function(map) {
    this.map = map;

    // Find the map div reference. Munging of the google maps codebase makes
    // the key to this reference unpredictable, hence we iterate to find.
    this.mapDiv = false;
    for (var key in map) {
        // IE safe check for whether object is a DOM element.
        if (map[key] && map[key].nodeType > 0) {
            this.mapDiv = map[key];
            break;
        }
    }
};

// Since Google Maps obscures mouseover events, grids need to calculated
// in order to simulate them, and eventually do multi-layer interaction.
wax.g.Controls.prototype.calculateGrid = function() {
    if (this.map.interaction_grid) return;
    // Get all 'marked' tiles, added by the `wax.g.MapType` layer.
    var interactive_tiles = $('div.interactive-div-' + this.map.getZoom() + ' img', this.mapDiv);
    var start_offset = $(this.mapDiv).offset();
    // Return an array of objects which have the **relative** offset of
    // each tile, with a reference to the tile object in `tile`, since the API
    // returns evt coordinates as relative to the map object.
    var tiles = $(interactive_tiles).map(function(t) {
        var e_offset = $(interactive_tiles[t]).offset();
        return {
            xy: {
                left: e_offset.left - start_offset.left,
                top: e_offset.top - start_offset.top
            },
            tile: interactive_tiles[t]
        };
    });
    return tiles;
};

wax.g.Controls.prototype.interaction = function(options) {
    options = options || {};
    var that = this;
    var gm = new wax.GridManager();
    var f = null;

    // This requires wax.Tooltip or similar
    var callbacks = options.callbacks || {
        out: wax.tooltip.unselect,
        over: wax.tooltip.select,
        click: wax.tooltip.click
    };

    var inTile = function(sevt, xy) {
        if ((xy.top < sevt.y) &&
            ((xy.top + 256) > sevt.y) &&
            (xy.left < sevt.x) &&
            ((xy.left + 256) > sevt.x)) {
            return true;
        }
    };

    var find = $.proxy(function(map, evt) {
        var found = false;
        var interaction_grid = this.calculateGrid();
        for (var i = 0; i < interaction_grid.length && !found; i++) {
            if (inTile(evt.pixel, interaction_grid[i].xy)) {
                var found = interaction_grid[i];
            }
        }
        return found;
    }, this);

    google.maps.event.addListener(this.map, 'mousemove', function(evt) {
        var options = { format: 'teaser' };
        var found = find(this.map, evt);
        if (!found) return;
        gm.getGrid($(found.tile).attr('src'), function(g) {
            if (!g) return;
            var feature = g.getFeature(
                evt.pixel.x + $(that.mapDiv).offset().left,
                evt.pixel.y + $(that.mapDiv).offset().top,
                found.tile,
                options
            );
            if (feature !== f) {
                callbacks.out(feature, $(that.mapDiv), 0);
                callbacks.over(feature, $(that.mapDiv), 0);
                f = feature;
            }
        });
    });

    google.maps.event.addListener(this.map, 'click', function(evt) {
        var options = { format: 'full' };
        var found = find(this.map, evt);
        if (!found) return;
        gm.getGrid($(found.tile).attr('src'), function(g) {
            if (!g) return;
            var feature = g.getFeature(
                evt.pixel.x + $(that.mapDiv).offset().left,
                evt.pixel.y + $(that.mapDiv).offset().top,
                found.tile,
                options
            );
            feature && callbacks.click(feature, $(that.mapDiv), 0);
        });
    });

    // Ensure chainability
    return this;
};

wax.g.Controls.prototype.legend = function() {
    var legend = new wax.Legend($(this.mapDiv)),
        url = null;

    // Ideally we would use the 'tilesloaded' event here. This doesn't seem to
    // work so we use the much less appropriate 'idle' event.
    google.maps.event.addListener(this.map, 'idle', $.proxy(function() {
        if (url) return;
        var img = $('div.interactive-div-' + this.map.getZoom() + ' img:first',
            this.mapDiv);
        img && (url = img.attr('src')) && legend.render([url]);
    }, this));

    // Ensure chainability
    return this;
};

wax.g.Controls.prototype.embedder = function(script_id) {
    $(this.mapDiv).prepend($('<input type="text" class="embed-src" />')
    .css({
        'z-index': '9999999999',
        'position': 'relative'
    })
    .val("<div id='" + script_id + "'>" + $('#' + script_id).html() + '</div>'));
    
    // Ensure chainability
    return this;
};
// Wax for Google Maps API v3
// --------------------------

// Wax header
var wax = wax || {};
wax.g = wax.g || {};

// Wax Google Maps MapType: takes an object of options in the form
//
//     {
//       name: '',
//       filetype: '.png',
//       layerName: 'world-light',
//       alt: '',
//       zoomRange: [0, 18],
//       baseUrl: 'a url',
//     }
wax.g.MapType = function(options) {
    options = options || {};
    this.name = options.name || '';
    this.alt = options.alt || '';
    this.filetype = options.filetype || '.png';
    this.layerName = options.layerName || 'world-light';
    if (options.zoomRange) {
        this.minZoom = options.zoomRange[0];
        this.maxZoom = options.zoomRange[1];
    } else {
        this.minZoom = 0;
        this.maxZoom = 18;
    }
    this.baseUrl = options.baseUrl ||
        'http://a.tile.mapbox.com/';
    this.blankImage = options.blankImage || '';

    // non-configurable options
    this.interactive = true;
    this.tileSize = new google.maps.Size(256, 256);

    // DOM element cache
    this.cache = {};
};

// Get a tile element from a coordinate, zoom level, and an ownerDocument.
wax.g.MapType.prototype.getTile = function(coord, zoom, ownerDocument) {
    var key = zoom + '/' + coord.x + '/' + coord.y;
    this.cache[key] = this.cache[key] || $('<div></div>')
        .addClass('interactive-div-' + zoom)
        .width(256).height(256)
        .data('gTileKey', key)
        .append(
            $('<img />')
            .width(256).height(256)
            .attr('src', this.getTileUrl(coord, zoom))
            .error(function() { $(this).hide() })
        )[0];
    return this.cache[key];
};

// Remove a tile that has fallen out of the map's viewport.
//
// TODO: expire cache data in the gridmanager.
wax.g.MapType.prototype.releaseTile = function(tile) {
    var key = $(tile).data('gTileKey');
    this.cache[key] && delete this.cache[key];
    $(tile).remove();
};

// Get a tile url, based on x, y coordinates and a z value.
wax.g.MapType.prototype.getTileUrl = function(coord, z) {
    // Y coordinate is flipped in Mapbox, compared to Google
    var mod = Math.pow(2, z),
        y = (mod - 1) - coord.y,
        x = (coord.x % mod);
        x = (x < 0) ? (coord.x % mod) + mod : x;

    return (y >= 0)
        ? (this.baseUrl + '1.0.0/' + this.layerName + '/' + z + '/' +
           x + '/' + y + this.filetype)
        : this.blankImage;
};
