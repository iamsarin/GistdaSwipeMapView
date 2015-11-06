/**
 * Created by Sarin on 1/10/2015.
 */
Ext.define('mapviewer.view.descriptionpanel.DescriptionPanel', {
    extend: 'Ext.panel.Panel',
    xtype: 'descriptionpanel',

    requires: [
        'mapviewer.view.descriptionpanel.DescriptionPanelController',
        'mapviewer.view.descriptionpanel.DescriptionPanelModel'
    ],

    controller: 'descriptionpanel',
    viewModel: 'descriptionpanel',

    title: 'Description',
    region: 'east',
    height: 100,
    width: '100%',
    border: false,
    bodyPadding: 20,
    scrollable: true,
    bind: {
        html: '<h2>{mapName}</h2><p>{mapDesc}</p>'
    }
});