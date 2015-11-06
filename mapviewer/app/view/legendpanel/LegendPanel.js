/**
 * Created by Sarin on 8/10/2015.
 */
Ext.define('mapviewer.view.legendpanel.LegendPanel', {
    extend: 'Ext.panel.Panel',
    xtype: 'legendpanel',
    requires: [
        'mapviewer.view.legendpanel.LegendPanelModel',
		'mapviewer.view.legendpanel.LegendPanelController'
    ],

    viewModel: {
        type: 'legend'
    },

    controller: 'legend',

    title: 'Legends',
    region: 'east',
    height: 100,
    width: '100%',
    border: false,
    bodyPadding: 20,
    scrollable: true,
    //html: '{LengendImages}',
    bind: {
        html: '{legendImages}'
    }
});