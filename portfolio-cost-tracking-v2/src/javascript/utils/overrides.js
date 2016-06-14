
Ext.override(Rally.ui.grid.TreeGrid, {
    _mergeColumnConfigs: function(newColumns, oldColumns) {
        console.log('_mergeColumnConfigs', newColumns, oldColumns);
        var mergedColumns= _.map(newColumns, function(newColumn) {
            var oldColumn = _.find(oldColumns, {dataIndex: this._getColumnName(newColumn)});
            if (oldColumn) {
                return this._getColumnConfigFromColumn(oldColumn);
            }

            return newColumn;
        }, this);

        mergedColumns = mergedColumns.concat(this.config.derivedColumns);
        console.log('_mergeColumnConfigs', mergedColumns,this.config.derivedColumns);
        return mergedColumns;
    },
    _getPersistableColumnConfig: function(column) {
        console.log('_getPersistableColumnConfig', column);
        var columnConfig = this._getColumnConfigFromColumn(column),
            field = this._getModelField(columnConfig.dataIndex);

        if (field && field.getUUID && field.getUUID()) {
            columnConfig.dataIndex = field.getUUID();
        }
        console.log('_getPersistableColumnConfig', columnConfig);
        return columnConfig;
    },
    _getStatefulColumns: function(columnCfgs) {

        var columns =  _.filter(columnCfgs, function(columnCfg) {
            var columnName = this._getColumnName(columnCfg);
            return !_.isEmpty(columnName) && this._isStatefulColumn(columnName);
        }, this);
        console.log('--_getStatefulColumns', columnCfgs, columns,this.headerCt.getGridColumns());
        return columns;
    },
    reconfigureWithColumns: function(columnCfgs, reconfigureExistingColumns, suspendLoad) {
        console.log('--reconfigureWithColumns',columnCfgs);
        columnCfgs = this._getStatefulColumns(columnCfgs);

        if (!reconfigureExistingColumns) {
            columnCfgs = this._mergeColumnConfigs(columnCfgs, this.columns);
            columnCfgs = this._restoreColumnOrder(columnCfgs);
        }

        this.columnCfgs = columnCfgs;
        this._buildColumns(true);
        this._applyFetch();

        var summaryRow = this.getView().getFeature('summaryrow');
        if (summaryRow) {
            summaryRow.toggleSummaryRow(this._shouldShowSummary());
        }

        this.on('reconfigure', function() {
            this.headerCt.setSortState();
        }, this, {single: true});
        this.reconfigure(null, this.columns);
        this.columns = this.headerCt.items.getRange();

        if (!suspendLoad) {
            this.getStore().load();
        }
    },
    _applyStatefulColumns: function(columns) {
        if (this.alwaysShowDefaultColumns) {
            _.each(this.columnCfgs, function(columnCfg) {
                if (!_.any(columns, {dataIndex: this._getColumnName(columnCfg)})) {
                    columns.push(columnCfg);
                }
            }, this);
        }
        console.log('--_applyStatefulColumns', columns);
        this.columnCfgs = columns;
    },
    getCurrentView: function(){
        var view = _.pick(this.getState(), ['columns', 'sorters']);
        view.columns = _.map(_.filter(view.columns,  {xtype: 'rallyfieldcolumn'}), function(c){
            return _.pick(c, ['dataIndex','flex']);
        });
        console.log('--getCurrentView', view.columns);
        return view;
    },
});
