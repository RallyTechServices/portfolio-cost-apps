Ext.override(Rally.ui.combobox.PortfolioItemTypeComboBox, {
    getCurrentView: function () {
        return {piTypePicker: this.getRecord().get('_ref')};
    }
});


Ext.override(Rally.ui.gridboard.GridBoard, {
    setCurrentView: function(view) {
        this._setSharedViewProperties(this.plugins, view);

        if (view.toggleState === 'grid') {
            Ext.state.Manager.set(this._getGridConfig().stateId, _.pick(view, ['columns', 'sorters']));
        } else if (view.toggleState === 'board') {
            Ext.state.Manager.set(this._getBoardConfig().fieldsStateId, view.fields);
        }
        Ext.state.Manager.set(this.stateId, _.pick(view, ['toggleState']));

        //need to override so we can pass the view back to the app, alternatively we could override _setSharedViewProperties so that
        //we can set the value of hte additionalCmps
        this.fireEvent('viewchange', this, view);
    }
});


Ext.override(Rally.ui.grid.TreeGrid, {

    //_setColumnFlex: function(column) {
    //    if (column.width) {
    //        column.width =  column.width; //lets consider the derived columns
    //        //delete column.width;
    //    } else if (!_.isNumber(column.flex)) {
    //        column.flex = Rally.ui.grid.FieldColumnFactory.defaultFlexValue;
    //    }
    //},
    _mergeColumnConfigs: function(newColumns, oldColumns) {

        var mergedColumns= _.map(newColumns, function(newColumn) {
            var oldColumn = _.find(oldColumns, {dataIndex: this._getColumnName(newColumn)});
            if (oldColumn) {
                return this._getColumnConfigFromColumn(oldColumn);
            }

            return newColumn;
        }, this);


        mergedColumns = mergedColumns.concat(this.config.derivedColumns);

        return mergedColumns;
    },
    _getColumnConfigsBasedOnCurrentOrder: function(columnConfigs) {
         return _(this.headerCt.items.getRange()).map(function(column) {
             //override:  Added additional search for column.text
            return _.contains(columnConfigs, column.dataIndex) ? column.dataIndex : _.find(columnConfigs, {dataIndex: column.dataIndex, text: column.text});
        }).compact().value();
    },
    _restoreColumnOrder: function(columnConfigs) {

        var currentColumns = this._getColumnConfigsBasedOnCurrentOrder(columnConfigs);
        var addedColumns = _.filter(columnConfigs, function(config) {
            return !_.find(currentColumns, {dataIndex: config.dataIndex}) || Ext.isString(config);
        });

        return currentColumns.concat(addedColumns);
    },
    _applyStatefulColumns: function(columns) {
        if (this.alwaysShowDefaultColumns) {
            _.each(this.columnCfgs, function(columnCfg) {
                if (!_.any(columns, {dataIndex: this._getColumnName(columnCfg)})) {
                    columns.push(columnCfg);
                }
            }, this);
        }
        if (this.config && this.config.derivedColumns){
            this.columnCfgs = columns.concat(this.config.derivedColumns);
        } else {
            this.columnCfgs = columns;
        }
    },
    _isStatefulColumn: function(columnName) {

        if (this.config && this.config.derivedColumns && this.config.derivedColumns.length > 0){
            var derivedColNames = _.pluck(this.config.derivedColumns, 'dataIndex');
            if (Ext.Array.contains(derivedColNames, columnName)){
                return false;
            }
        }

        if (!this.allColumnsStateful) {
            columnName = columnName.toLowerCase();

            if (this.store.enableHierarchy && columnName === this.treeColumnDataIndex.toLowerCase()) {
                return false;
            }

            if (this.enableRanking && columnName === this.rankColumnDataIndex.toLowerCase()) {
                return false;
            }
        }

        return true;
    }
});
