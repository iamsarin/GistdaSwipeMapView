/**
 * Created by Sarin on 1/10/2015.
 */
Ext.define('mapviewer.view.layerpanel.LayerPanelController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.layerpanel',

    requires: [
        'mapviewer.view.mappanel.Map'
    ],

    /**
     * Called when the view is created
     */
    Map: mapviewer.view.mappanel.Map,
    init: function () {
    },

    itemdblclick: function (vieww, rec, item, index, eventObj) {
        var name = rec.getData().get('fullname');
        var source = rec.getData().get('source');
        var ptype = rec.getData().get('ptype');
        var sourceIndex = rec.getData().get('sourceIndex');
        var Map = this.Map;
        var view = Map.map.getView();
        var extent, tmsCabUrl;
        var isVisible = rec.getData().get('visible');

        if (isVisible && ptype === 'gxp_wmscsource') {
            var layerInfo = this.Map.capabilities[sourceIndex].Capability.Layer.Layer;
            var nameSplit;
            for (var i = 0; i < layerInfo.length; i++) {
                if (layerInfo[i].Name === name) {
                    extent = layerInfo[i].EX_GeographicBoundingBox;
                    break;
                } else if (name.search(':') >= 0) {
                    nameSplit = name.split(':');
                    if (nameSplit[1] === layerInfo[i].Name) {
                        extent = layerInfo[i].EX_GeographicBoundingBox;
                        break;
                    }
                }
            }
            if (!extent) {
                extent = view.getProjection().getExtent();
            } else {
                var p1 = new ol.proj.fromLonLat([extent[0], extent[1]], view.getProjection());
                var p2 = new ol.proj.fromLonLat([extent[2], extent[3]], view.getProjection());
                extent = [p1[0], p1[1], p2[0], p2[1]];
            }
            Map.zoomToLayer(extent);

        } else if (isVisible && ptype === 'gxp_tmssource') {
            if (source.getUrls()[0]) {
                tmsCabUrl = source.getUrls()[0].replace('%2F{z}%2F{x}%2F{-y}.png', '');
                $.ajax({
                    type: 'GET',
                    url: tmsCabUrl,
                    dataType: "xml",
                    success: function (xml) {
                        $(xml).find('BoundingBox').each(function () {
                            var $this = $(this);
                            extent = [parseFloat($this.attr('minx')), parseFloat($this.attr('miny')),
                                parseFloat($this.attr('maxx')), parseFloat($this.attr('maxy'))];
                            if (!extent) {
                                extent = view.getProjection().getExtent();
                            }
                            Map.zoomToLayer(extent)
                        });
                    },
                    error: function () {
                        console.log('Load TMS Capabilities Fail..');
                        extent = view.getProjection().getExtent();
                        Map.zoomToLayer(extent);
                    }
                });
            }
        } else {
            if (!extent) {
                extent = view.getProjection().getExtent();
            }
            Map.zoomToLayer(extent);
        }
    }
});