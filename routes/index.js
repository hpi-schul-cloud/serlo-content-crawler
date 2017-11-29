const express = require('express');
const router = express.Router();
const http = require('http');
const rpn = require('request-promise-native');

const _filter = require('lodash').filter;

/*
 * Base- and Export URL and ContentTypes
 * see: https://github.com/serlo-org/athene2-guide/wiki/Feed-Api-(RSS-JSON)
 */
const BASE_URL = 'https://de.serlo.org';
const EXPORT_URL = BASE_URL + '/entity/api/json/export/';
const CONTENT_TYPES = ['course', 'article', 'video', 'text-exercise'];

//
const LOCAL_CONTENT = {
    "course": require('../sample-content/export-course.json'),
    "article": require('../sample-content/export-article.json'),
    "video": require('../sample-content/export-video.json'),
    "text-exercise": require('../sample-content/export-text-exercise.json'),
};

//
let contentTypes = CONTENT_TYPES.map(x => {
    return {
        contentType: x,
        url: EXPORT_URL + x,
        content: LOCAL_CONTENT[x]
    }
});

/**
 *
 */
router.get('/', function (req, res, next) {
    let parsedItems = [].concat.apply([], contentTypes.map(x => x.content.map(contentItem => parseSerloItem(contentItem, x.contentType))));

    // Max. 50 Sockets
    const httpAgent = new http.Agent();
    httpAgent.maxSockets = 50;

    // Create Post-Requests Resources to Server
    let requestPromises = parsedItems.map(parsedItem => {
        return rpn({
            method: 'POST',
            uri: process.env.CONTENT_URL,
            json: parsedItem,
            resolveWithFullResponse: true,
            auth: {
                user: process.env.CONTENT_USER,
                pass: process.env.CONTENT_PASSWORD
            },
            pool: httpAgent,
            timeout: 15000,
            time: true
        }).catch(err => console.log(err));
    });

    const toResultObject = (promise) => {
        return promise
            .then(request => ({success: true, request}))
            .catch(request => ({success: false, request}));
    };

    // Send Requests
    Promise.all(requestPromises.map(toResultObject)).then(resultObjects => {
        let successful = _filter(resultObjects, {success: true});
        let failed = _filter(resultObjects, {success: false});
        res.send({
            successful: {
                count: successful.length,
            },
            failed: {
                count: failed.length,
            }
        });
    }).catch(request => {
        console.log(request);
    });
});

/**
 *
 * @param serloItem
 * @param contentType
 */
function parseSerloItem(serloItem, contentType) {

    let tags = Object.values(serloItem.keywords);
    let subject = null;
    if(serloItem.hasOwnProperty('categories') && serloItem.categories.length > 0) {
        subject = serloItem.categories[0].substr(0, serloItem.categories[0].indexOf('/'));
    }

   return {
       originId: serloItem.guid,
       providerName: "Serlo",

       url: BASE_URL + serloItem.link,
       title: String(serloItem.title),
       description: serloItem.description || "No Description",
       thumbnail: 'https://handbuch.tib.eu/w/images/6/6b/Serlo.png',

       contentCategory: 'atomic',
       subject: subject,
       tags: tags,
       mimeType: 'text/html',
       licenses: ['https://creativecommons.org/licenses/by-sa/4.0/'],

   }
}

module.exports = router;
