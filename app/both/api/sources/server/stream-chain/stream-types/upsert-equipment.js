import includes from 'lodash/includes';
import keyBy from 'lodash/keyBy';
import { Meteor } from 'meteor/meteor';

import { EquipmentInfos } from '../../../../../api/equipment-infos/equipment-infos';
import { PlaceInfos } from '../../../../../api/place-infos/place-infos';

import Upsert from './upsert';

import takeEquipmentSnapshotForSourceId from '../../../../equipment-status-samples/takeEquipmentSnapshot';
import recordStatusChanges from '../../../../equipment-status-samples/recordStatusChanges';

export default class UpsertEquipmentInfo extends Upsert {
  constructor(options) {
    super(options);
    this.stream.unitName = 'equipment infos';
    this.equipmentInfosBeforeImport = takeEquipmentSnapshotForSourceId(options.sourceId);
  }

  // Associate the equipment information with a place data source, if possible

  postProcessBeforeUpserting(doc, { organizationSourceIds, organizationName }) {
    const result = super.postProcessBeforeUpserting(doc, { organizationSourceIds, organizationName });

    const properties = result.properties;
    if (!properties) return result;

    properties.lastUpdate = new Date().toISOString();

    const placeSourceId = properties.placeSourceId;

    if (placeSourceId) {
      // For now, we allow to associate equipment with any place info. Theoretically this could be
      // prevented with this code:
      // if (!includes(organizationSourceIds, placeSourceId)) {
      //   const message = `Not authorized: placeSourceId must refer to a data source by ${organizationName}`;
      //   throw new Meteor.Error(401, message);
      // }
      if (properties.originalPlaceInfoId) {
        const originalPlaceInfoIdField = properties.originalPlaceInfoIdField || 'properties.originalId';
        const selector = { 'properties.sourceId': placeSourceId, [originalPlaceInfoIdField]: properties.originalPlaceInfoId };
        const options = { transform: null, fields: { _id: true, geometry: true, 'properties.name': true } };
        const placeInfo = PlaceInfos.findOne(selector, options);
        if (placeInfo) {
          console.log(`Will associate PlaceInfo ${placeInfo._id} for EquipmentInfo ${result._id}.`);
          result.properties.placeInfoId = placeInfo._id;
          const localizedPlaceInfoName = placeInfo.properties.name;
          const placeInfoName = typeof localizedPlaceInfoName === 'string' ? localizedPlaceInfoName : (localizedPlaceInfoName.en || localizedPlaceInfoName[Object.keys(localizedPlaceInfoName)[0]]);
          result.properties.placeInfoName = placeInfoName;
          result.geometry = result.geometry || placeInfo.geometry;
        } else {
          console.log(`Could not find PlaceInfo ${selector} for EquipmentInfo ${result._id}...`);
        }
      }
    }
    return result;
  }

  afterFlush({ organizationSourceIds, organization, source }, callback) {  // eslint-disable-line class-methods-use-this
    const equipmentInfosAfterImport = takeEquipmentSnapshotForSourceId(this.options.sourceId);
    recordStatusChanges({
      equipmentInfosAfterImport,
      source,
      organization,
      sourceImportId: this.options.sourceImportId,
      equipmentInfosBeforeImport: this.equipmentInfosBeforeImport,
    });
    delete this.equipmentInfosBeforeImport;
    super.afterFlush({ organizationSourceIds }, callback);
  }
}

UpsertEquipmentInfo.collection = EquipmentInfos;

