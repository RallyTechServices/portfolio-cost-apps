
Ext.define('TreeGridContainerCustomFilterControl', {
    alias: 'plugin.treegridcontainercustomfiltercontrol',
    extend:'Rally.ui.gridboard.plugin.GridBoardCustomFilterControl',

    showControl: function() {
        if (!this.controlCmp) {
            this._createControlCmp();
        }

        if (this.controlCmp) {
            this.controlCmp.show();
        }

        return this.controlCmp;
    }
});
