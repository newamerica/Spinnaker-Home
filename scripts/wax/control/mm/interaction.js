// namespacing!
if (!com) {
    var com = { };
    if (!com.modestmaps) {
        com.modestmaps = { };
    }
}

// A chaining-style control that adds
// interaction to a modestmaps.Map object.
//
// Takes an options object with the following keys:
//
// * `callbacks` (optional): an `out`, `over`, and `click` callback.
//   If not given, the `wax.tooltip` library will be expected.
// * `clickAction` (optional): **full** or **location**: default is
//   **full**.
com.modestmaps.Map.prototype.interaction = function(options) {
    options = options || {};
    // Our GridManager (from `gridutil.js`). This will keep the
    // cache of grid information and provide friendly utility methods
    // that return `GridTile` objects instead of raw data.
    this.waxGM = new wax.GridManager();

    // This requires wax.Tooltip or similar
    this.callbacks = options.callbacks || {
        out: wax.tooltip.unselect,
        over: wax.tooltip.select,
        click: wax.tooltip.click
    };

    this.clickAction = options.clickAction || 'full';

    // Search through `.tiles` and determine the position,
    // from the top-left of the **document**, and cache that data
    // so that `mousemove` events don't always recalculate.
    this.waxGetTileGrid = function() {
        // TODO: don't build for tiles outside of viewport
        var zoom = this.getZoom();
        // Calculate a tile grid and cache it, by using the `.tiles`
        // element on this map.
        return this._waxGetTileGrid || (this._waxGetTileGrid =
            (function(t) {
                var o = [];
                $.each(t, function(key, img) {
                    if (key.split(',')[0] == zoom) {
                        var $img = $(img);
                        var offset = $img.offset();
                        o.push([offset.top, offset.left, $img]);
                    }
                });
                return o;
            })(this.tiles));
    };

    this.waxClearTimeout = function() {
        if (this.clickTimeout) {
            window.clearTimeout(this.clickTimeout);
            this.clickTimeout = null;
            return true;
        } else {
            return false;
        }
    };

    // Click handler
    // -------------
    //
    // The extra logic here is all to avoid the inconsistencies
    // of browsers in handling double and single clicks on the same
    // element. After dealing with particulars, delegates to waxHandleClick
    $(this.parent).mousedown($.proxy(function(evt) {
        // Ignore double-clicks by ignoring clicks within 300ms of
        // each other.
        if (this.waxClearTimeout()) {
            return;
        }
        // Store this event so that we can compare it to the
        // up event
        var tol = 4; // tolerance
        this.downEvent = evt;
        $(this.parent).one('mouseup', $.proxy(function(evt) {
            // Don't register clicks that are likely the boundaries
            // of dragging the map
            if (Math.round(evt.pageY / tol) === Math.round(this.downEvent.pageY / tol) &&
                Math.round(evt.pageX / tol) === Math.round(this.downEvent.pageX / tol)) {
                this.clickTimeout = window.setTimeout(
                    $.proxy(function() {
                        this.waxHandleClick(evt);
                    }, this),
                    300
                );
            }
        }, this));
    }, this));

    this.waxHandleClick = function(evt) {
        var $tile = this.waxGetTile(evt);
        if ($tile) {
            this.waxGM.getGrid($tile.attr('src'), $.proxy(function(g) {
                if (g) {
                    var feature = g.getFeature(evt.pageX, evt.pageY, $tile, {
                        format: this.clickAction
                    });
                    if (feature) {
                        switch (this.clickAction) {
                            case 'full':
                                this.callbacks.click(feature, this.parent, 0, evt);
                                break;
                            case 'location':
                                window.location = feature;
                                break;
                        }
                    }
                }
            }, this));
        }
    };

    this.waxGetTile = function(evt) {
        var $tile;
        var grid = this.waxGetTileGrid();
        for (var i = 0; i < grid.length; i++) {
            if ((grid[i][0] < evt.pageY) &&
               ((grid[i][0] + 256) > evt.pageY) &&
                (grid[i][1] < evt.pageX) &&
               ((grid[i][1] + 256) > evt.pageX)) {
                $tile = grid[i][2];
                break;
            }
        }
        return $tile || false;
    };

    // On `mousemove` events that **don't** have the mouse button
    // down - so that the map isn't being dragged.
    $(this.parent).nondrag($.proxy(function(evt) {
        var $tile = this.waxGetTile(evt);
        if ($tile) {
            this.waxGM.getGrid($tile.attr('src'), $.proxy(function(g) {
                if (g) {
                    var feature = g.getFeature(evt.pageX, evt.pageY, $tile, {
                        format: 'teaser'
                    });
                    // This and other Modest Maps controls only support a single layer.
                    // Thus a layer index of **0** is given to the tooltip library
                    if (feature) {
                        if (feature && this.feature !== feature) {
                            this.feature = feature;
                            this.callbacks.out(feature, this.parent, 0, evt);
                            this.callbacks.over(feature, this.parent, 0, evt);
                        } else if (!feature) {
                            this.feature = null;
                            this.callbacks.out(feature, this.parent, 0, evt);
                        }
                    } else {
                        this.feature = null;
                        this.callbacks.out({}, this.parent, 0, evt);
                    }
                }
            }, this));
        }

    }, this));

    // When the map is moved, the calculated tile grid is no longer
    // accurate, so it must be reset.
    var modifying_events = ['zoomed', 'panned', 'centered',
        'extentset', 'resized', 'drawn'];

    var clearMap = function(map, e) {
        map._waxGetTileGrid = null;
    };

    for (var i = 0; i < modifying_events.length; i++) {
        this.addCallback(modifying_events[i], clearMap);
    }

    // Ensure chainability
    return this;
};
