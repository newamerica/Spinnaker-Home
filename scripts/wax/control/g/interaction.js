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
