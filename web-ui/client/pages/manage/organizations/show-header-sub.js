import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Organizations } from '/both/api/organizations/organizations.js';
import { Licenses } from '/both/api/licenses/licenses.js';
import { Apps } from '/both/api/apps/apps.js';

import subsManager from '/client/lib/subs-manager';

Template.organizations_show_header_sub.onCreated(() => {
  subsManager.subscribe('manage-subscriptions-for-current-user');
  subsManager.subscribe('licenses.public');
});


Template.organizations_show_header_sub.helpers({
  activeIfRouteNameIs(routeName) {
    return routeName === FlowRouter._current.route.name ? 'active' : '';
  },
  activeIfRouteNameMatches(regex) {
    const currentRouteName = FlowRouter._current.route.name;
    return currentRouteName.match(regex) ? 'active' : '';
  },
  organization() {
    if (FlowRouter._current.route.name.startsWith('manage.organizations.')) {
      const organizationId = FlowRouter.getParam('_id');
      return Organizations.findOne({ _id: organizationId });
    }

    if (FlowRouter._current.route.name.startsWith('manage.apps.')) {

      const appId = FlowRouter.getParam('_id');
      const app = Apps.findOne({ _id: appId });
      if (app) {
        return Organizations.findOne({ _id: app.organizationId });
      }
    }

    if (FlowRouter._current.route.name.startsWith('manage.licenses.')) {
      const licenseId = FlowRouter.getParam('_id');
      const license = Licenses.findOne({ _id: licenseId });
      if (license) {
        return Organizations.findOne({ _id: license.organizationId });
      }
    }

    return {};

  },
});
