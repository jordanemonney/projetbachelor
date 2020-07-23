/*
 * @license
 * Your First PWA Codelab (https://g.co/codelabs/pwa)
 * Copyright 2019 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License
 */
'use strict';

// CODELAB: Update cache names any time any of the cached files change.
const CACHE_NAME = 'static-cache-v2';

// CODELAB: Add list of files to cache here.
const FILES_TO_CACHE = [
    '/',
    'index.html',
    'json/floors.geojson',
    'json/routes_HFR.geojson',
    'json/maps-crf-hfrnav.json',
    'vendor/jquery/jquery.min.js',
    'scripts/install.min.js',
    'scripts/coreApp.js',
    'scripts/sb-admin-2.js',
    'css/sb-admin-2.css',
    'img/instructions/0_ascenseur_jaune_screen.jpg',
    'img/instructions/0_receptionToascenseur_jaune.jpg',
    'img/instructions/0_receptionToascenseur_vert.jpg',
    'img/instructions/-1_ascenseur_jauneTo_rumatho.jpg',
    'img/instructions/-1_ascenseur_vertTo_rumatho.jpg',
    'img/instructions/1_ascenseur_vertToanesthesie.jpg',
    'img/instructions/-1_ascenseurVerTorumatho_mid.jpg',
    'img/instructions/-1_endparcour_rumatho.jpg',
    'img/instructions/1_midparcour_anesthesie.jpg',
    'img/instructions/1_recAnesthesie.jpg',
    'img/instructions/anesthésie_retour1.jpg',
    'img/instructions/anesthésie_retour2.jpg',
    'img/instructions/anesthésie_retour3.jpg',
    'img/instructions/anesthésie_retour4.jpg',
    'img/instructions/arrived.png',
    'img/instructions/rhumato_retour1.jpg',
    'img/instructions/rhumato_retour2.jpg',
    'img/instructions/rhumato_retour3.jpg',
    'img/instructions/rhumato_retour4.jpg',
    'img/instructions/rhumato_retour5.jpg',
    'img/instructions/rhumato_retour6.jpg',
    'img/instructions/rhumato_retour7.jpg',
    'img/instructions/wait.svg',
    'img/install.svg',
    'img/lift_icon.png',
    'img/logo_hfr.svg',
    'img/Map_pin_icon_green.svg',
    'img/pin.png'
];

self.addEventListener('install', (evt) => {
  //  console.log('[ServiceWorker] Install');
    // CODELAB: Precache static resources here.
    evt.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[ServiceWorker] Pre-caching offline page');
            return cache.addAll(FILES_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
   console.log('[ServiceWorker] Activate');
    // CODELAB: Remove previous cached data from disk.
    evt.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                   // console.log('[ServiceWorker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
    // CODELAB: Add fetch event handler here.
    if (evt.request.url.includes('')) {
        //console.log('[Service Worker] Fetch (data)', evt.request.url);
        evt.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return fetch(evt.request)
                    .then((response) => {
                        // If the response was good, clone it and store it in the cache.
                        if (response.status === 200) {
                            cache.put(evt.request.url, response.clone());
                        }
                        return response;
                    }).catch((err) => {
                        // Network request failed, try to get it from the cache.
                        return  caches.match(evt.request, {ignoreSearch: true})
                    });
            }));
        return;
    }

    evt.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return caches.match(evt.request, {ignoreSearch: true}) //Ignore
                .then((response) => {
                    return response || fetch(evt.request);
                });
        })
    );
});