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
    btn_3dmap: null,
    btn_measure: null,
    Map: mapviewer.view.mappanel.Map,
    init: function () {
        this.btn_3dmap = Ext.getCmp('btn_3dmap');
        this.btn_measure = Ext.getCmp('btn_measure');
    },

    itemdblclick: function (view, rec, item, index, eventObj) {
        var name = rec.getData().get('fullname');
        var ptype = rec.getData().get('ptype');
        var sourceIndex = rec.getData().get('sourceIndex');
        var view = this.Map.map.getView();
        var extent, webExtent;

        if (ptype === 'gxp_wmscsource') {
            var layerInfo = this.Map.capabilities[sourceIndex].Capability.Layer.Layer;
            for (var i = 0; i < layerInfo.length; i++) {
                if (layerInfo[i].Name === name) {
                    extent = layerInfo[i].EX_GeographicBoundingBox;
                    break;
                }
            }
        }
        if (!extent) {
            webExtent = view.getProjection().getExtent();
        } else {
            var p1 = new ol.proj.fromLonLat([extent[0], extent[1]], view.getProjection());
            var p2 = new ol.proj.fromLonLat([extent[2], extent[3]], view.getProjection());
            webExtent = [p1[0], p1[1], p2[0], p2[1]];
        }
        this.Map.zoomToLayer(webExtent);
    }
});