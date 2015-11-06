/**
 * Created by Sarin on 1/10/2015.
 */
Ext.define('mapviewer.view.mappanel.MapPanel', {
    extend: 'Ext.panel.Panel',

    requires: [
        'Ext.layout.container.Fit',
        'mapviewer.view.mappanel.MapComponent',
        'mapviewer.view.mappanel.MapPanelController',
        'mapviewer.view.mappanel.MapPanelModel'
    ],
    title: 'Map Panel',
    header: false,

    xtype: 'mappanel',

    viewModel: {
        type: 'mappanel'
    },

    controller: 'mappanel',

    region: 'center',
    border: false,
    layout: 'fit',

    items: [
        {
            xtype: 'mapcomponent'
        }
    ]
});