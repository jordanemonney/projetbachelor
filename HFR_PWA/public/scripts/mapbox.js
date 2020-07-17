    //Global variable
    let marker;
    let mapArray = [];
    let pointArray = [];
    let adjNodeArray = {};
    let markerArray = [];
    let path = [];
    let destination;
    let floor;
    let userPosition = {name: "name", rssi: -200};

    function initMap() {
            fetch('json/floors.geojson', {
                method: 'GET', // *GET, POST, PUT, DELETE, etc.
                mode: 'no-cors', // no-cors, *cors, same-origin
                cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
                credentials: 'same-origin', // include, *same-origin, omit
                headers: {
                    'Accept': 'application/json'
                }
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`Network response was not ok ${response.statusText}`);
                    }
                    return response.json();
                })
                .then((myJson) => startMap(myJson))
                .catch((error) => alert(error));
        }

        function startMap(myJson) {
            mapArray = myJson.collectionFloors;
            console.log(mapArray);
            floor = mapArray[0].name;
            map.on('load', function () {
                map.addSource('floors', {
                    'type': 'geojson',
                    'data': mapArray[0]
                });
                map.addLayer({
                    'id': 'floors',
                    'type': 'fill',
                    'source': 'floors',
                    'layout': {},
                    'paint': {
                        'fill-color': '#b7b7b7',
                        'fill-opacity': 0.8
                    }
                });
            });
            getLocalisationPoint();
        }

        //If the user go in another floor the map show the new map
        function newMap(floorID) {
            map.removeLayer('floors');
            map.removeSource('floors');

            map.addSource('floors', {
                'type': 'geojson',
                'data': mapArray[floorID]
            });
            map.addLayer({
                'id': 'floors',
                'type': 'fill',
                'source': 'floors',
                'layout': {},
                'paint': {
                    'fill-color': '#b7b7b7',
                    'fill-opacity': 0.8
                }
            });
        }

        function matchBeaconWithPoint(beacon) {
            for (let i = 0; i < pointArray.length; i++) {
                if (beacon.beaconName === pointArray[i].properties.beaconName) {
                    userLocation(pointArray[i]);
                }
            }
        }

        //Get the new user position if the nearest beacon has change
        function userLocation(ActualPosition) {
            //Check if the floor has change
            if (floor !== ActualPosition.properties.floor) {
                floor = ActualPosition.properties.floor;
                for (let i = 0; i < mapArray.length; i++) {
                    if (floor === mapArray[i].name) {
                        //Draw new floor map
                        newMap(i);
                    }
                }
            }
            //If the destination and the user is on the same floor
            if (ActualPosition.properties.floor === destination.properties.floor) {
                MarkDestination();
            }

            //Remove old position
            if (typeof (marker) != "undefined") {
                marker.remove();
            }
            //Change bearing orientation

            //Mark new position
            marker = new mapboxgl.Marker()
                .setLngLat([ActualPosition.geometry.coordinates[0], ActualPosition.geometry.coordinates[1]])
                .addTo(map);

            //Delete all actual road
            if (markerArray.length !== 0) {
                deleteAllRoute();
            }
            //Check if the user is arrived to the destination
            if (ActualPosition.properties.name === destination.properties.name) {
                isArrived(ActualPosition);
                return;
            }
            if (markerArray.length === 0) {
                createRoute(ActualPosition);
            }
        }

        function drawRoute(start, end, iterator) {
            markerArray[iterator] = map.addSource('route' + iterator, {
                'type': 'geojson',
                'data': {
                    'type': 'Feature',
                    'properties': {},
                    'geometry': {
                        'type': 'LineString',
                        'coordinates': [
                            [start.geometry.coordinates[0], start.geometry.coordinates[1]],
                            [end.geometry.coordinates[0], end.geometry.coordinates[1]]
                        ]
                    }
                }
            });
            map.addLayer({
                'id': 'route' + iterator,
                'type': 'line',
                'source': 'route' + iterator,
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'paint': {
                    'line-color': '#1367af',
                    'line-width': 4
                }
            });
        }

        function drawInstruction(start, end) {
            let instruction = {};
            for (let i = 0; i < start.properties.pointsAdj.length; i++) {
                if (start.properties.pointsAdj[i].name === end) {
                    instruction = start.properties.pointsAdj[i].instructions;
                    console.log("this is end", start.properties.pointsAdj[i].instructions);
                }
            }
            //Add text instruction
            let textArea = $('.instructionText');
            textArea.text(instruction.voice);
            console.log(textArea);
            //Add img instruction
            let photoArea = $('.instructionPhoto');
            let img = $('#imgInstru');
            if (img !== undefined) {
                img.remove();
            }
            photoArea.prepend('<img id="imgInstru" alt="instruction" src="img/instructions/' + instruction.image + '" />');
            //Say the instruction to the user
            //responsiveVoice.speak("hello world");
        }

        function drawInstructionOnMap(start, bearing) {
            //Draw position and draw bearing
            map.flyTo({center: start.geometry.coordinates, zoom: 18, bearing: bearing});
        }

        function deleteAllRoute() {
            for (let i = 0; i < markerArray.length; i++) {
                map.removeLayer('route' + i);
                map.removeSource('route' + i);
            }
            markerArray = [];
        }

        //Get all point to find the reachable point
        function getLocalisationPoint() {
            // noinspection JSDeprecatedSymbols
            let language = window.navigator.userLanguage || window.navigator.language;
            console.log(language);
            let routes;
            if (language != "fr-FR") {
                routes = 'json/routes_HFR_DE.geojson';
            } else {
                routes = 'json/routes_HFR.geojson';
            }

            fetch("json/routes_HFR.geojson", {
                method: 'GET', // *GET, POST, PUT, DELETE, etc.
                mode: 'no-cors', // no-cors, *cors, same-origin
                cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
                credentials: 'same-origin', // include, *same-origin, omit
                headers: {
                    'Accept': 'application/json'
                }
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`Network response was not ok ${response.statusText}`);
                    }
                    return response.json();
                })
                .then((myJson) => parseGeoRoute(myJson))
                .catch((error) => alert(error));
        }

        //Init the item in the selectable list
        function parseGeoRoute(myJson) {
            pointArray = myJson.features;
            for (let i = 0; i < pointArray.length; i++) {
                if (pointArray[i].properties.reachable) {
                    let clonePoint = $('.dropdown-menu:first').find('.dropdown-item:first').clone(true);
                    clonePoint.text(pointArray[i].properties.name);
                    clonePoint.removeClass("hide");
                    clonePoint.attr('href', "?id=" + pointArray[i].properties.url);
                    clonePoint.appendTo(".dropdown-menu");
                }
                //makeLinkBetweenNodeJs(pointArray[i]);
                makeLinkBetweenNode(pointArray[i]);
            }
            checkUriRoute(pointArray);
        }

        //If url is already linked with a route, the app start direct the route calculation
        function checkUriRoute(PointArray) {
            let parser = document.createElement('a');
            const regex = /=(.*)/; //Take all element after the =
            parser.href = window.location.href;
            if (parser.search !== "") {
                let param = parser.search.match(regex);
                // console.log("salut", param);
                for (let i = 0; i < PointArray.length; i++) {
                    if (param[1] === PointArray[i].properties.url) {
                        destination = PointArray[i];
                    }
                }
                //Change button text
                changeSelectButton();
            }
        }

        function MarkDestination() {
            let el = document.createElement('div');
            el.className = 'marker';
            // noinspection JSUnresolvedFunction,JSUnresolvedFunction
            new mapboxgl.Marker(el)
                .setLngLat([destination.geometry.coordinates[0], destination.geometry.coordinates[1]])
                .addTo(map);
        }

        //Make link between points & link between instruction
        function makeLinkBetweenNode(node) {
            let temp = {};
            for (let i = 0; i < node.properties.pointsAdj.length; i++) {
                temp[node.properties.pointsAdj[i].name] = node.properties.pointsAdj[i].distance;
            }
            adjNodeArray[node.properties.name] = temp;
            console.log(adjNodeArray);
        }

        function createRoute(start) {
            //Get the path to generate
            if (path.length == 0 || start.properties.name !== path[0]) {
                path = findShortestPath(start.properties.name, destination.properties.name).path;
            }
            let endNode;

            console.log("This is path", path);
            let firstNode = start;
            for (let i = 0; i < path.length; i++) {
                for (let j = 0; j < pointArray.length; j++) {
                    if (path[i] === pointArray[j].properties.name) {
                        //If the floor of the dest and the currentfloor aren't the same
                        if (start.properties.floor === pointArray[j].properties.floor)
                            drawRoute(firstNode, pointArray[j], i);
                        firstNode = pointArray[j];
                    }
                }
            }

            for (let i = 0; i < pointArray.length; i++) {
                if (path[1] === pointArray[i].properties.name) {
                    endNode = pointArray[i];
                }
            }

            //Calcul bearing performance
            var t0 = performance.now();
            let bearing = calculBearing(start, endNode);
            var t1 = performance.now();
            console.log('Took', (t1 - t0), 'milliseconds to generate with javascript:', bearing);

            //
            //Calcul bearing
            //
            //Draw Instruction
            drawInstruction(start, path[1]);
            //Draw Instruction on map
            drawInstructionOnMap(start, bearing);
            //Delete the first element of the path array
            path.shift();
        }

        function changeSelectButton() {
            if (destination !== undefined) {
                let btnSelect = $('#dropdownMenuLink');
                btnSelect.text(destination.properties.name);
                btnSelect.css({"background-color": "#0d68ae", "border-color": "#0d68ae"});

                let btnStart = $('#btnStart');
                btnStart.css({"background-color": "#64dd17", "border-color": "#64dd17"});
            }
        }

        //If the user is arrived
        function isArrived(actualPosition) {
            map.flyTo({center: actualPosition.geometry.coordinates, zoom: 18, bearing: 0});
            stop_scan();
            //Add text instruction
            let textArea = $('.instructionText');
            textArea.text("Vous êtes arrivé(e), merci d'avoir utilisé notre application");
            console.log(textArea);
            //Add img instruction
            let photoArea = $('.instructionPhoto');
            let img = $('#imgInstru');
            if (img !== undefined) {
                img.remove();
            }
            photoArea.prepend('<img id="imgArrived" alt="Arrivé" src="img/Map_pin_icon_green.svg" />');
            $('#imgArrived').css({"width": "auto"});
        }

        function calculBearing(start, nextDestination) {
            let latStart = start.geometry.coordinates[1];
            let lngStart = start.geometry.coordinates[0];

            let latEnd = nextDestination.geometry.coordinates[1];
            let lngEnd = nextDestination.geometry.coordinates[0];

            let dLon = lngEnd - lngStart;
            let y = Math.sin(dLon) * Math.cos(latEnd);
            let x = Math.cos(latStart) * Math.sin(latEnd) - Math.sin(latStart) * Math.cos(latEnd) * Math.cos(dLon);
            let brng = Math.atan2(y, x);
            let brngDegr = brng * (180 / Math.PI);
            let result = (360 - ((brngDegr + 360) % 360));
            console.log("This calcul result", result);
            return result;
        }

        function calculBearingWithWasm(start, nextDestination) {
            let calculBearing = Module.cwrap('calcBearing', 'number', ['number', 'number', 'number', 'number']);
            return calculBearing(start.geometry.coordinates[0], start.geometry.coordinates[1], nextDestination.geometry.coordinates[0], nextDestination.geometry.coordinates[1]);
        }

        //--------------------------Djikstra...............................//

        let shortestDistanceNode = (distances, visited) => {
            let shortest = null;

            for (let node in distances) {
                let currentIsShortest =
                    shortest === null || distances[node] < distances[shortest];
                if (currentIsShortest && !visited.includes(node)) {
                    shortest = node;
                }
            }
            return shortest;
        };

        function findShortestPath(startNode, endNode) {
            let graph = adjNodeArray;
            //let endNode = destination;
            // establish object for recording distances from the start node
            let distances = {};
            distances[endNode] = "Infinity";
            distances = Object.assign(distances, graph[startNode]);

            // track paths
            let parents = {endNode: null};
            for (let child in graph[startNode]) {
                parents[child] = startNode;
            }

            // track nodes that have already been visited
            let visited = [];

            // find the nearest node
            let node = shortestDistanceNode(distances, visited);

            // for that node
            while (node) {
                // find its distance from the start node & its child nodes
                let distance = distances[node];
                let children = graph[node];
                // for each of those child nodes
                for (let child in children) {
                    // make sure each child node is not the start node
                    if (String(child) === String(startNode)) {
                    } else {
                        // save the distance from the start node to the child node
                        let newdistance = distance + children[child];
                        // if there's no recorded distance from the start node to the child node in the distances object
                        // or if the recorded distance is shorter than the previously stored distance from the start node to the child node
                        // save the distance to the object
                        // record the path
                        if (!distances[child] || distances[child] > newdistance) {
                            distances[child] = newdistance;
                            parents[child] = node;
                        }
                    }
                }
                // move the node to the visited set
                visited.push(node);
                // move to the nearest neighbor node
                node = shortestDistanceNode(distances, visited);
            }

            // using the stored paths from start node to end node
            // record the shortest path
            let shortestPath = [endNode];
            let parent = parents[endNode];
            while (parent) {
                shortestPath.push(parent);
                parent = parents[parent];
            }
            shortestPath.reverse();

            // return the shortest path from start node to end node & its distance
            //console.log(results);
            return {
                distance: distances[endNode],
                path: shortestPath,
            };
        }

        //------------------------------------------------------ Bluetooth--------------------------------------------//
        function start_scan() {

            if (destination !== undefined) {
                $('#btnStart').attr("onclick", ""); //Stop bouton go action
                writeInstruction();
                window.scrollTo(0, document.body.scrollHeight);
                let beaconJsonInfo = getBeaconInfo();
                navigator.bluetooth.requestLEScan({acceptAllAdvertisements: true}).then(function (result) {
                    scan = result
                });
                let counter = 0;
                let procheBeacon = [];
                let beaconArray = [];
                navigator.bluetooth.addEventListener('advertisementreceived', event => {
                    if (event.name != null) {
                        if (event.name.includes("Kontakt")) {
                            counter++;
                            let beaconPresence = false; //If this beacon is not  already in the array
                            let beacon = {name: event.device.name, rssi: event.rssi};
                            for (let i = 0; i < beaconArray.length; i++) {
                                if (beaconArray[i].name === event.device.name) {
                                    beaconArray[i].rssi = event.rssi; //Update RSSI value
                                    beaconPresence = true; //If there is already a beacon in the array
                                    break;
                                }
                            }
                            if (beaconPresence === false) {
                                beaconArray.push(beacon);
                            }
                            console.log(event);
                            let nearestBeacon = checkNearestBeacon(beaconArray);
                            procheBeacon[counter] = nearestBeacon.name;
                        }
                    }
                    if (counter === 5) {
                        matchNewPosition(slidingWindow(procheBeacon), beaconArray, beaconJsonInfo);
                        counter = 0;
                    }
                });
            }
        }

        function slidingWindow(procheBeacon) {
            let counts = {};
            for (let i = 0; i < procheBeacon.length; i++) {
                let beac = procheBeacon[i];
                counts[beac] = counts[beac] ? counts[beac] + 1 : 1;
            }
            let biggestValue = 0;
            let biggestKey;
            for (let key in counts) {
                if (key !== undefined && counts[key] > biggestValue) {
                    biggestKey = key;
                    biggestValue = counts[key];
                }
            }
            console.log(biggestKey);
            return biggestKey;
        }

        function checkNearestBeacon(beaconArray) {
            let tempBeacon = {name: "name", rssi: -200};
            for (let i = 0; i < beaconArray.length; i++) {
                if (beaconArray[i].rssi > tempBeacon.rssi && beaconArray[i].name !== tempBeacon.name) {
                    tempBeacon = beaconArray[i];
                }
            }
            return tempBeacon;
        }

        function matchNewPosition(key, beaconArray) {
            for (let i = 0; i < beaconArray.length; i++) {
                if (beaconArray[i].name === key && userPosition.name) {
                    sendNewPosition(beaconArray[i]);
                }
            }
        }

        function sendNewPosition(nearestBeacon) {
            for (let i = 0; i < beaconJsonInfo.length; i++) {
                if (nearestBeacon.name === beaconJsonInfo[i].beaconName && userPosition.name !== nearestBeacon.name) {
                    userPosition = nearestBeacon;
                    matchBeaconWithPoint(beaconJsonInfo[i]);
                    //console.log("It's a match", beaconJsonInfo[i].beaconID);
                }
            }
            console.log("this is the nearest beacon : ", nearestBeacon);
        }

        function getBeaconInfo() {
            fetch('json/maps-crf-hfrnav.json', {
                method: 'GET', // *GET, POST, PUT, DELETE, etc.
                mode: 'no-cors', // no-cors, *cors, same-origin
                cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
                credentials: 'same-origin', // include, *same-origin, omit
                headers: {
                    'Accept': 'application/json'
                }
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`Network response was not ok ${response.statusText}`);
                    }
                    return response.json();
                })
                .then((BeaconJson) => parseJsonInfo(BeaconJson))
                .catch((error) => alert(error));
        }

        function parseJsonInfo(BeaconJson) {
            // noinspection JSDeprecatedSymbols
            beaconJsonInfo = BeaconJson.anchors;
            console.log(beaconJsonInfo);
        }

        function stop_scan() {
            scan.stop();
            clearInterval();
            console.log(JSON.stringify(scan));
            console.log(scan.active);
            $('#btnStart').attr("onclick", "start_scan()"); //Reinit go button
        }

        function writeInstruction() {
            //Add text instruction
            let textArea = $('.instructionText');
            textArea.text("Localisation en cours...");
            let img = $('.instructionPhoto img');
            if (img !== undefined) {
                img.remove();
            }
            //Add img instruction
            let photoArea = $('.instructionPhoto');
            photoArea.prepend('<img id="imgInstru" alt="Please wait" src="img/instructions/wait.svg" />');
        }
