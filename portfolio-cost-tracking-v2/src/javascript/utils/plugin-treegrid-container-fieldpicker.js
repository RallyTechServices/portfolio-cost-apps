Ext.define('TreeGridContainerFieldPicker', {
    alias: 'plugin.treegridcontainerfieldpicker',
    extend:'Ext.AbstractPlugin',
    mixins: ['Rally.ui.gridboard.plugin.GridBoardControlShowable'],
    requires: [
        'Rally.ui.popover.Popover',
        'Rally.ui.Button',
        'Rally.ui.picker.FieldPicker'
    ],

    /**
     * @cfg {String[]} alwaysSelectedFields
     * The fields that will be always selected in the field picker for the grid view
     */
    gridAlwaysSelectedValues: ['FormattedID', 'Name'], // DragAndDropRank gets added in init if Drag and Drop is enabled for the workspace in the component's context

    /**
     * @cfg {String[]} gridFieldBlackList
     * The fields that will be blacklisted in grid mode
     */
    gridFieldBlackList: [
        'Actuals',
        'Changesets',
        'Children',
        'Description',
        'Notes',
        'ObjectID',
        'Predecessors',
        'RevisionHistory',
        'Subscription',
        'Successors',
        'TaskIndex',
        'Workspace',
        'VersionId'
    ],

    /**
     * @cfg {String[]}
     * the names of the models displayed on the board.
     */
    modelNames: [],

    stateful: true,

    margin: '3 9 10 10',

    constructor: function (config) {
        config.gridFieldBlackList = _.union(this.gridFieldBlackList, config.gridFieldBlackList);
        config.gridAlwaysSelectedValues = _.union(this.gridAlwaysSelectedValues, config.gridAlwaysSelectedValues);
        this.callParent(arguments);
    },

    init: function(cmp) {
        this.callParent(arguments);
        this.cmp = cmp;

        var rankingEnabled = this.cmp.getContext().getWorkspace().WorkspaceConfiguration.DragDropRankingEnabled && cmp.gridConfig.enableRanking !== false;

        this.gridAlwaysSelectedValues = this._modifyFieldCollection(this.gridAlwaysSelectedValues, ['DragAndDropRank'], rankingEnabled);
        this.gridFieldBlackList = this._modifyFieldCollection(this.gridFieldBlackList, ['DragAndDropRank'], !rankingEnabled);
        this.stateId = this.stateId || this.cmp.getFieldListStateId();

        var state = Ext.state.Manager.get(this.stateId);
        this._fields = state && state.fields;

        this.showControl();
    },
    showControl: function() {
        if (!this.controlCmp) {
            this._createControlCmp();
        }

        if (this.controlCmp) {
            this.controlCmp.show();
        }

        return this.controlCmp;
    },
    _modifyFieldCollection: function (collection, fields, include) {
        if (include) {
            return _.union(collection, fields);
        }
        return _.reject(collection, function (field) { return _.contains(fields, field); });
    },

    getControlCmpConfig: function() {
        return {
            xtype: "rallybutton",
            itemId: 'fieldpickerbtn',
            cls: 'field-picker-btn secondary rly-small',
            margin: this.margin,
            iconCls: 'icon-add-column',
            toolTipConfig: {
                html: this.getTitle(),
                anchor: 'top'
            },
            listeners: {
                click: this._onClick,
                scope: this
            }
        };
    },

    _onClick: function(btn) {
        this._createPopover(btn.getEl());
    },

    _getPickerConfig: function() {
        var pickerConfig;

        pickerConfig = _.extend({
            value: _.pluck(this.cmp.getGrid().columns, 'dataIndex').join(','),
            fieldBlackList: this.gridFieldBlackList,
            alwaysSelectedValues: this.gridAlwaysSelectedValues
        }, this.fieldPickerConfig);

        return pickerConfig;
    },

    _createPopover: function(popoverTarget) {
        this.popover = Ext.create('Rally.ui.popover.Popover', {
            target: popoverTarget,
            placement: ['bottom', 'left', 'top', 'right'],
            cls: 'field-picker-popover',
            toFront: Ext.emptyFn,
            buttonAlign: 'center',
            title: this.getTitle(),
            listeners: {
                destroy: function () {
                    this.popover = null;
                },
                scope: this
            },
            buttons: [
                {
                    xtype: "rallybutton",
                    text: 'Apply',
                    cls: 'field-picker-apply-btn primary rly-small',
                    listeners: {
                        click: function() {
                            this._onApply(this.popover);
                        },
                        scope: this
                    }
                },
                {
                    xtype: "rallybutton",
                    text: 'Cancel',
                    cls: 'field-picker-cancel-btn secondary dark rly-small',
                    listeners: {
                        click: function() {
                            this.popover.close();
                        },
                        scope: this
                    }
                }
            ],
            items: [
                _.extend({
                    xtype: 'rallyfieldpicker',
                    cls: 'field-picker',
                    itemId: 'fieldpicker',
                    modelTypes: this._getModelTypes(),
                    alwaysExpanded: true,
                    width: 200,
                    placeholderText: 'Search',
                    selectedTextLabel: 'Selected',
                    availableTextLabel: 'Available',
                    listeners: {
                        specialkey: function(field, e) {
                            if (e.getKey() === e.ESC) {
                                this.popover.close();
                            }
                        },
                        scope: this
                    }
                }, this._getPickerConfig())
            ]
        });
    },

    _getModelTypes: function() {
        return _.pluck(this._getModels(), 'typePath');
    },

    _getModels: function() {
        return _.reduce(this.cmp.getModels(), function(accum, model) {
            if (model.typePath === 'artifact') {
                accum = accum.concat(model.getArtifactComponentModels());
            } else {
                accum.push(model);
            }
            return accum;
        }, []);
    },


    getTitle: function () {
        return 'Show Columns';
    },

    /**
     * Update the fields displayed. In grid mode this will be the columns displayed. In board mode it will be
     * the fields on the cards
     *
     * @param {String[]|Object[]} fields A list of field names to display
     * @param {Boolean} true to suspend store load if it will be triggered elsewhere
     */
    updateFields: function (fields, suspendLoad) {
        this._fields = _.map(fields, function (field) {
            return field.get('name');
        });

        this.cmp.updateFields(this._fields, false, suspendLoad);

        this._updatePickerValue(this._fields);

    },

    _updatePickerValue: function(fields) {
        if (this.popover && this.popover.down('rallyfieldpicker')) {
            this.popover.down('rallyfieldpicker').setValue(this._fields.join(','));
        }
    },

    _onApply: function(popover) {
        var fieldPicker = popover.down('rallyfieldpicker');

        this.updateFields(fieldPicker.getValue());

        popover.close();
    }
});
