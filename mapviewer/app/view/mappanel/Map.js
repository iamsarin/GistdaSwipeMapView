/**
 * Created by Sarin on 1/10/2015.
 */
Ext.define('mapviewer.view.mappanel.Map', {
    singleton: true,
    requires: [
        'mapviewer.view.mappanel.ol'
    ],

    map: null,
    measureLayer: null,
    measureInteraction: null,
    ol3d: null,
    sketch: null,
    helpTooltipElement: null,
    helpTooltip: null,
    measureTooltipElement: undefined,
    measureTooltip: null,
    draw: null,
    uss: null,
    wmsLayers: [],
    tmsLayers: [],
    capabilities: {},
    featureInfoLayer: null,
    featureInfoElement: null,
    featureInfo: null,
    hasWebGL: null,
    overviewMapControl: null,

    getMap: function () {
        return this.map;
    },

    setMap: function () {
        ol.inherits(mapviewer.view.mappanel.ol.FullScreenControl, ol.control.Control);
        var projection;
        if (map_config.map.projection) {
            projection = map_config.map.projection;
            if (projection === 'EPSG:102100' ||
                projection === 'EPSG:102113' ||
                projection === 'EPSG:3857' ||
                projection === 'urn:ogc:def:crs:EPSG:6.18:3:3857' ||
                projection === 'EPSG:900913') {
                projection = 'EPSG:3857'
            } else if (
                projection === 'CRS:84' ||
                projection === 'urn:ogc:def:crs:EPSG:6.6:4326' ||
                projection === 'EPSG:4326' ||
                projection === 'urn:ogc:def:crs:OGC:2:84' ||
                projection === 'urn:ogc:def:crs:OGC:1.3:CRS84') {
                projection = 'EPSG:4326'
            } else {
                projection = 'EPSG:3857';
            }
        } else {
            projection = 'EPSG:3857';
        }
        var olMap = new ol.Map({
            controls: ol.control.defaults().extend([
                new ol.control.ScaleLine(),
                new mapviewer.view.mappanel.ol.FullScreenControl()
            ]),
            layers: [],
            view: new ol.View({
                center: [0, 0],
                zoom: 2,
                maxZoom: 19,
                minZoom: 2,
                projection: projection
            })
        });

        olMap.on('pointermove', function (evt) {
            if (mapviewer.view.mappanel.Map.helpTooltipElement === null) {
                return;
            }
            if (evt.dragging) {
                return;
            }

            var continuePolygonMsg = 'Click to continue drawing the polygon';
            var continueLineMsg = 'Click to continue drawing the line';
            var continueCircleMsg = 'Click to continue drawing the circle';
            /** @type {string} */
            var helpMsg = 'Click to start drawing';
            if (mapviewer.view.mappanel.Map.sketch) {
                var geom = (mapviewer.view.mappanel.Map.sketch.getGeometry());
                if (geom instanceof ol.geom.Polygon) {
                    helpMsg = continuePolygonMsg;
                } else if (geom instanceof ol.geom.LineString) {
                    helpMsg = continueLineMsg;
                } else if (geom instanceof ol.geom.Circle) {
                    helpMsg = continueCircleMsg;
                }
            }

            mapviewer.view.mappanel.Map.helpTooltipElement.innerHTML = helpMsg;
            mapviewer.view.mappanel.Map.helpTooltip.setPosition(evt.coordinate);

            $(mapviewer.view.mappanel.Map.helpTooltipElement).removeClass('hidden');
        });

        $(olMap.getViewport()).on('mouseout', function () {
            $(mapviewer.view.mappanel.Map.helpTooltipElement).addClass('hidden');
        });

        olMap.on('change:target', function () {
            if (!mapviewer.view.mappanel.Map.overviewMapControl) {
                mapviewer.view.mappanel.Map.overviewMapControl = new ol.control.OverviewMap();
                olMap.addControl(mapviewer.view.mappanel.Map.overviewMapControl);
            }
        });

        if (this.webglAvailable()) {
            this.ol3d = new olcs.OLCesium({map: olMap});
        }
        this.map = olMap;
        // When wait for this.getCapabilities(); finish
        // call this.setLayers(); this.setMeasure(); by order
        this.getCapabilities();
        this.setMousePositionControl();
        this.set3DMapControl();
        this.setMeasureControl();
        this.setZoomToWorldControl();
        this.setPrintMapControl();
        return this.map;
    },

    webglAvailable: function () {
        if (this.hasWebGL !== null) {
            return this.hasWebGL;
        }
        try {
            var canvas = document.createElement("canvas");
            return !!
                    window.WebGLRenderingContext &&
                (canvas.getContext("webgl") ||
                canvas.getContext("experimental-webgl"));
        } catch (e) {
            return false;
        }
    },

    getCapabilities: function () {
        var result, requestParams, url;
        var Map = this;
        var capabilities = this.capabilities;
        var wmsSourceHasLayerObj1 = {}, wmsSourceHasLayerObj2 = {};

        if (map_config.map.layers && $.isArray(map_config.map.layers)) {
            var layerConfig;
            for (var i = 0; i < map_config.map.layers.length; i++) {
                layerConfig = map_config.sources[map_config.map.layers[i].source];
                if (layerConfig.ptype === 'gxp_wmscsource') {
                    if (layerConfig.url in wmsSourceHasLayerObj1) {
                        map_config.map.layers[i].source
                            = wmsSourceHasLayerObj1[layerConfig.url];
                    } else {
                        wmsSourceHasLayerObj2[map_config.map.layers[i].source]
                            = layerConfig.url;
                        wmsSourceHasLayerObj1[layerConfig.url]
                            = map_config.map.layers[i].source;
                    }
                }
            }
        }
        var wmsSourceHasLayers = Object.keys(wmsSourceHasLayerObj2);
        console.log('*-*-*-*-*-*-', wmsSourceHasLayers);

        var isFinish = function (wmsNumberRequests) {
            console.log('---++-+++numberRequests', wmsNumberRequests);
            if (wmsNumberRequests >= wmsSourceHasLayers.length) {
                Map.capabilities = capabilities;
                console.log('----------------WMS.capabilities', Map.capabilities);
                Map.setLayers();
                Map.setMeasure();
            }
        };

        // load WMS Capabilities
        var sourceConfig;
        var wmsNumberRequests = 0;
        var parser = new ol.format.WMSCapabilities();
        var saveCap = function (sourceId) {
            return function (cap) {
                wmsNumberRequests++;
                result = parser.read(cap);
                capabilities[sourceId] = result;
                isFinish(wmsNumberRequests);
            };
        };
        var loadCapFail = function (sourceId, url) {
            return function () {
                console.log('***Fail load Cap', sourceId, url);
                wmsNumberRequests++;
                isFinish(wmsNumberRequests);
            };
        };
        if (wmsSourceHasLayers.length === 0) {
            console.log('----------------No WMS Layer');
            Map.setLayers();
            Map.setMeasure();
        } else {
            for (var j = 0; j < wmsSourceHasLayers.length; j++) {
                sourceConfig = map_config.sources[wmsSourceHasLayers[j]];
                if (sourceConfig.ptype === 'gxp_wmscsource') {
                    requestParams = '?service=wms&request=getCapabilities&version=1.3.0';
                    url = sourceConfig.url + requestParams;
                    url = '/proxy/?url=' + encodeURIComponent(url);

                    var request = $.ajax({
                        method: 'get',
                        url: url
                    }).then(saveCap(wmsSourceHasLayers[j]),
                        loadCapFail(wmsSourceHasLayers[j], url));
                }
            }
        }
    },

    setLayers: function () {
        var sourceObj, sourceIndex, ptype, LayerName, layer, nameSplit, layerInfo;
        var map = this.map;
        var wmsLayers = this.wmsLayers;
        var tmsLayers = this.tmsLayers;
        var Map = this;

        for (var i = 0; i < map_config.map.layers.length; i++) {
            layer = null;
            var val = map_config.map.layers[i];
            sourceIndex = val.source;
            sourceObj = map_config.sources[sourceIndex];
            ptype = sourceObj.ptype;
            LayerName = val.name;

            if (ptype === 'gxp_osmsource') {
                layer = new ol.layer.Tile({
                    name: val.title ? val.title : val.name,
                    ptype: ptype,
                    sourceIndex: val.source,
                    visible: val.visibility,
                    source: new ol.source.OSM()
                });
            } else if (ptype === 'gxp_bingsource') {
                var sourceParams = {
                    key: 'Ak-dzM4wZjSqTlzveKz5u0d4IQ4bRzVI309GxmkgSVr1ewS6iPSrOvOKhA-CJlm3',
                    imagerySet: val.name
                };
                layer = new ol.layer.Tile({
                    name: val.title ? val.title : 'Bing' + val.name,
                    ptype: ptype,
                    sourceIndex: val.source,
                    visible: val.visibility,
                    source: new ol.source.BingMaps(sourceParams)
                });
            } else if (ptype === 'gxp_mapboxsource') {
                var parms = {
                    url: 'http://api.tiles.mapbox.com/v3/mapbox.' + val.name + '.jsonp',
                    crossOrigin: true
                };
                var mbsource = new ol.source.TileJSON(parms);
                if (mbsource) {
                    layer = new ol.layer.Tile({
                        name: val.title ? val.title : 'Mapbox_' + val.name,
                        ptype: ptype,
                        sourceIndex: val.source,
                        visible: val.visibility,
                        source: mbsource
                    });
                }
            } else if (ptype === 'gxp_mapquestsource') {
                if (val.name) {
                    var source = new ol.source.MapQuest({layer: val.name});
                    var mapquestName = 'MapQuest';
                    if (val.name.toLowerCase() === 'sat') {
                        mapquestName += 'Sat';
                    } else if (val.name.toLowerCase() === 'osm') {
                        mapquestName += 'OSM';
                    } else if (val.name.toLowerCase() === 'hyb') {
                        mapquestName += 'Hybrid';
                    }
                }
                if (source) {
                    layer = new ol.layer.Tile({
                        name: val.title ? val.title : mapquestName,
                        ptype: ptype,
                        sourceIndex: val.source,
                        visible: val.visibility,
                        source: source
                    });
                }
            } else if (ptype === 'gxp_wmscsource') {
                console.log('*****--------', Map.capabilities);
                nameSplit = val.name.split(':');
                if (sourceIndex in Map.capabilities) {
                    if (val.visibility) {
                        layerInfo = Map.capabilities[sourceIndex].Capability.Layer.Layer;
                        val.visibility = false;
                        for (var j = 0; j < layerInfo.length; j++) {
                            if (layerInfo[j].Name === val.name) {
                                val.visibility = true;
                                break;
                            } else if (val.name.search(':') >= 0) {
                                if (nameSplit[1] === layerInfo[j].Name) {
                                    val.visibility = true;
                                    break;
                                }
                            }
                        }
                    }
                } else {
                    val.visibility = false;
                }

                // favor virtual service url when available
                var mostSpecificUrlWms = sourceObj.url;
                if (sourceObj.isVirtualService && (sourceObj.isVirtualService === true)) {
                    mostSpecificUrlWms = sourceObj.virtualServiceUrl;
                }

                var wmsSource = new ol.source.TileWMS({
                    url: mostSpecificUrlWms,
                    params: {
                        'LAYERS': val.name,
                        'tiled': 'true'
                    }
                });
                console.log('wmsSource', wmsSource);
                layer = new ol.layer.Tile({
                    name: val.title ? val.title : nameSplit[1],
                    fullname: val.name,
                    ptype: ptype,
                    sourceIndex: val.source,
                    visible: val.visibility,
                    source: wmsSource
                });
                wmsLayers.push(layer);
            } else if (ptype === 'gxp_tmssource') {
                nameSplit = val.name.split(':');
                var url = sourceObj.url;

                if (sourceObj.url) {
                    if (sourceObj.url.lastIndexOf('/') !== sourceObj.url.length - 1) {
                        url += '/';
                    }
                }
                var encodeUrl = encodeURIComponent(url);
                var encodeName = encodeURIComponent(val.name);
                layer = new ol.layer.Tile({
                    name: val.title ? val.title : nameSplit[1],
                    fullname: val.name,
                    ptype: ptype,
                    sourceIndex: val.source,
                    bbox: null,
                    visible: val.visibility,
                    source: new ol.source.XYZ({
                        url: '/proxy/?url=' + encodeUrl + encodeName + '%40' + 'EPSG%3A900913' + '@png' + '%2F{z}%2F{x}%2F{-y}.png'
                    })
                });
                tmsLayers.push(layer);

                var tmsLoad = function (isSuccess, layer) {
                    return function (cap) {
                        if (isSuccess) {
                            var extent;
                            $(cap).find('BoundingBox').each(function () {
                                var $this = $(this);
                                extent = [parseFloat($this.attr('minx')), parseFloat($this.attr('miny')),
                                    parseFloat($this.attr('maxx')), parseFloat($this.attr('maxy'))];
                                if (!extent) {
                                    extent = view.getProjection().getExtent();
                                }
                                layer.bbox = extent;
                            });
                        } else {
                            if (layer.getVisible()) {
                                layer.setVisible(false);
                            }
                            layer.bbox = null;
                        }
                    };
                };
                var tmsCabUrl = layer.getSource().getUrls()[0].replace('%2F{z}%2F{x}%2F{-y}.png', '');
                $.ajax({
                    type: 'GET',
                    url: tmsCabUrl,
                    dataType: 'xml'
                }).then(tmsLoad(true, layer),
                    tmsLoad(false, layer));

            } else {
                console.log('unknown ***ptype = ', ptype);
            }

            if (layer) {
                map.addLayer(layer);
                console.log('==Layer added', layer);
            }
        }

        var view = map.getView();
        if (map_config.map.center && map_config.map.projection &&
            (map_config.map.zoom !== null && typeof map_config.map.zoom !== "undefined")) {
            var center = new ol.proj.transform(
                map_config.map.center,
                map_config.map.projection,
                view.getProjection()
            );
            view.setCenter(center);
            view.setZoom(map_config.map.zoom);
        } else {
            this.zoomToLayer(view.getProjection().getExtent());
        }
        this.addFeatureInfoLayer();
    },

    setMeasure: function () {
        var source = new ol.source.Vector();
        this.measureLayer = new ol.layer.Vector({
            name: 'Measure Layer',
            source: source,
            style: new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(255, 255, 255, 0.2)'
                }),
                stroke: new ol.style.Stroke({
                    color: '#ffcc33',
                    width: 2
                }),
                image: new ol.style.Circle({
                    radius: 7,
                    fill: new ol.style.Fill({
                        color: '#ffcc33'
                    })
                })
            })
        });
        this.map.addLayer(this.measureLayer);
    },

    setMousePositionControl: function () {
        $('body').append('<div title="click to " id="mouse-position"></div>');
        var mousePositionControl = new ol.control.MousePosition({
            coordinateFormat: ol.coordinate.createStringXY(4),
            projection: 'EPSG:4326',
            className: 'custom-mouse-position',
            target: document.getElementById('mouse-position')
        });
        var mousePositionElement = $('#mouse-position');

        mousePositionElement.bind("DOMSubtreeModified", function () {
            var cooordinateElement = mousePositionElement.find('.custom-mouse-position');
            if (cooordinateElement.text() === '') {
                cooordinateElement.addClass('hidden');
            } else {
                cooordinateElement.removeClass('hidden');
            }
        });
        if (!this.is_touch_device()) {
            var cooordinateElement = mousePositionElement.find('.custom-mouse-position');
            cooordinateElement.css('font-size', '10px');
            mousePositionElement.click(function () {
                var oldProj = mousePositionControl.getProjection().getCode();
                var newProj;
                if (oldProj === 'EPSG:4326') {
                    newProj = 'EPSG:3857';
                } else {
                    newProj = 'EPSG:4326';
                }
                mousePositionControl.setProjection(ol.proj.get(newProj));
            });

            mousePositionElement.mouseover(function () {
                var oldProj = mousePositionControl.getProjection().getCode();
                var newProj;
                if (oldProj === 'EPSG:4326') {
                    newProj = 'EPSG:3857'
                } else {
                    newProj = 'EPSG:4326'
                }
                $('#mouse-position').find('div').html('Change to ' + newProj);
            });
        } else {
            mousePositionElement.bind('touchstart', function () {
                var oldProj = mousePositionControl.getProjection().getCode();
                var newProj;
                if (oldProj === 'EPSG:4326') {
                    newProj = 'EPSG:3857';
                } else {
                    newProj = 'EPSG:4326';
                }
                mousePositionControl.setProjection(ol.proj.get(newProj));
            });
        }

        this.map.addControl(mousePositionControl);
    },

    setZoomToWorldControl: function () {
        ol.inherits(mapviewer.view.mappanel.ol.zoomToWorldControl, ol.control.Control);
        var zoomToWorldControl = new mapviewer.view.mappanel.ol.zoomToWorldControl();
        this.map.addControl(zoomToWorldControl);
    },

    setPrintMapControl: function () {
        ol.inherits(mapviewer.view.mappanel.ol.printMap, ol.control.Control);
        var printMapControl = new mapviewer.view.mappanel.ol.printMap();
        this.map.addControl(printMapControl);
    },

    set3DMapControl: function () {
        if (this.webglAvailable()) {
            ol.inherits(mapviewer.view.mappanel.ol.map3dControl, ol.control.Control);
            var map3dControl = new mapviewer.view.mappanel.ol.map3dControl();
            this.map.addControl(map3dControl);
        }
    },

    setMeasureControl: function () {
        ol.inherits(mapviewer.view.mappanel.ol.measureControl, ol.control.Control);
        var measureControl = new mapviewer.view.mappanel.ol.measureControl();
        this.map.addControl(measureControl);
    },

    is_touch_device: function () {
        return !!('ontouchstart' in window);
    },

    addInteraction: function (type) {
        this.draw = new ol.interaction.Draw({
            source: this.measureLayer.getSource(),
            type: /** @type {ol.geom.GeometryType} */ (type),
            style: new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(255, 255, 255, 0.2)'
                }),
                stroke: new ol.style.Stroke({
                    color: 'rgba(0, 0, 0, 0.5)',
                    lineDash: [10, 10],
                    width: 2
                }),
                image: new ol.style.Circle({
                    radius: 5,
                    stroke: new ol.style.Stroke({
                        color: 'rgba(0, 0, 0, 0.7)'
                    }),
                    fill: new ol.style.Fill({
                        color: 'rgba(255, 255, 255, 0.2)'
                    })
                })
            })
        });
        this.map.addInteraction(this.draw);

        var helptool = this.createHelpTooltip(mapviewer.view.mappanel.Map);
        this.helpTooltipElement = helptool.helpTooltipElement;
        this.helpTooltip = helptool.helpTooltip;


        var createMeasureTooltip = this.createMeasureTooltip;
        var measureTooltipElement = this.measureTooltipElement;
        var measureTooltip = this.measureTooltip;
        var map = this.map;
        var measureLayer = this.measureLayer;
        var formatLength = this.formatLength;
        var formatArea = this.formatArea;
        var formatCircle = this.formatCircle;
        var listener;
        var center;
        this.draw.on('drawstart',
            function (evt) {
                measureLayer.getSource().clear();
                var tooltip;
                if (null === measureTooltip) {
                    tooltip = createMeasureTooltip(map, measureTooltipElement, measureTooltip);
                } else {
                    map.removeOverlay(measureTooltip);
                    tooltip = createMeasureTooltip(map, measureTooltipElement, measureTooltip);
                }
                measureTooltipElement = tooltip.measureTooltipElement;
                measureTooltip = tooltip.measureTooltip;
                // set sketch
                mapviewer.view.mappanel.Map.sketch = evt.feature;

                /** @type {ol.Coordinate|undefined} */
                var tooltipCoord = evt.coordinate;

                listener = mapviewer.view.mappanel.Map.sketch.getGeometry().on('change', function (evt) {
                    var geom = evt.target;
                    var output;
                    if (geom instanceof ol.geom.Polygon) {
                        output = formatArea(/** @type {ol.geom.Polygon} */ (geom));
                        tooltipCoord = geom.getInteriorPoint().getCoordinates();
                    } else if (geom instanceof ol.geom.LineString) {
                        output = formatLength(/** @type {ol.geom.LineString} */ (geom));
                        tooltipCoord = geom.getLastCoordinate();
                    } else if (geom instanceof ol.geom.Circle) {
                        output = formatCircle(/** @type {ol.geom.LineString} */ (geom));
                        var x1 = geom.getFirstCoordinate()[0];
                        var y1 = geom.getFirstCoordinate()[1];
                        var x2 = geom.getLastCoordinate()[0];
                        var y2 = geom.getLastCoordinate()[1];
                        center = geom.getFirstCoordinate();

                        tooltipCoord = [(x1 + x2) / 2, (y1 + y2) / 2];
                    }
                    measureTooltipElement.innerHTML = output;
                    measureTooltip.setPosition(tooltipCoord);
                });
            }, this);

        this.draw.on('drawend',
            function () {
                if (center) {
                    measureTooltip.setPosition(center);
                }
                measureTooltipElement.className = 'tooltip tooltip-static';
                measureTooltip.setOffset([0, -7]);
                // unset sketch
                mapviewer.view.mappanel.Map.sketch = null;
                ol.Observable.unByKey(listener);
            }, this);
    },

    addFeatureInfoLayer: function () {
        var map = this.map;
        var wmsLayers = this.wmsLayers;
        var numberVisibleWmsLayers = 0;
        numberVisibleWmsLayers = function () {
            var count = 0;
            for (var n = 0; n < wmsLayers.length; n++) {
                if (wmsLayers[n].getVisible()) {
                    count++;
                }
            }
            return count;
        }();
        if (numberVisibleWmsLayers <= 0) {
            return;
        }

        var view = map.getView();
        var featureInfo = this.featureInfo;
        var requestFeature = [];
        var jbutton = $('#btn_measure');

        // create overlay element and add to map
        var featureInfoElement = document.createElement("div");
        featureInfoElement.setAttribute('id', 'featureInfoElement');
        featureInfoElement.setAttribute('class', 'hidden featureInfoElement');
        featureInfo = new ol.Overlay({
            element: featureInfoElement,
            offset: [15, 0],
            positioning: 'bottom-center',
            autoPan: true,
            autoPanAnimation: {
                source: view.getCenter(),
                duration: 500
            },
            autoPanMargin: 20
        });
        map.addOverlay(featureInfo);

        // create panel and add inside overlay element
        var featureInfoElementExt = new Ext.Panel({
            title: 'Features Info',
            width: 250,
            maxHeight: 230,
            minHeight: 80,
            //height: 230,
            id: 'featureInfoElementExt',
            scrollable: true,
            layout: {
                type: 'accordion'
            },
            defaults: {
                xtype: 'panel',
                collapsible: true,
                split: true,
                animFloat: false,
                autoHide: false,
                useSplitTips: true,
                bodyStyle: 'padding:5px',
                scrollable: true,
                height: 150,
                header: {
                    height: 20,
                    padding: 0
                }
            },
            tools: [{
                id: 'btn_close',
                type: 'close',
                scale: 'small',
                callback: function () {
                    console.log('help click');
                    // show help here
                }
            }]
        });
        featureInfoElementExt.render('featureInfoElement');

        // manage tool on panel because it not work on overlay
        var btn_close = Ext.getCmp('btn_close').getEl().dom;
        var jfeatureInfoElement = $(featureInfoElement);
        $(btn_close).click(function () {
            jfeatureInfoElement.addClass('hidden');
            vectorSource.clear();
        });


        // set new css to panel
        jfeatureInfoElement.find('#featureInfoElementExt_header').css({
            'padding-top': '0',
            'padding-bottom': '0'
        });


        // prepare vector source for featureInfo and add to map
        var styleFunction = function (feature) {
            var type = feature.getGeometry().getType();
            if (type === 'Point' || type === 'MultiPoint') {
                return [new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: 5,
                        fill: null,
                        stroke: new ol.style.Stroke({color: 'blue', width: 3})
                    })
                })];
            } else if (type === 'Polygon' || type === 'MultiPolygon') {
                return [new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: 'blue',
                        width: 3
                    }),
                    fill: new ol.style.Fill({
                        color: 'rgba(0, 0, 255, 0.1)'
                    })
                })];
            } else if (type === 'LineString' || type === 'MultiLineString') {
                return [new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: 'green',
                        width: 3
                    })
                })];
            }
        };
        var vectorSource = new ol.source.Vector();
        var vectorLayer = new ol.layer.Vector({
            name: 'Feature Info Layer',
            source: vectorSource,
            style: styleFunction
        });
        map.addLayer(vectorLayer);

        var setCenter = function (geometry) {
            var center;
            if (geometry.type == 'Point') {
                center = new ol.proj.fromLonLat(geometry.coordinates,
                    view.getProjection());
            } else {
                center = ol.extent.getCenter(vectorSource.getExtent());
            }
            featureInfo.setPosition(center);
            return center;
        };

        map.on('singleclick', function (evt) {
            //check if measure using featureInfo not show
            if (jbutton.attr('pressed') === 'true') {
                alert('Measure On!');
                return;
            }
            for (var j = 0; j < requestFeature.length; j++) {
                requestFeature[j].abort();
            }
            requestFeature = [];

            var wmsSource, url;
            var view = map.getView();
            var viewResolution = /** @type {number} */ (view.getResolution());
            var numberRequested = 0;
            var jsonFeatures = [];

            vectorSource.clear();
            featureInfoElementExt.removeAll();
            jfeatureInfoElement.addClass('hidden');

            // bind accordion click
            var jfeatureInfoItemElement = jfeatureInfoElement.find('.x-accordion-item');
            var showFeatureInfo = function (jsonFeatures, projection) {
                var numberFeature = jsonFeatures.length;
                if (numberFeature > 0) {
                    jfeatureInfoItemElement.unbind();
                    jfeatureInfoItemElement = jfeatureInfoElement.find('.x-accordion-item');
                    jfeatureInfoItemElement.click(function () {
                        var idClick = this.id;
                        $.each(jfeatureInfoItemElement, function (key, value) {
                            if (value.id === idClick) {
                                featureInfoElementExt.items.items[key].expand();
                                changeCss();
                                vectorSource.clear();
                                if (jsonFeatures[key].geometry !== null) {
                                    var feature = (new ol.format.GeoJSON()).readFeatures(jsonFeatures[key], {
                                        dataProjection: projection,
                                        featureProjection: view.getProjection().getCode()
                                    });
                                    vectorSource.addFeatures(feature);
                                    setCenter(jsonFeatures[key].geometry);
                                } else {
                                    featureInfo.setPosition(evt.coordinate);
                                }
                                return false;
                            }
                        });
                    });
                    changeCss();
                    if (jsonFeatures[0] && jsonFeatures[0].geometry !== null) {
                        var feature = (new ol.format.GeoJSON()).readFeatures(jsonFeatures[0], {
                            dataProjection: projection,
                            featureProjection: view.getProjection().getCode()
                        });
                        vectorSource.addFeatures(feature);
                        setCenter(jsonFeatures[0].geometry);
                    } else {
                        featureInfo.setPosition(evt.coordinate);
                    }
                }
            };

            var changeCss = function () {
                var jfeatureInfoElement = $('#featureInfoElement');
                jfeatureInfoElement.removeClass('hidden');
                jfeatureInfoElement.find('.x-panel-header-title').css('top', '0');
                jfeatureInfoElement.find('#featureInfoElementExt_header').css({
                    'padding-top': '0',
                    'padding-bottom': '0'
                });
                var jfeatureInfoElementInnerCt = jfeatureInfoElement.find('#featureInfoElementExt-innerCt');
                jfeatureInfoElementInnerCt.find('.x-title-item').css({
                    'line-height': '15px',
                    'padding-left': '10px',
                    'font-size': '14px'
                });
                jfeatureInfoElement.find('.x-tool-collapse-top').css('background-position', '0 -340px');
                jfeatureInfoElement.find('.x-tool-collapse-bottom').css('background-position', '0 -340px');
                jfeatureInfoElement.find('.x-tool-expand-top').css('background-position', '0 -320px');
                jfeatureInfoElement.find('.x-tool-expand-bottom').css('background-position', '0 -320px');
                jfeatureInfoElement.find('#featureInfoElementExt-body').find('.x-tool-img').css({
                    'height': '20px',
                    'width': '20px',
                    'background-size': '100%'
                });
            };

            var isFinished = function (numberRequested, jsonFeatures, projection) {
                if (numberRequested >= numberVisibleWmsLayers) {
                    showFeatureInfo(jsonFeatures, projection);
                }
            };

            for (var i = 0; i < wmsLayers.length; i++) {
                if (wmsLayers[i].getVisible()) {
                    wmsSource = wmsLayers[i].getSource();
                    url = wmsSource.getGetFeatureInfoUrl(
                        evt.coordinate,
                        viewResolution,
                        view.getProjection().getCode(),
                        {
                            'INFO_FORMAT': 'application/json',
                            'FEATURE_COUNT': '3'
                        }
                    );

                    var request = $.getJSON(url)
                        .done(function (json) {
                            var accordionItem = {
                                title: '',
                                html: null,
                                autoEl: {
                                    tag: 'div',
                                    'index': null
                                }
                            };
                            var table;
                            var projection = null;
                            if (json.features.length > 0) {
                                for (var i = 0; i < json.features.length; i++) {
                                    projection = json.crs ? json.crs.properties.name : null
                                    jsonFeatures.push(json.features[i]);
                                    table = '<table class="tab_featureInfo">';

                                    if (json.features[i].id) {
                                        accordionItem.title = json.features[i].id;
                                    } else {
                                        accordionItem.title = this.url.replace('/proxy/?url=', '');
                                        accordionItem.title = decodeURIComponent(decodeURIComponent(accordionItem.title));
                                        accordionItem.title = accordionItem.title.slice(accordionItem.title.search("&LAYERS=") + 8);
                                        accordionItem.title = accordionItem.title.slice(0, accordionItem.title.search("&"));
                                        accordionItem.title = accordionItem.title.slice(accordionItem.title.search(":") + 1);
                                    }

                                    for (var propertie in json.features[i].properties) {
                                        if (json.features[i].properties.hasOwnProperty(propertie)) {
                                            table += '<tr>';
                                            table += '<th>' + propertie + '</th>';
                                            table += '<td>' + json.features[i].properties[propertie] + '</td>';
                                            table += '</tr>';
                                        }
                                    }
                                    table += '</table>';
                                    accordionItem.html = table;
                                    featureInfoElementExt.add(accordionItem);
                                }
                            }
                            numberRequested++;
                            isFinished(numberRequested, jsonFeatures, projection);
                        })
                        .fail(function (jqxhr, textStatus, error) {
                            var err = textStatus + ", " + error;
                            console.log("Request getFeatureInfo Failed: " + err, jqxhr);
                            numberRequested++;
                            isFinished(numberRequested, jsonFeatures, projection);
                        });
                    requestFeature.push(request);
                }
            }
        });
    },

    clearMeasure: function () {
        this.measureLayer.getSource().clear();
        this.map.removeOverlay(this.helpTooltip);
        this.map.removeOverlay(this.measureTooltip);
        this.helpTooltipElement = null;
        $(".tooltip-static").remove();
    },

    zoomToWorld: function (map) {
        var view = map.getView();
        var extent;
        extent = view.getProjection().getExtent();
        var zoom = ol.animation.zoom({
            duration: 2000,
            resolution: view.getResolution()
        });
        var pan = ol.animation.pan({
            source: view.getCenter(),
            duration: 2000
        });
        map.beforeRender(pan, zoom);
        if (!extent) {
            extent = ol.proj.EPSG3857.EXTENT;
        }
        view.fit(extent, map.getSize());
    },

    zoomToLayer: function (extent) {
        var view = this.map.getView();
        var zoom = ol.animation.zoom({
            duration: 2000,
            resolution: view.getResolution()
        });
        var pan = ol.animation.pan({
            source: view.getCenter(),
            duration: 2000
        });
        this.map.beforeRender(pan, zoom);
        if (!extent) {
            extent = view.getProjection().getExtent();
        }
        view.fit(extent, this.map.getSize(), {
            nearest: true
        });
    },

    createHelpTooltip: function (Map) {
        var map = Map.map;
        var helpTooltipElement = Map.helpTooltipElement;
        if (helpTooltipElement) {
            helpTooltipElement.parentNode.removeChild(helpTooltipElement);
        }
        helpTooltipElement = document.createElement('div');
        helpTooltipElement.className = 'tooltip hidden';
        Map.helpTooltip = new ol.Overlay({
            element: helpTooltipElement,
            offset: [15, 0],
            positioning: 'center-left'
        });
        map.addOverlay(Map.helpTooltip);
        return {
            helpTooltipElement: helpTooltipElement,
            helpTooltip: Map.helpTooltip
        };
    },

    createMeasureTooltip: function (map, measureTooltipElement, measureTooltip) {
        if (measureTooltipElement && measureTooltipElement.parentNode) {
            measureTooltipElement.parentNode.removeChild(measureTooltipElement);
        }
        measureTooltipElement = document.createElement('div');
        measureTooltipElement.className = 'tooltip tooltip-measure';
        measureTooltip = new ol.Overlay({
            element: measureTooltipElement,
            offset: [0, -15],
            positioning: 'bottom-center'
        });
        map.addOverlay(measureTooltip);
        return {
            measureTooltipElement: measureTooltipElement,
            measureTooltip: measureTooltip
        };
    },

    formatLength: function (line) {
        var geodesicCheckbox = {checked: true};
        var wgs84Sphere = new ol.Sphere(6378137);
        var length;
        if (geodesicCheckbox.checked) {
            var coordinates = line.getCoordinates();
            length = 0;
            var sourceProj = mapviewer.view.mappanel.Map.map.getView().getProjection();
            for (var i = 0, ii = coordinates.length - 1; i < ii; ++i) {
                var c1 = ol.proj.transform(coordinates[i], sourceProj, 'EPSG:4326');
                var c2 = ol.proj.transform(coordinates[i + 1], sourceProj, 'EPSG:4326');
                length += wgs84Sphere.haversineDistance(c1, c2);
            }
        } else {
            length = Math.round(line.getLength() * 100) / 100;
        }
        var output;
        if (length > 100) {
            output = (Math.round(length / 1000 * 100) / 100) +
                ' ' + 'km';
            output += '<br>' + (Math.round((length / 1000 * 100) * 0.62137) / 100) +
                ' ' + 'mi';
        } else {
            output = (Math.round(length * 100) / 100) +
                ' ' + 'm';
            output += '<br>' + (Math.round((length * 100) * 3.2808) / 100) +
                ' ' + 'ft';
        }
        return output;
    },

    formatArea: function (polygon) {
        var geodesicCheckbox = {checked: true};
        var wgs84Sphere = new ol.Sphere(6378137);
        var area;
        if (geodesicCheckbox.checked) {
            var sourceProj = mapviewer.view.mappanel.Map.map.getView().getProjection();
            var geom = /** @type {ol.geom.Polygon} */(polygon.clone().transform(
                sourceProj, 'EPSG:4326'));
            var coordinates = geom.getLinearRing(0).getCoordinates();
            area = Math.abs(wgs84Sphere.geodesicArea(coordinates));
        } else {
            area = polygon.getArea();
        }
        var output;
        if (area > 10000) {
            output = (Math.round(area / 1000000 * 100) / 100) +
                ' ' + 'km<sup>2</sup>';
            output += '<br>' + (Math.round((area / 1000000 * 100) * 0.38610215854245) / 100) +
                ' ' + 'mi<sup>2</sup>';
        } else {
            output = (Math.round(area * 100) / 100) +
                ' ' + 'm<sup>2</sup>';
            output += '<br>' + (Math.round((area * 100) * 10.76391041671) / 100) +
                ' ' + 'ft<sup>2</sup>';
        }
        return output;
    },

    formatCircle: function (circle) {
        var area, radius;

        radius = Math.round(circle.getRadius() * 100) / 100;

        var output;
        if (radius > 100) {
            output = 'Radius ' + (Math.round(radius / 1000 * 100) / 100) +
                ' ' + 'km<br>';
            area = Math.PI * (Math.round(radius / 1000 * 100) / 100) * (Math.round(radius / 1000 * 100) / 100);
            output += 'Area ' + area.toFixed(2) +
                ' ' + 'km<sup>2</sup>';
        } else {
            output = 'Radius ' + (Math.round(radius * 100) / 100) +
                ' ' + 'm<br>';
            area = Math.PI * (Math.round(radius * 100) / 100) * (Math.round(radius * 100) / 100);
            output += 'Radius ' + area.toFixed(2) +
                ' ' + 'm<sup>2</sup>';
        }
        return output;
    }
});