/**
 * Created by Sarin on 1/10/2015.
 */
Ext.define('mapviewer.view.layerpanel.LayerPanel', {
    extend: 'GeoExt.tree.Panel',

    requires: [
        'GeoExt.data.store.LayersTree',
        'mapviewer.view.layerpanel.LayerPanelController',
        'mapviewer.view.layerpanel.LayerPanelModel',
        'mapviewer.view.mappanel.Map'
    ],

    xtype: 'layerpanel',

    viewModel: {
        type: 'layerpanel'
    },

    controller: 'layerpanel',

    title: 'Layers',

    store: function () {
        var Map = mapviewer.view.mappanel.Map;
        return Ext.create('GeoExt.data.store.LayersTree', {
            layerGroup: Map.getMap().getLayerGroup(),
            showLayerGroupNode: false,
            filters: [
                function (item) {
                    var name = item.getOlLayer().get('name');
                    return name !== 'Measure Layer' && name !== 'Feature Info Layer';
                }
            ]
        });
    }(),

    rootVisible: false,
    flex: 1,
    border: false,
    listeners: {
        itemdblclick: 'itemdblclick'
    }
})
;