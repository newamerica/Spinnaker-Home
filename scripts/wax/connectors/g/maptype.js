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
