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
