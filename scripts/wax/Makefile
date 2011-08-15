doc:
	docco control/*/*.js

ext:
	-test ! -d ext && mkdir ext
	wget http://code.jquery.com/jquery-1.5.1.min.js -O ext/jquery-1.5.min.js
	wget --no-check-certificate https://github.com/simplegeo/polymaps/raw/master/polymaps.js -O ext/polymaps.js
	wget --no-check-certificate https://github.com/developmentseed/openlayers_slim/raw/v1.9/OpenLayers.js -O ext/OpenLayers.js
	wget --no-check-certificate https://github.com/stamen/modestmaps-js/raw/c202b0a274f4235c4ebd8362fff11d88a2c0fc8f/modestmaps.min.js -O ext/modestmaps.js

build/wax.ol.min.js:
	cat lib/*.js control/lib/*.js control/ol/*.js > build/wax.ol.js
	uglifyjs build/wax.ol.js > build/wax.ol.min.js

build/wax.g.min.js:
	cat lib/*.js control/lib/*.js control/g/*.js connectors/g/*.js > build/wax.g.js
	uglifyjs build/wax.g.js > build/wax.g.min.js

build/wax.mm.min.js:
	cat lib/*.js control/lib/*.js control/mm/*.js connectors/mm/*.js > build/wax.mm.js
	uglifyjs build/wax.mm.js > build/wax.mm.min.js

build_setup:
	mkdir build

build: build_setup build/wax.ol.min.js build/wax.g.min.js build/wax.mm.min.js

clean:
	rm -rf build

.PHONY: ext doc clean
