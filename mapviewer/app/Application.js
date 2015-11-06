/**
 * The main application class. An instance of this class is created by app.js when it
 * calls Ext.application(). This is the ideal place to handle application launch and
 * initialization details.
 */
Ext.define('mapviewer.Application', {
    extend: 'Ext.app.Application',

    requires: [
        'mapviewer.view.mappanel.MapPanel',
        'Ext.layout.AccordionLayout',
        'Ext.container.Viewport',
        'Ext.layout.container.Border',
        'Ext.layout.container.VBox',
        'Ext.panel.Panel',
        'mapviewer.view.descriptionpanel.DescriptionPanel',
        'mapviewer.view.layerpanel.LayerPanel',
        'mapviewer.view.legendpanel.LegendPanel'
    ],

    name: 'mapviewer',

    stores: [
        // TODO: add global / shared stores here
    ],

    view: [
        'mapviewer.view.main.Main'
    ],

    launch: function () {
        Ext.create('Ext.Viewport', {
            layout: "border",
            id: 'mapviewer',
            items: [
                {xtype: 'mappanel'},
                {
                    xtype: 'panel',
                    title: 'Tools',
                    resizable: {
                        pinned: true,
                        handles: 'w'
                    },
                    region: 'east',
                    width: '30%',
                    layout: {
                        // layout-specific configs go here
                        type: 'accordion',
                        titleCollapse: true,
                        animate: true,
                        activeOnTop: false
                    },
                    items: [
                        {xtype: 'layerpanel'},
                        {xtype: 'descriptionpanel'},
                        {xtype: 'legendpanel'}
                    ],
                    tabPosition: 'right',
                    collapsible: true,
                    collapsed: true
                }
            ]
        });
    },

    onAppUpdate: function () {
        Ext.Msg.confirm('Application Update', 'This application has an update, reload?',
            function (choice) {
                if (choice === 'yes') {
                    window.location.reload();
                }
            }
        );
    },

    init: function () {
        Ext.enableAriaButtons = false;
        Ext.enableAriaPanels = false;
    }
});
