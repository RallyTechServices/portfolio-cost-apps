Ext.define("snapshot-viewer", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'message_box',tpl:'Hello, <tpl>{_refObjectName}</tpl>'},
        {xtype:'container',itemId:'display_box'}
    ],

    integrationHeaders : {
        name : "snapshot-viewer"
    },
                        
    launch: function() {
        this._fetchSnapshotNames().then({
            success: this._initializeApp,
            failure: this._showError,
            scope: this
        });
    },
    _fetchSnapshotNames: function(){
        var deferred = Ext.create('Deft.Deferred');

        Ext.create('Rally.data.wsapi.Store',{
            model: 'Preference',
            fetch: ['Name','CreationDate','LastUpdateDate','Value'],
            filters: [{
                property: 'Name',
                operator: 'contains',
                value: CArABU.technicalservices.PortfolioCostApps.toolbox.snapshotPrefPrefix
            }],
            limit: 'Infinity'
        }).load({
            callback: function(records, operation, success){
                if (success){
                    deferred.resolve(records);
                } else {
                    deferred.reject(operation.error.errors.join(','));
                }
            }
        });

        return deferred;
    },
    _showError: function(msg){
        Rally.ui.notify.Notifier.showError({message: msg });
    },
    _initializeApp: function(snapshotPrefRecords){
        this.logger.log('_initializeApp', snapshotPrefRecords);

        this.removeAll();
        if (!snapshotPrefRecords || snapshotPrefRecords.length === 0){
            //write something in the container.
            this.add({
                xtype: 'container',
                html: 'No snapshots found for current permissions.  Please use the appropriate Portfolio Cost Tracking app to add a snapshot.'
            });
            return;
        }

        this.snapshotRecords = snapshotPrefRecords;

        var snapshotData = Ext.Array.map(snapshotPrefRecords, function(r){
            return {
                name: Ext.String.format("{0} [{1}]",CArABU.technicalservices.PortfolioCostApps.toolbox.getFriendlyNameFromSnapshot(r), CArABU.technicalservices.PortfolioCostApps.toolbox.getSnapshotModelType(r)),
                value: r.get('Name')
            };
        });

        this.logger.log('snapshotData', snapshotData);
        this.add({
            xtype: 'container',
            layout: 'hbox',
            items: [{
                xtype: 'rallycombobox',
                itemId: 'cb-snapName',
                store: Ext.create('Rally.data.custom.Store',{
                    data: snapshotData
                }),
                margin: 5,
                width: 350,
                fieldLabel: 'Snapshot Name',
                labelWidth: 100,
                labelAlign: 'right',
                multiSelect: true,
                displayField: 'name',
                valueField: 'value'
            },{
                xtype: 'rallybutton',
                text: 'Go',
                margin: 5,
                listeners: {
                    click: this._showSnapshots,
                    scope: this
                }
            },{
                xtype: 'rallybutton',
                iconCls: 'icon-export secondary',
                margin: '5 25 5 25',
                listeners: {
                    click: this._export,
                    scope: this
                }
            }]
        });


    },
    _export: function(){
        this.logger.log('_export');
        var exporter = Ext.create('CArABU.technicalservices.Exporter',{});
        var filename = Ext.String.format("snap-export-{0}.csv", Rally.util.DateTime.format(new Date(), 'Y-m-d-h-M-s'));
        var csv = exporter.getCSVFromGrid(this.down('#snapInfo'));
        exporter.saveCSVToFile(csv, filename);
    },
    _getModelNames: function(snaps){
        var models = [];
        Ext.Array.each(snaps, function(s){
            var modelType = CArABU.technicalservices.PortfolioCostApps.toolbox.getSnapshotModelType(s);
            if (!Ext.Array.contains(models, modelType)){
                models.push(modelType);
            }
        });
        return models;
    },
    _showSnapshots: function(){

        var cb = this.down('#cb-snapName');
        if (!cb ){
            return;
        }

        if (this.down('#snapInfo')){
            this.down('#snapInfo').destroy();
        }

        this.logger.log('_showSnapshots', cb.getValue());
        var snapValues = cb.getValue() || [],
            snaps = Ext.Array.filter(this.snapshotRecords, function(s){
                return Ext.Array.contains(snapValues, s.get('Name'));
            }),
            snapNames = Ext.Array.map(snaps, function(s){
                return CArABU.technicalservices.PortfolioCostApps.toolbox.getFriendlyNameFromSnapshot(s);
            }),
            models = this._getModelNames(snaps);

        if (!models || models.length > 1){
            this.add({
                xtype: 'container',
                itemId: 'snapInfo',
                html: "Snapshots with multiple or unknown Portfolio Item types selected.  Please select snapshots for only one type of Portfolio Item."
            });
            return;
        }
        this._addGrid(snapNames, models[0], snaps)
    },

    _addGrid: function(snapNames, modelName, snaps){
        this.logger.log('_addGrid', snapNames, modelName);


        var objectIDs = [];
        Ext.Array.each(snaps, function(s){
            var val = CArABU.technicalservices.PortfolioCostApps.toolbox.getSnapshotData(s);
            objectIDs = Ext.Array.merge(objectIDs, Ext.Object.getKeys(val));
        });
        this.logger.log('_addGrid objectIds', objectIDs);
        var filters = Ext.Array.map(objectIDs, function(o){
                return {
                    property: 'ObjectID',
                    value: o
                };
            });


        CArABU.technicalservices.PortfolioSnapshotModelBuilder.build(modelName, "PortfolioSnapshot",snapNames).then({
            success: function(model){
                this.add({
                    xtype:'rallygrid',
                    showRowActionsColumn: false,
                    enableEditing: false,
                    itemId: 'snapInfo',
                    storeConfig: {
                        model: model,
                        fetch: ['FormattedID','Name'],
                        filters: Rally.data.wsapi.Filter.or(filters),
                        limit: 'Infinity',
                        listeners: {
                            load: function(store, records){
                                Ext.Array.each(records, function(r){
                                    r.updateSnapValues(snaps);
                                });
                            },
                            scope: this
                        }
                    },
                    columnCfgs: this._getColumnCfgs(snapNames)
                });
            },
            scope: this
        });

    },

    _getColumnCfgs: function(snapNames){
        var cols = [{
            dataIndex: 'FormattedID',
            _csvIgnoreRender: true
        },{
            dataIndex: 'Name',
            flex: 1
        },{
            dataIndex: 'Project',
            flex: 1
        }];

        Ext.Array.each(snapNames, function(n){
            cols.push({
                dataIndex: n,
                text: n,
                editor: false,
                renderer: function(v,r){
                    if (v > 0){
                        return v;
                    }
                    return "";
                }
            });
        });
        return cols;
    },
    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },
    
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },
    
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    },
    
    //onSettingsUpdate:  Override
    onSettingsUpdate: function (settings){
        this.logger.log('onSettingsUpdate',settings);
        // Ext.apply(this, settings);
        this.launch();
    }
});
