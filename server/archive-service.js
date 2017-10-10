/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* UI for merging MARC records
*
* Copyright (C) 2015-2017 University Of Helsinki (The National Library Of Finland)
*
* This file is part of marc-merge-ui
*
* marc-merge-ui program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* oai-pmh-server-backend-module-melinda is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*
* @licend  The above is the entire license notice
* for the JavaScript code in this file.
*
*/

import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import mkdirp from 'mkdirp';
import moment from 'moment';
import { readEnvironmentVariable } from 'server/utils';
import _ from 'lodash';

const defaultArchivePath = path.resolve(__dirname, '..', 'merge-action-archive');
const archivePath = readEnvironmentVariable('ARCHIVE_PATH', defaultArchivePath);
mkdirp.sync(archivePath);

export function createArchive(user, removedRecord, preferredRecord, mergedRecord, unmodifiedRecord, mergedRecordId) {

  return new Promise(function(resolve, reject) {

    const timeStamp = new Date().getTime();
    const removedRecordId = getRecordId(removedRecord.record);
    const preferredRecordId = getRecordId(preferredRecord.record);
    const username = user;
    const date = moment().format();

    const metadata = {
      date,
      username,
      removedRecordId,
      preferredRecordId,
      mergedRecordId
    };

    const filename = `merge-${removedRecordId}-${preferredRecordId}-${mergedRecordId}-${username}-${timeStamp}`;

    const output = fs.createWriteStream(path.resolve(archivePath, `${filename}.zip`));
    const archive = archiver('zip');

    output.on('close', function() {
      resolve({
        filename: `${filename}.zip`,
        size: archive.pointer()
      });
    });

    archive.on('error', function(err) {
      reject(err);
    });

    archive.pipe(output);

    archive
      .append(removedRecord.record.toString(), {name: 'removed.txt'})
      .append(preferredRecord.record.toString(), {name: 'preferred.txt'})
      .append(mergedRecord.record.toString(), {name: 'merged.txt'})
      .append(unmodifiedRecord.record.toString(), {name: 'merged-unmodified.txt'})
      .append(JSON.stringify(metadata), {name: 'meta.json'});


    if (removedRecord.subrecords && removedRecord.subrecords.length) {
      archive.append(removedRecord.subrecords.map(asString).join('\n'), {name: 'removed-subrecords.txt'});
    }
    if (preferredRecord.subrecords && preferredRecord.subrecords.length) {
      archive.append(preferredRecord.subrecords.map(asString).join('\n'), {name: 'preferred-subrecords.txt'});
    }
    if (mergedRecord.subrecords && mergedRecord.subrecords.length) {
      archive.append(mergedRecord.subrecords.map(asString).join('\n'), {name: 'merged-subrecords.txt'});
    }
    if (unmodifiedRecord.subrecords && unmodifiedRecord.subrecords.length) {
      archive.append(unmodifiedRecord.subrecords.map(asString).join('\n'), {name: 'merged-unmodified-subrecords.txt'});
    }
        
    archive.finalize();

  });

}

function asString(record) {
  return record.toString();
}

function getRecordId(record) {
  return _.head(record.fields.filter(field => field.tag === '001').map(field => field.value));
}
