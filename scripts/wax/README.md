# Wax

Tools for improving web maps. The centerpiece of the code is a client 
implementation of the [MBTiles interaction specification](https://github.com/mapbox/mbtiles-spec).

## Controls

* `wax.tooltip`
* `wax.legend`

#### OpenLayers

* `wax.ol.Interaction`
* `wax.ol.Legend`
* `wax.ol.Embedder`
* `wax.ol.Switcher`

#### Google Maps API v3

* `wax.g.Controls`
* `wax.g.MapType`
* `wax.g.mapBoxLogo`

#### Modest Maps

* `.interaction()`
* `.zoomer()`
* `.legend()`
* `.fullscreen()`

#### Lib

* `jquery.jsonp-2.1.4.js`, [from jquery-jsonp](http://code.google.com/p/jquery-jsonp/)

#### Records

The main usage of mapping frameworks through Wax is via records. Records are pure JSON objects that have a 1:1 representation with function Javascript code, but, unlike imperative code, can be stored and manipulated as configuration. Records are tested with [polymaps](http://polymaps.org), [openlayers](http://openlayers.org/), [Modest Maps](https://github.com/stamen/modestmaps-js) and Google Maps API v3, but the system (`/lib/record.js`) is generalized beyond mapping tools of any sort, to exist as a basic Javascript AST interpreter.

Currently records support several control techniques:

* `@new` instantiates objects
* `@chain` runs functions, changing the value of `this` with each run
* `@inject` runs a function in a `@chain` without changing the reference to `this`
* `@call` runs a function from the global scope changing the value of `this`
* `@literal` allows an object attribute to be referenced
* `@group` runs a set of record statements (e.g. using the keywords above) in order

These techniques (with arbitrary levels of nesting), are sufficient to construct maps in each mapping framework.

## Requirements

* [jQuery](http://jquery.com/) - tested with 1.5
* (docs only) [docco](https://github.com/jashkenas/docco)
* (build only) [UglifyJS](https://github.com/mishoo/UglifyJS/)

## Usage Examples

Samples of usage can be found in examples/. These depend on localizing copies of each API code.

To set up the examples first run:

    make ext

Then check out the example html files.


## Building library

For wax users, a minified library is already provided in build/.

But for developers you can rebuild a minified library by running:

    make build

* Requires [UglifyJS](https://github.com/mishoo/UglifyJS/)

Install mainline UglifyJS:

    npm install https://github.com/mishoo/UglifyJS/tarball/master

Make the combined & minified OpenLayers & Google Maps libraries:

    rm -r build
    make build

## Building docs

Wax uses docco for documention. Install it like:

    npm install docco
    
Make the docs:

    make doc

## Includes

Wax includes two libraries in `/lib` which are included in builds

* [underscore.js](http://documentcloud.github.com/underscore/) (MIT)
* [jquery-jsonp](http://code.google.com/p/jquery-jsonp/) (MIT)

## Changelog

#### 1.2.1

* Bug fixes for OpenLayers

#### 1.2.0

* Functions on the Google Maps `Controls` object are now lowercase.
* Changed `WaxProvider`'s signature: now takes an object of settings and supports multiple domains, filetypes and zoom restrictions.
* Changed `wax.g.MapType`'s signature: now accepts an object of settings in the same form as `WaxProvider`
* Modest Maps `.interaction()` now supports clicks, with the same `clickAction` setting as the OpenLayers version.
* Added large manual for usage.
* Fixed Modest Maps `.fullscreen()` sizing.
* Removed `/examples` directory: examples will be in manuals.
* Performance optimization of interaction code: no calculations are performed during drag events.

#### 1.1.0

* connector/mm: Added [Modest Maps](https://github.com/stamen/modestmaps-js) connector.
* control/mm: Added `.legend()`, `.interaction()`, `.fullscreen()`, and `.zoomer()` controls for Modest Maps.
* control/lib: Added `addedTooltip` event to `tooltip.js` to allow for external styling code.

#### 1.0.4

* connector/g: Hide error tiles and wrap on dateline.
* connector/g: Performance improvements.
* control/legend: Fix rerender bug.
* control/tooltip: `addedtooltip` event for binding/extending tooltip behavior. Subject to change.

#### 1.0.3

* Embedder functionality for Google Maps and OpenLayers.

#### 1.0.2

* Bug fixes for Firefox 3.

#### 1.0.1

* `make ext` added for downloading and installing external libraries needed to use examples.
* Bug fixes for legend, IE compatibility.

#### 1.0.0

* Initial release.

## Authors

- Tom MacWright (tmcw)
- Young Hahn (yhahn)
- Will White (willwhite)
