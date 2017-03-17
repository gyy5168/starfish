var _ = require("modules-common/underscore/underscore.js"),
    $ = require("modules-common/jquery/jquery.js"),
    Backbone = require("modules-common/backbone/backbone.js"),
    OrgStructure = require("./org-structure/org-structure.js"),
    DepartmentDetail = require("./department-detail/department-detail.js"),
    SearchPanel = require("./search-panel/search-panel.js"),
    InvitationLink = require("./invitation-link/invitation-link.js"),
    point = require("modules-common/point/point.js"),
    guideView = require("./guide/guide.js");

var View = Backbone.View.extend({

    attributes: {
        class: "contact"
    },

    initialize: function() {
        this.render();
        this.initEvent();
        this.addGuide();
    },

    render: function() {
        this.$el.html(__inline("contact.html"));
        this.modules = {
            orgStructure: new OrgStructure(),
            departmentDetail: new DepartmentDetail(),
            searchPanel: new SearchPanel(),
            invitationLink: new InvitationLink()
        };
        this.$el.append(this.modules.orgStructure.$el);
        this.$el.append(this.modules.departmentDetail.$el);
        this.$el.append(this.modules.searchPanel.$el);
        this.$el.append(this.modules.invitationLink.$el);
    },

    initEvent: function() {
        var that = this;
        this.listenTo(this.modules.orgStructure, 'select', function(model) {
            that.modules.departmentDetail.set(model);
        });

        this.listenTo(this.modules.orgStructure, 'search', function(model) {
            that.modules.departmentDetail.hide();
            that.modules.orgStructure.hide();
            that.modules.searchPanel.show();
            that.modules.searchPanel.set(model);
        });

        this.listenTo(this.modules.searchPanel, 'back', function() {
            that.modules.orgStructure.show();
            that.modules.departmentDetail.show();
            that.modules.searchPanel.hide();
        });

        this.listenTo(global.event, 'orgSwitch orgModify', function() {
            point.shortShow({
                type: "loading",
                text: "组织切换中"
            })
            that.modules.orgStructure.loadRoot();
            that.modules.orgStructure.show();
            that.modules.departmentDetail.showLoading();
            that.modules.searchPanel.hide();
            that.modules.invitationLink.hide();
        })

        this.listenTo(this.modules.orgStructure, "invite-link", function() {
            that.modules.departmentDetail.hide();
            that.modules.orgStructure.hide();
            that.modules.invitationLink.show();
        });

        this.listenTo(this.modules.invitationLink, 'back', function() {
            that.modules.orgStructure.show();
            that.modules.departmentDetail.show();
            that.modules.invitationLink.hide();
        });
    },

    addGuide: function() {
        if (!localStorage.guideList) {
            return;
        }
        var guideArr = localStorage.guideList.split(","),
            currentOrgID=String(global.data.currentOrg.get("id"));

        if(guideArr.indexOf(currentOrgID)>-1){
            guideView.show({
                callback: $.proxy(this.modules.orgStructure.showInviteModal, this)
            });
        }
    },

    show: function() {
        this.$el.show();
    },
    hide: function() {
        this.$el.hide();
    },

    destroy: function() {
        this.remove();
    }
});
module.exports = View
