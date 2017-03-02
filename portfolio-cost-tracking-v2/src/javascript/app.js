Ext.define("portfolio-cost-tracking-v2", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),

    mixins: [],

    printHeaderLabel: 'Portfolio Items',
    statePrefix: 'portfolio-tree',

    config: {
        defaultSettings: {
            piTypePickerConfig: {
                renderInGridHeader: true
            },
            selectedCalculationType: 'points',
            normalizedCostPerUnit: 1000,
            projectCostPerUnit: {},
            currencySign: '$',
            preliminaryBudgetField: 'PreliminaryEstimate'
        }
    },
    toggleState: 'grid',
    enableAddNew: false,
    enableGridBoardToggle: false,
    allowExpansionStateToBeSaved: false,
    plugins: ['rallygridboardappresizer'],
    actionMenuItems: [],
    enableImport: true,
    enableCsvExport: true,
    enablePrint: true,
    enableRanking: true,
    isWorkspaceScoped: false,
    modelNames: [],
    modelsContext: null,
    printHeaderLabel: '',
    statePrefix: null,

    items: [],

    portfolioItemRollupData: {},

    launch: function(){
        //todo: check for RPM?
        this.loadModelNames().then({
            success: function (modelNames) {
                this.modelNames = modelNames;
                if(!this.rendered) {
                    this.on('afterrender', this.loadGridBoard, this, {single: true});
                } else {
                    this.loadGridBoard();
                }
            },
            scope: this
        });
    },
    loadModelNames: function () {
        var promises = [this.fetchDoneStates(), this._createPITypePicker(),this.fetchProjectCostHistory()];
        return Deft.Promise.all(promises).then({
            success: function (results) {
                this.logger.log('results', results);
                this.currentType = results[1];
                this._initializeSettings(this.getSettings(), results[0], this.piTypePicker, results[2]);
                this._initializeRollupData(this.currentType.get('TypePath'));
                return [this.currentType.get('TypePath')];
            },
            scope: this
        });
    },
    fetchProjectCostHistory: function(){
        this.logger.log('fetchProjectCostHistory');
        var deferred = Ext.create('Deft.Deferred'),
            me=this;

        CArABU.technicalservices.ProjectCostModelBuilder.build('Preference', 'ProjectCostModel').then({
            success: function(model){
                Ext.create('Rally.data.wsapi.Store',{
                    model: model,
                    fetch: ['Name','Project','Type','Value','CreationDate'],
                    filters: [{
                        property: 'Name',
                        operator: "contains",
                        value: CArABU.technicalservices.ProjectCostModelBuilder.prefPrefix
                    },{
                        property: 'Workspace',
                        value: this.getContext().getWorkspace()._ref
                    }],
                    context: {
                        workspace: this.getContext().getWorkspace()._ref,
                        project: null
                    }
                }).load({
                    callback: function(records, operation, success){
                        me.logger.log('fetchProjectCostHistory', records, operation, success);
                        if (success){
                            deferred.resolve(records);
                        } else {
                            deferred.reject("Error loading project cost history: " + operation.error && operation.error.errors.join(','));
                        }
                    }
                });
            },
            scope: this
        });
        return deferred;
    },
    loadGridBoard: function () {
        this.logger.log('loadGridBoard', this.modelNames);

        this._getTreeGridStore().then({
            success: function (store) {
                this.addGridBoard(store);
            },
            scope: this
        });
    },

    addGridBoard: function (store) {
        if (this.gridboard) {
            this.gridboard.destroy();
        }

        var customColumns = this.getDerivedColumns() || [],
            columnCfgs = Ext.Array.merge(this.getColumnCfgs() || [], customColumns);
        this.logger.log('addGridBoard', store, this.modelNames, columnCfgs);

        this.gridboard = this.add({
            itemId: 'gridboard',
            xtype: 'rallygridboard',
            context: this.getContext(),
            toggleState: 'grid',
            stateful: false,
            stateId: 'gridboard-19',
            modelNames: _.clone(this.modelNames),
            plugins: this.getGridBoardPlugins(),
            gridConfig: {
                columnCfgs: columnCfgs,
                derivedColumns: customColumns,
                store: store,
                bulkEditConfig: {
                    items: [{
                        xtype: 'snapshotbulkmenuitem'
                    }]
                }
            },
            height: this.getHeight()
        });

        //this.gridboard.on('modeltypeschange', this._onTypeChange, this);

        this.fireEvent('gridboardadded', this.gridboard);
    },
    /**
     * We need to override this to show the picker in the grid header and also save state
     * rather than as a configuration
     */
    getGridBoardPlugins: function () {
        var plugins = [{
                ptype: 'rallygridboardinlinefiltercontrol',
                inlineFilterButtonConfig: {
                    modelNames: this.modelNames,
                    inlineFilterPanelConfig: {
                        collapsed: false,
                        quickFilterPanelConfig: {
                            fieldNames: ['Owner', 'ScheduleState']
                        }
                    }
                }
        }];

        plugins.push({
            ptype: 'rallygridboardfieldpicker',
            headerPosition: 'left',
            modelNames: this.modelNames,
            stateful: true,
            stateId: this.getContext().getScopedStateId('field-picker')
        });

        plugins = plugins.concat(this.getActionsMenuConfig() || []);
        return plugins;
    },
    getActionsMenuConfig: function () {
        var importItems = this._getImportItems();
        var printItems = this._getPrintItems();
        var exportItems = this._getExportItems();

        var tooltipTypes = []
            .concat(importItems.length ? 'Import' : [])
            .concat(exportItems.length ? 'Export' : [])
            .concat(printItems.length ? 'Print' : []);

        var menuItems = this.actionMenuItems.concat(importItems, exportItems, printItems);

        return tooltipTypes.length === 0 || this.toggleState === 'board' ? [] : [{
            ptype: 'rallygridboardactionsmenu',
            menuItems: menuItems,
            buttonConfig: {
                hidden: this.toggleState !== 'grid',
                iconCls: 'icon-export',
                toolTipConfig: {
                    html: tooltipTypes.join('/'),
                    anchor: 'top',
                    hideDelay: 0
                }
            }
        }];
    },
    _createPITypePicker: function () {
        if (this.piTypePicker && this.piTypePicker.destroy) {
            this.piTypePicker.destroy();
        }
        if (!this.down('#selector_box')){
            this.add({
                itemId: 'selector_box',
                layout: 'hbox'
            });
        }
        this.down('#selector_box').removeAll();

        var deferred = new Deft.Deferred();

        this.piTypePicker = this.down('#selector_box').add({
            xtype: 'rallyportfolioitemtypecombobox',
            context: this.getContext(),
            labelAlign: 'right',
            labelWidth: 100,
            listeners: {
                select: this._onTypeChange,
                ready: {
                    fn: function (picker) {
                        var newType = picker && picker.getRecord();
                        deferred.resolve(newType);
                    },
                    single: true
                },
                scope: this
            }
        });

        return deferred.promise;
    },
    _initializeRollupData: function(newType){
        this.logger.log('_initializeRollupData', newType);
        if (this.rollupData){
            this.rollupData.destroy();
        }

        this.rollupData = Ext.create('CArABU.technicalservices.RollupCalculator', {
            portfolioItemType: newType
        });
    },
    _initializePortfolioItemTypes: function(cb){

        var items = cb.getStore().data.items,
            portfolioItemTypes = new Array(items.length);

        Ext.Array.each(items, function(item){
            var idx = Number(item.get('Ordinal'));
            portfolioItemTypes[idx] = { typePath: item.get('TypePath'), name: item.get('Name'), ordinal: idx };
        });
        CArABU.technicalservices.PortfolioItemCostTrackingSettings.portfolioItemTypes = portfolioItemTypes;
    },
    _onTypeChange: function (picker, records) {
        var newType = picker && picker.getRecord();
        this.logger.log('_onTypeChange', picker, newType);

        if (newType && this.currentType && newType.get('_ref') !== this.currentType.get('_ref')) {
            this.currentType = newType;
            this.modelNames = [newType.get('TypePath')];
            this._initializeRollupData(newType.get('TypePath'));
            this.loadGridBoard();
        }
    },
    _initializeSettings: function(settings, doneScheduleStates, piTypePicker, projectCostHistory){

        CArABU.technicalservices.PortfolioItemCostTrackingSettings.notAvailableText = "--";
        CArABU.technicalservices.PortfolioItemCostTrackingSettings.currencySign = settings.currencySign;
        CArABU.technicalservices.PortfolioItemCostTrackingSettings.currencyPrecision = 0;
        CArABU.technicalservices.PortfolioItemCostTrackingSettings.currencyEnd = false;
        if (doneScheduleStates){
            CArABU.technicalservices.PortfolioItemCostTrackingSettings.completedScheduleStates = doneScheduleStates;
        }
        CArABU.technicalservices.PortfolioItemCostTrackingSettings.normalizedCostPerUnit = settings.normalizedCostPerUnit;

        CArABU.technicalservices.PortfolioItemCostTrackingSettings.setProjectCostHistory(projectCostHistory);

        CArABU.technicalservices.PortfolioItemCostTrackingSettings.preliminaryBudgetField = settings.preliminaryBudgetField;

        CArABU.technicalservices.PortfolioItemCostTrackingSettings.setCalculationType(settings.selectedCalculationType);

        this._initializePortfolioItemTypes(piTypePicker);

    },
    _showExportMenu: function () {
        //var columnCfgs = this.down('rallytreegrid').columnCfgs,
        var columnCfgs = this.down('rallytreegrid').headerCt.getGridColumns(),
            additionalFields = _.filter(columnCfgs, function(c){ return (c.xtype === 'rallyfieldcolumn' && c.text != "Rank"); }),
            costFields = this.getDerivedColumns(),
            columns = Ext.Array.merge(additionalFields, costFields);
        
        console.log('column cfgs:', columnCfgs);

        additionalFields = _.pluck(additionalFields, 'dataIndex');

        var filters = this.down('rallygridboard').currentCustomFilter.filters || [],
            fetch = CArABU.technicalservices.PortfolioItemCostTrackingSettings.getTreeFetch(additionalFields),
            root_model = this.currentType.get('TypePath');

        var exporter = new CArABU.technicalservices.Exporter();
        exporter.on('statusupdate', this._showStatus, this);

        this.logger.log('columns:', columns);
        
        exporter.fetchExportData(root_model,filters,fetch,columns).then({
            scope: this,
            success: function(csv){
                var filename = Ext.String.format("export-{0}.csv",Ext.Date.format(new Date(),"Y-m-d-h-i-s"));
                exporter.saveCSVToFile(csv, filename);
            },
            failure: function(msg){
                Rally.ui.notify.Notifier.showError({message: "An error occurred fetching the data to export:  " + msg});
            }
        });
    },
    _loadRollupData: function(records){
        this.logger.log('_loadRollupData', records);

        var loader = Ext.create('CArABU.technicalservices.RollupDataLoader',{
            context: this.getContext(),
            portfolioItemTypes: CArABU.technicalservices.PortfolioItemCostTrackingSettings.getPortfolioItemTypes(),
            featureName: CArABU.technicalservices.PortfolioItemCostTrackingSettings.getFeatureName(),
            listeners: {
                rollupdataloaded: function(portfolioHash, stories){
                    this._processRollupData(portfolioHash,stories,records);
                },
                loaderror: this._handleLoadError,
                statusupdate: this._showStatus,
                scope: this
            }
        });
        loader.loadDescendants(records);
    },
    _handleLoadError: function(msg){
        Rally.ui.notify.Notifier.showError({message: msg});
    },
    _processRollupData: function(portfolioHash, stories, records){
        this.logger.log('_processRollupData');
        var me = this;
        portfolioHash[records[0].get('_type').toLowerCase()] = records;
        this.rollupData.addRollupRecords(portfolioHash, stories);
        this.rollupData.updateModels(records);
        this.down('rallygridboard').getGridOrBoard().getView().refresh();
        me._showStatus(null);
    },
    _showStatus: function(message){
        if (message) {
            Rally.ui.notify.Notifier.showStatus({
                message: message,
                showForever: true,
                closable: false,
                animateShowHide: false
            });
        } else {
            Rally.ui.notify.Notifier.hide();
        }
    },
    _getExportItems: function() {
        return [{
            text: 'Export to CSV...',
            handler: this._showExportMenu,
            scope: this
        }];
    },
    _getImportItems: function(){
        return [];
    },
    _getPrintItems: function(){
        return [];
    },
    _getTreeGridStore: function () {

        var fetch = CArABU.technicalservices.PortfolioItemCostTrackingSettings.getTreeFetch([]);
        this.logger.log('_getTreeGridStore', fetch)

        return Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            //childPageSizeEnabled: true,
            context: this.getContext().getDataContext(),
            enableHierarchy: true,
            fetch: fetch,
            models: this.modelNames, // _.clone(this.models),
            //pageSize: 25,
            remoteSort: true,
            root: {expanded: true}
        }).then({
            success: function (treeGridStore) {
                treeGridStore.model.addField({name: '_rollupData', type: 'auto', defaultValue: null, getUUID: function() { return "'_rollupData"; }});
                treeGridStore.on('load', this.updateDerivedColumns, this);
                return treeGridStore;
            },
            scope: this
        });
    },
    updateDerivedColumns: function(store, node, records){
        this.logger.log('updateDerivedColumns');
        if (!store.model.getField('_rollupData')){
            store.model.addField({name: '_rollupData', type: 'auto', defaultValue: null});
        }

        var unloadedRecords = this.rollupData.updateModels(records);

        if (unloadedRecords && unloadedRecords.length > 0 && node.parentNode === null){
            this._loadRollupData(unloadedRecords);
        }
    },
    getDerivedColumns: function(){

        return [{
            text: "Actual Cost To Date",
            xtype: 'costtemplatecolumn',
            dataIndex: '_rollupData',
            costField: '_rollupDataActualCost',
            sortable: false,
            tooltip: CArABU.technicalservices.PortfolioItemCostTrackingSettings.getHeaderTooltip('_rollupDataActualCost')
        },{
            text: "Remaining Cost",
            xtype: 'costtemplatecolumn',
            dataIndex: '_rollupData',
            sortable: false,
            costField: '_rollupDataRemainingCost',
            tooltip: CArABU.technicalservices.PortfolioItemCostTrackingSettings.getHeaderTooltip('_rollupDataRemainingCost')
        }, {
            text: 'Total Projected',
            xtype: 'costtemplatecolumn',
            dataIndex: '_rollupData',
            sortable: false,
            costField: '_rollupDataTotalCost',
            tooltip: CArABU.technicalservices.PortfolioItemCostTrackingSettings.getHeaderTooltip('_rollupDataTotalCost')
        },{
            text: 'Preliminary Budget',
            xtype: 'costtemplatecolumn',
            dataIndex: '_rollupData',
            sortable: false,
            costField: '_rollupDataPreliminaryBudget',
            tooltip: CArABU.technicalservices.PortfolioItemCostTrackingSettings.getHeaderTooltip('_rollupDataPreliminaryBudget')
        }];
    },
    getColumnCfgs: function(){

        return  [{
            dataIndex: 'Name',
            text: 'Name',
            flex: 5
        },{
            dataIndex: 'Project',
            text: 'Project',
            editor: false
        },{
            dataIndex: 'LeafStoryPlanEstimateTotal',
            text: 'Plan Estimate Total'
        }, {
            dataIndex: 'PercentDoneByStoryPlanEstimate',
            text: '% Done by Story Points'
        }];
    },
    getSettingsFields: function() {
        return CArABU.technicalservices.PortfolioItemCostTrackingSettings.getFields(this.getSettings());
    },
    onSettingsUpdate: function(settings){

        this._initializeSettings(settings,null,this.piTypePicker);
        this._initializeRollupData(this.currentType.get('TypePath'));
        this.loadGridBoard();
    },
    onDestroy: function() {
        this.callParent(arguments);
        if (this.rollupData){
            delete this.rollupData;
        }
    },
    fetchDoneStates: function(){
        var deferred = Ext.create('Deft.Deferred');

        Rally.data.ModelFactory.getModel({
            type: 'HierarchicalRequirement',
            success: function(model) {
                var field = model.getField('ScheduleState');
                field.getAllowedValueStore().load({
                    callback: function(records, operation, success) {

                        if (success){
                            var values = [];
                            for (var i=records.length - 1; i > 0; i--){
                                values.push(records[i].get('StringValue'));
                                if (records[i].get('StringValue') === "Accepted"){
                                    i = 0;
                                }
                            }
                            deferred.resolve(values);
                        } else {
                            deferred.reject('Error loading ScheduleState values for User Story:  ' + operation.error.errors.join(','));
                        }
                    },
                    scope: this
                });
            },
            failure: function() {
                var error = "Could not load schedule states";
                deferred.reject(error);
            }
        });
        return deferred.promise;
    }
});
