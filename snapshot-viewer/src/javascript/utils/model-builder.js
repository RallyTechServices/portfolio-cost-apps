
(function() {
    var Ext = window.Ext4 || window.Ext;

    /**
     * A component that provides similar functionality as a traditional `<select>` input.  It requires a
     * {@link #store} or {@link #storeConfig}, which provides data for the combo box and is configured
     * through the {@link #displayField}, {@link #valueField}, and {@link #queryMode} config options (among others).
     *
     * An example combo box created via its #xtype:
     *
     *     @example
     *     Ext.widget('rallycombobox', {
     *         storeConfig: {
     *             autoLoad: true,
     *             model: 'UserStory'
     *         },
     *         renderTo: Ext.getBody().dom
     *     });
     *
     * A combo box added to a container:
     *
     *     @example
     *     Ext.create('Ext.Container', {
     *         items: [{
     *             xtype: 'rallycombobox',
     *             storeConfig: {
     *                 autoLoad: true,
     *                 model: 'UserStory'
     *             }
     *         }],
     *         renderTo: Ext.getBody().dom
     *     });
     *
     * The ComboBox can be made stateful by setting the {@link #stateful} property to true.  This will
     * use the Ext.state.Stateful mixin to save and restore state based on the {@link #stateId} property.
     * If the {@link #stateful} property is set to true, a unique {@link #stateId} must be provided.
     */
    Ext.define('Rally.ui.combobox.ComboBox', {
        extend: 'Ext.form.field.ComboBox',
        alias: 'widget.rallycombobox',
        requires: [
            'Rally.data.wsapi.Store'
        ],
        mixins: {
            clientMetrics: 'Rally.clientmetrics.ClientMetricsRecordable'
        },

        clientMetrics: [
            {
                endEvent: 'ready',
                description: 'data loaded'
            },
            {
                method: 'onListSelectionChange',
                description: 'combobox value changed'
            },
            {
                event: 'expand',
                description: 'combobox expanded'
            }
        ],

        inheritableStatics: {
            queryDelay: 500
        },

        config: {
            /**
             * @cfg {Boolean} showArrows
             * Determines if the combo box displays arrows to increment/decrement the selected item
             */
            showArrows: false,

            /**
             * @cfg {String} arrowUserAction
             * The client metrics action to record when the value is changed via arrow button
             */
            arrowUserAction: 'Arrow value changed',

            /**
             * @cfg {Boolean} invertArrows
             * Determines which direction to increment/decrement through the bound list
             * default: right arrow click increments the selected index (moves the selection down the dropdown list)
             */
            invertArrows: true,

            /**
             * @cfg {String}
             * @inheritdoc
             */
            componentCls: 'rui-triggerfield',

            /**
             * @cfg {String}
             * @inheritdoc
             */
            overCls: 'combobox-over',

            /**
             * @cfg {String}
             * @inheritdoc
             */
            valueField: '_ref',

            /**
             * @cfg {String}
             * @inheritdoc
             */
            displayField: '_refObjectName',

            /**
             * @cfg {Boolean}
             * @inheritdoc
             */
            matchFieldWidth: false,

            /**
             * @cfg {String}
             * @inheritdoc
             */
            labelSeparator: '',

            /**
             * @cfg {Object}
             * An optional set of configuration properties that will be passed to the Ext.data.Store's constructor.
             * Any configuration that is valid for Store can be included.
             * @cfg {String/Rally.data.Model} storeConfig.model (required)
             */
            storeConfig: { },

            /**
             * @cfg {String}
             * The type of Ext.data.Store to create.
             */
            storeType: 'Rally.data.wsapi.Store',

            /**
             * @cfg {Object}
             * @inheritdoc
             */
            listConfig: {
                loadMask: false,
                emptyText: 'No Items Found',
                deferEmptyText: false,
                hideMode: 'visibility'
            },

            /**
             * @cfg {Boolean}
             * @inheritdoc
             * If set to true, {@link #stateId} must also be specified.
             */
            stateful: false,

            /**
             * @cfg {String}
             * @inheritdoc
             * If {@link #stateful} is set to true, a unique stateId must be provided to identify this component.
             */
            stateId: null,

            /**
             * @private
             * @cfg {String} onChangeUserAction (Optional)
             * The client metrics action to record when the value is changed
             */

            /**
             * @cfg {Boolean}
             * @inheritdoc
             */
            forceSelection: true,

            /**
             * @cfg {String}
             * Set to 'first' or 'last' to select a default record value in the store, any other value will result in no default value being selected.
             */
            defaultSelectionPosition: 'first',

            /**
             * @cfg {Boolean}
             * Automatically show the current value as highlighted in the combobox when it is expanded
             */
            autoSelectCurrentItem: true,

            /**
             * @type {Boolean}
             * Automatically highlight an item when doing typeahead
             */
            autoSelect: true,

            /**
             * @cfg {Boolean}
             * shows boundlist expanded when displayed
             */
            autoExpand: false,

            /**
             * @cfg {Boolean}
             * @inheritdoc
             */
            enableKeyEvents: true,

            /**
             * @cfg {Boolean}
             * Whether this combo box should reload if a scope change happens.
             * The component container must be wired up to cause this to happen.
             */
            shouldRespondToScopeChange: false,

            /**
             * @cfg {Boolean}
             * If true, creates a '-- No Entry --' option in the combobox, with a value of null.
             */
            allowNoEntry: false,

            /**
             * @cfg {String}
             * Text to use for the '-- No Entry --' option.
             */
            noEntryText: '-- No Entry --',

            /**
             * @cfg {String}
             * Value to use for the '-- No Entry --' option.
             */
            noEntryValue: null,

            /**
             * @cfg {Boolean}
             * If true, creates a '-- Clear --' option in the combobox, with a value of ''.
             * Useful if using the combobox as a filter.
             */
            allowClear: false,

            /**
             * @cfg {String}
             * Text to use for the '-- Clear --' option.
             */
            clearText: '-- Clear --',

            /**
             * @cfg {String}
             * Value to use for the '-- Clear --' option.
             */
            clearValue: '',

            /**
             * @cfg {Rally.env.Context/Rally.app.Context}
             * The current context to use
             */
            context: undefined
        },

        constructor: function(config) {
            config = config || {};

            if (config.storeConfig && !config.storeConfig.remoteFilter || config.store && !config.store.remoteFilter) {
                this.queryMode = 'local';
            } else {
                // hack to make 4.2 happy. 4.2 put us in a strange bind where we can't use queryMode local or remote
                // this enables us to use remote query mode (so our filters get added as a query param to wsapi) and enables
                // our query to actually get onto the request
                this.lastQuery = '';
            }

            if(config.multiSelect) {
                config = Ext.merge({
                    cls: 'rally-checkbox-combobox',
                    autoSelect: false,
                    editable: false,
                    defaultSelectionPosition: null,
                    allowClear: false,
                    displayTpl: this._getMultiSelectDisplayTpl(),
                    listConfig: {
                        cls: 'rally-checkbox-boundlist',
                        itemTpl: this._getMultiSelectListItemTpl(),
                        tpl: this._getMultiSelectListItemTpl()
                    }
                }, config);
            }
            console.log('config.listConfig', config.listConfig);
            if (config.listConfig && !config.listConfig.itemTpl) {
                this.listConfig.itemTpl = new Ext.XTemplate('{' + (config.displayField || this.displayField) + ':htmlEncode}');
            }
            // pull 'onChangeUserAction' into listConfig so it renders properly in client metrics
            if (config.onChangeUserAction) {
                Ext.applyIf(config.listConfig, { onChangeUserAction:config.onChangeUserAction });
            }

            this.mergeConfig(config);
            this.callParent([this.config]);

            if (this.originalAutoLoad) {
                this.store.load();
            } else if (this.store.getCount() > 0) {
                this._onStoreLoad(this.store);
                this.setDefaultValue();
                this.onReady();
            }

            var bufferDelay = Ext.isNumber(this.queryDelay) && this.queryDelay > 100 ? this.queryDelay - 100 : 0;
            this._bufferedRecordTypeAction = Ext.Function.createBuffered(this._recordTypeAction, bufferDelay, this);
        },

        initEvents: function() {
            this.callParent(arguments);
            if (!this.editable && this.autoExpand) {
                this.mun(this.inputEl, 'click', this.onTriggerClick, this);
            }
        },

        initComponent: function() {
            var storeListeners;

            this.addEvents(
                /**
                 * @event
                 * Fires when the combobox has been rendered and has its data and an initial value
                 * @param {Rally.ui.combobox.ComboBox} this
                 */
                'ready',


                /**
                 * @event
                 * Fires whenever setValue is called. even if the value is the same
                 */
                'setvalue'
            );

            if (!this.store) {
                // Never pass storeConfig.autoLoad through to buildStore because
                // buildStore will load the store before we can wire up our own load listener
                this.originalAutoLoad = this.storeConfig.autoLoad;
                delete this.storeConfig.autoLoad;

                storeListeners = this.storeConfig.listeners;
                delete this.storeConfig.listeners;
                Ext.applyIf(this.storeConfig, {
                    requester: this
                });

                if(this.context && !this.storeConfig.context) {
                    this.storeConfig.context = this.context.getDataContext();
                }

                this.store = Ext.create(this.storeType, this.storeConfig);
            }

            if (this.stateful) {
                if (!this.stateId) {
                    Ext.Error.raise('When stateful is enabled, you must provide a stateId!');
                }
                this.on('staterestore', this._onStateRestore, this, { single: true });
            }

            this.callParent(arguments);

            this.store.on('load', this._onStoreLoad, this);

            // Separate event because of how TimeBoxComboBox overrides _onStoreLoad and needs to finish before we setDefaultValue
            this.store.on('load', this._setDefaultValueOnLoad, this, {single: true});

            this.store.on('load', function() {
                this.onReady();
            }, this, {single: true});
            this.store.on(storeListeners);

            this.on('boxready', this._onBoxReady, this, {single: true});
            this.on('focus', this._onFocus, this);
            this.on('blur', this._onBlur, this);
            this.on('keyup', this._onKeyUp, this);

            if (this.autoExpand) {
                this.on('focus', this.expand, this);
            }

            if (this.autoSelectCurrentItem) {
                this.on('expand', this._highlightCurrentValue, this);
            }

            if (this.allowClear) {
                this.on('select', this._onSelect, this);
            }
        },

        destroy: function() {
            this.callParent(arguments);
            delete this.config;
            delete this.initialConfig;
        },

        refreshStore: function() {
            this.store.load();
        },

        _setDefaultValueOnLoad: function(store, records, successful) {
            if (successful) {
                this.setDefaultValue();
            }
        },

        /**
         * Return the record for the currently selected value.
         *
         * @return {Rally.data.Model} The record for the currently selected value
         */
        getRecord: function() {
            return this.findRecordByValue(this.getValue());
        },

        onKeyDown: function(e, el) {
            if (!this.editable && e.getKey() === e.BACKSPACE) {
                e.stopEvent();
            }
        },

        onEditorEnter: function(event) {
            if (this.listKeyNav) {
                this.listKeyNav.selectHighlighted(event);
            }
        },

        getPicker: function() {
            var picker = this.callParent(arguments),
                el = this.getEl();
            if(el) {
                var comboBoxWidth = el.down('.' + Ext.baseCSSPrefix + 'form-trigger-input-cell').getWidth() +
                    el.down('.' + Ext.baseCSSPrefix + 'trigger-cell').getWidth();
                picker.minWidth = comboBoxWidth;
            }
            return picker;
        },

        createPicker: function() {
            var picker = this.callParent(arguments);
            this.mon(picker, 'refresh', this._onPickerRefresh, this);
            return picker;
        },

        getDefaultValue: function() {
            // this.originalValue is always set from this.value in Ext.form.field.Field#initValue, and
            // this.value 'might' be cleared out if the store has not loaded yet
            var value;

            if (this._hasValue(this.value) && !_.isNull(this.value)) {
                value = this.value;
            } else if (this._hasValue(this.originalValue)) {
                value = this.originalValue;
            } else if (this._hasValue(this.stateValue)) {
                value = this.stateValue;
            }

            return value;
        },

        _hasValue: function(value) {
            if (_.isArray(value)) {
                return !_.isEmpty(value);
            } else {
                return !_.isUndefined(value);
            }
        },

        getInputTextValue: function() {
            var inputEl = this.getInputElement();
            if (inputEl) {
                return inputEl.dom.value;
            }
        },

        getInputElement: function() {
            return this.inputEl;
        },

        applyState: function(state) {
            this.store.on('load', function() {
                this.setValue(state.value);
                this.saveState();
            }, this, {single: true});
        },

        saveState: function() {
            var id = this.stateful && this.getStateId(),
                hasListeners = this.hasListeners,
                state;

            if (id) {
                state = this.getState() || {};    //pass along for custom interactions
                if (!hasListeners.beforestatesave || this.fireEvent('beforestatesave', this, state) !== false) {

                    //this conditional is the only difference from the stateful mixin save state method
                    // we don't want to save null value for stateful comboboxes
                    if (state.value) {
                        Ext.state.Manager.set(id, state);
                    } else {
                        Ext.state.Manager.clear(id);
                    }

                    if (hasListeners.statesave) {
                        this.fireEvent('statesave', this, state);
                    }
                }
            }
        },

        onReady: function() {
            this.fireEvent('ready', this);
            if (Rally.BrowserTest) {
                Rally.BrowserTest.publishComponentReady(this);
            }
        },

        refreshWithNewContext: function(context) {
            if(this.getShouldRespondToScopeChange()){
                this.context = context;
                if(this.getStore()){
                    this.getStore().context = context.getDataContext();
                    this.getStore().reload();
                }
            }
        },

        /**
         * Override default Field getSubmitData to include null values. Important for saving "No Entry".
         */
        getSubmitData: function(){
            var data = null,
                val;
            if (!this.disabled && this.submitValue && !this.isFileUpload()) {
                val = this.getValue();
                data = {};
                data[this.getName()] = val;
            }
            return data;
        },

        reloadStoreWithNewProject: function(project) {
            this.store.context = this.store.context || {};
            Ext.merge(this.store.context, { project: Rally.util.Ref.getRelativeUri(project) });
            this.store.load();
        },

        setContextFromRecord: function(record) {
            this.reloadStoreWithNewProject(record.get('Project'));
        },

        setDefaultValue: function() {
            var store = this.store,
                defaultValue = this.getDefaultValue(),
                defaultValueToNoEntry;

            if (!store) {
                return;
            }

            // Don't fire change event before load event is propagated.
            this.suspendEvents(true);

            try {
                if (Ext.isDefined(defaultValue) && this.findRecordByValue(defaultValue)) {
                    this.setValue(this.findRecordByValue(defaultValue));
                } else if (Ext.isDefined(defaultValue) && _.isArray(defaultValue) && !_.isEmpty(defaultValue)) {
                    this.setValue(defaultValue);
                } else if (store.getCount()) {
                    if (this.defaultSelectionPosition === 'first') {
                        this.setValue(store.first().get(this.valueField));
                    } else if (this.defaultSelectionPosition === 'last') {
                        this.setValue(store.last().get(this.valueField));
                    }
                }

                defaultValueToNoEntry = this.getAllowNoEntry() &&
                    !this.getValue() &&
                    (this.defaultSelectionPosition === 'first' || this.defaultSelectionPosition === 'last');

                if (defaultValueToNoEntry) {
                    this.setValue(this.store.first());
                }

                if (this.autoSelectCurrentItem) {
                    this._highlightCurrentValue();
                }
            } finally {
                if (this.value && !this.originalValue) {
                    this.resetOriginalValue();
                }
                this.resumeEvents();
            }
        },

        _highlightCurrentValue: function() {
            this._highlightItemByValue(this.getValue());
        },

        _highlightItemByValue: function(value) {
            if (this.picker) {
                var record = this.store.findRecord(this.valueField, value),
                    node = this.picker.getNode(record);

                this.picker.highlightItem(node);
            }
        },

        setValue: function(value) {
            this.callParent(arguments);
            this.fireEvent('setvalue', this, this.getValue());
        },

        setOriginalValue: function(value) {
            this.originalValue = value;
        },

        _onPickerRefresh: function() {
            //var emptyCls = 'rally-empty-boundlist';
            //if (this.store.getRange().length < 1) {
            //    this.picker.addCls(emptyCls);
            //} else {
            //    this.picker.removeCls(emptyCls);
            //}
        },

        _onStateRestore: function(obj, state) {
            this.stateValue = state.value;
        },

        _onStoreLoad: function() {
            if (!this.store) {
                return;
            }
            if (this.getAllowNoEntry()) {
                this._insertNoEntry();
            }
            if (this.getAllowClear()) {
                this._insertClear();
            }
        },

        _insertClear: function() {
            var doesNotHaveClear = this.store.count() === 0 || this.store.getAt(0).get(this.valueField) !== this.clearValue,
            // !this.lastQuery prevents adding noEntry when querying a paged remote store
            // then we can add noEntry when either the text box is empty, or the text is the no entry text
                shouldAddClear = !this.lastQuery || !this.getInputTextValue() || this.getInputTextValue() === this.clearText,
                record;

            if (doesNotHaveClear && shouldAddClear) {
                record = Ext.create(this.store.model);
                record.set(this.displayField, this.clearText);
                record.set(this.valueField, this.clearValue);
                this.store.insert(0, record);
            }
        },

        _insertNoEntry: function() {
            var doesNotHaveNoEntry = this.store.count() === 0 || this.store.getAt(0).get(this.valueField) !== this.noEntryValue,
            // !this.lastQuery prevents adding noEntry when querying a paged remote store
            // then we can add noEntry when either the text box is empty, or the text is the no entry text
                shouldAddNoEntry = !this.lastQuery || !this.getInputTextValue() || this.getInputTextValue() === this.noEntryText,
                record;

            if (doesNotHaveNoEntry && shouldAddNoEntry) {
                record = Ext.create(this.store.model);
                record.set(this.displayField, this.noEntryText);
                record.set(this.valueField, this.noEntryValue);
                this.store.insert(0, record);
            }
        },

        _onBoxReady: function() {
            // ComboBox does not respect maxWidth, is this an ExtJS bug?
            if (this.getWidth() > this.maxWidth) {
                this.setWidth(this.maxWidth);
            }
        },

        _onFocus: function() {
            this.addCls('combobox-focus');
        },

        _onBlur: function() {
            this.removeCls('combobox-focus');

            this._clearValueIfStoreLoading();
        },

        _clearValueIfStoreLoading: function() {
            //Combobox should clear value if blurred away and search text isn't a valid value.
            //But if store is loading, its not clearing value. This fixes that.
            var store = this.getStore();
            var inputEl = this.getInputElement();
            if (this.forceSelection && store && store.isLoading() && !this.findRecordByDisplay(inputEl.dom.value)) {
                inputEl.dom.value = '';
            }
        },

        _onSelect: function() {
            if (this.getValue() === this.clearValue) {
                this.setOriginalValue(undefined);
                this.reset();
            }
        },

        _onKeyUp: function(textField, e) {
            var key = e.getKey();
            if (!e.isSpecialKey() || key === e.BACKSPACE || key === e.DELETE) {
                this._bufferedRecordTypeAction(this);
            }
        },

        _recordTypeAction: function() {
            this.recordAction({
                description: 'text search'
            });
        },

        _getMultiSelectDisplayTpl: function() {
            var me = this;
            return Ext.create('Ext.XTemplate',
                '{[this.getMultiSelectDisplayValue(values)]}',
                {
                    getMultiSelectDisplayValue: function(values) {
                        var firstSelectedItem = _.first(_.pluck(values, me.displayField)),
                            selectedItemCount = _.size(values);

                        if (firstSelectedItem && selectedItemCount > 1) {
                            return Ext.String.format('{0} (+{1})', firstSelectedItem, selectedItemCount - 1);
                        }
                        return firstSelectedItem || '';
                    }
                }
            );
        },

        _getMultiSelectListItemTpl: function() {
            var me = this;
            return Ext.create('Ext.XTemplate',
                '<div class="rally-checkbox-image"></div>',
                '<div class="rally-checkbox-text">{' + me.displayField + ':htmlEncode}</div>'
            );
        }
    });

})();


Ext.define('CArABU.technicalservices.PortfolioSnapshotModelBuilder',{
    singleton: true,

    build: function(modelType, newModelName, snapNames) {
        var deferred = Ext.create('Deft.Deferred');

        Rally.data.ModelFactory.getModel({
            type: modelType,
            success: function (model) {

                var default_fields = Ext.Array.map(snapNames, function(s){
                    return {
                        name: s,
                        type: 'int',
                        defaultValue: 0
                    };
                });

                var new_model = Ext.define(newModelName, {
                    extend: model,
                    logger: new Rally.technicalservices.Logger(),
                    fields: default_fields,

                    updateSnapValues: function(snaps){
                        var oid = this.get('ObjectID');
                        Ext.Array.each(snaps, function(snap){
                            var snapData = CArABU.technicalservices.PortfolioCostApps.toolbox.getSnapshotData(snap),
                                snapName = CArABU.technicalservices.PortfolioCostApps.toolbox.getFriendlyNameFromSnapshot(snap);

                            if (snapData[oid]) {
                                console.log('snaData', snapData[oid]);
                                this.set(snapName, snapData[oid]);
                            }
                        }, this);
                    }
                });
                deferred.resolve(new_model);
            }
        });
        return deferred;
    }
});