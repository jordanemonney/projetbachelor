    $( document ).ready(function() {
    let marker;
    let mapArray = [];
    let pointArray = [];
    let adjNodeArray = {};
    let markerArray = [];
    let path = [];
    let destination;
    let floor;
    let userPosition = {name: "name", rssi: -200};

    //Start procedure -> Init of the map when doc is loaded
    let bounds = [
        [7.135589, 46.799919], // Southwest coordinates
        [7.142029, 46.806347] // Northeast coordinates
    ];
    mapboxgl.accessToken = 'pk.eyJ1IjoicHM2bmF2IiwiYSI6ImNrN3hyaGt6dTAwYmQzb28zdTY2OWxibWQifQ.UkpxlSM91GWp8cJVBigLtw';
    let map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [7.137661, 46.801608],
        maxBounds: bounds, // Sets bounds as max
        zoom: 16
    });
    init();

    //-------------------------------------Data-------------------------------//
    /**
     * Initialisation of the map
     * Initialisation of service worker
     * Fetch the floor map
     */
    function init() {
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

    /**
     * When the floor arw draw, fetch the point data
     */
    function getLocalisationPoint() {
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

    /**
     * Get the JSON file where theres is the beacon attributs information
     */
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

    //-------------------------------------Draw function--------------------------------//

    /**
     * Draw the floor 0 and after that call the method that fetch the route
     * @param myJson
     */
    function startMap(myJson) {
        mapArray = myJson.collectionFloors;
        //console.log(mapArray);
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

    /**
     * Parse json route
     * Draw the reacahble point
     * Make the link between the for dijkstra algorithme
     * @param myJson: Route data
     */
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
            makeLinkBetweenNode(pointArray[i]);
        }
        checkUriRoute(pointArray);
    }

    /**
     * Remove old floor drawing and write the new floor
     * @param floorID new user floor position
     */
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

    /**
     * Draw route
     * @param start of the route
     * @param end of the route
     * @param iterator the id of the portion of the route
     */
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

    /**
     * Draw instruction on the screen
     * @param start: actual point
     * @param end: next point
     */
    function drawInstruction(start, end) {
        let instruction = {};
        for (let i = 0; i < start.properties.pointsAdj.length; i++) {
            if (start.properties.pointsAdj[i].name === end) {
                instruction = start.properties.pointsAdj[i].instructions;
                //console.log("this is end", start.properties.pointsAdj[i].instructions);
            }
        }
        //Add text instruction
        let textArea = $('.instructionText p');
        textArea.text(instruction.voice);
        //Add img instruction
        let photoArea = $('.instructionPhoto');
        let img = $('#imgInstru');
        if (img !== undefined) {
            img.remove();
        }
        photoArea.prepend('<img id="imgInstru" alt="instruction" src="img/instructions/' + instruction.image + '" />');
    }

    /**
     * Draw map instruction and apply bearing
     * @param position
     * @param bearing
     */
    function drawInstructionOnMap(position, bearing) {
        //Draw position and draw bearing
        map.flyTo({center: position.geometry.coordinates, zoom: 18, bearing: bearing});
    }

    /**
     * Delete all route when the user is on a new position
     */
    function deleteAllRoute() {
        for (let i = 0; i < markerArray.length; i++) {
            map.removeLayer('route' + i);
            map.removeSource('route' + i);
        }
        markerArray = [];
    }

    /**
     * Draw the destination marker
     * @constructor
     */
    function MarkDestination() {
        let el = document.createElement('div');
        el.className = 'marker';
        // noinspection JSUnresolvedFunction,JSUnresolvedFunction
        new mapboxgl.Marker(el)
            .setLngLat([destination.geometry.coordinates[0], destination.geometry.coordinates[1]])
            .addTo(map);
    }

    /**
     * Check if the user is arrived to his destination
     * If is arrived the scan is stop and the special arrived instruction are draw  .
     * @param actualPosition
     */
    function isArrived(actualPosition) {
        map.flyTo({center: actualPosition.geometry.coordinates, zoom: 18, bearing: 0});
        stop_scan();
        //Add text instruction
        let textArea = $('.instructionText p');
        textArea.text("Vous êtes arrivé(e), merci d'avoir utilisé notre application");
        //Add img instruction
        let photoArea = $('.instructionPhoto');
        let img = $('#imgInstru');
        if (img !== undefined) {
            img.remove();
        }
        photoArea.prepend('<img id="imgArrived" alt="Arrivé" src="img/Map_pin_icon_green.svg" />');
        $('#imgArrived').css({"width": "auto"});
    }

    /**
     * When the user start the scan, this method show that the procedure has begun
     */
    function writeBufferInstruction() {
        //Add text instruction
        let textArea = $('.instructionText p');
        textArea.text("Localisation en cours...");
        let img = $('.instructionPhoto img');
        if (img !== undefined) {
            img.remove();
        }
        //Add img instruction
        let photoArea = $('.instructionPhoto');
        photoArea.prepend('<img id="imgInstru" alt="Please wait" src="img/instructions/wait.svg" />');
    }

    //--------Information.........//

    /**
     * Hide application and show information
     */
    $(".infoActive").click(function () {
        $('.rowInfo').removeClass("hide");
        $('.rowApp').addClass("hide");
    });
    /**
     * Hide information and show application
     */
    $(".infoDeactive").click(function () {
        $('.rowApp').removeClass("hide");
        $('.rowInfo').addClass("hide");
    });

    //------------------------------------Controller---------------------------//
     /**
     * Match the nearest beacon with his emplacement in the building
     * @param beacon
     */
    function matchBeaconWithPoint(beacon) {
            for (let i = 0; i < pointArray.length; i++) {
                if (beacon.beaconName === pointArray[i].properties.beaconName) {
                    userLocation(pointArray[i]);
                }
            }
        }

    /**
     * Check if the user is in a new floor
     * Check if the user position is the same as the destination position
     * Remove and Draw the new position of the user
     * Delete old path in the map
     * Check if the user is arrived to his destination
     * Write the new path in the map
     * @param ActualPosition
     */
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

    /**
     * Check if there is a param in the url and set the navigation buttons
     * @param PointArray
     */
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
                changeNavigationButton();
            }
        }

    /**
     * Make the link between the node for dijkstra
     * @param node
     */
        function makeLinkBetweenNode(node) {
            let temp = {};
            for (let i = 0; i < node.properties.pointsAdj.length; i++) {
                temp[node.properties.pointsAdj[i].name] = node.properties.pointsAdj[i].distance;
            }
            adjNodeArray[node.properties.name] = temp;
        }

    /**
     * Create route between the start position to the desination
     * Calcul the bearing between the position of the user and the next point
     * Draw instruction between the position of the user and the next point
     * @param start position
     */
    function createRoute(start) {
            //Get the path to generate
            if (path.length === 0 || start.properties.name !== path[0]) {
                path = findShortestPath(start.properties.name, destination.properties.name).path;
            }
            let endNode;

            //console.log("This is path", path);
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
           // var t0 = performance.now();
            let bearing = calculBearing(start, endNode);
            //var t1 = performance.now();

            //Draw Instruction
            drawInstruction(start, path[1]);
            //Draw Instruction on map
            drawInstructionOnMap(start, bearing);
            //Delete the first element of the path array
            path.shift();
        }

    /**
     * Change navigation button when a destination is found
     */
    function changeNavigationButton() {
            if (destination !== undefined) {
                let btnSelect = $('#dropdownMenuLink');
                btnSelect.text(destination.properties.name);
                btnSelect.css({"background-color": "#0d68ae", "border-color": "#0d68ae"});

                let btnStart = $('#btnStart');
                btnStart.css({"background-color": "#64dd17", "border-color": "#64dd17"});
            }
        }

    /**
     * Calcul the bearing between two point
     * @param start
     * @param nextDestination
     * @returns {number}
     */
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
            return (360 - ((brngDegr + 360) % 360));
        }

    /**
     * Calcul the bearing two point with wasm
     * @param start
     * @param nextDestination
     */
        function calculBearingWithWasm(start, nextDestination) {
            let calculBearing = Module.cwrap('calcBearing', 'number', ['number', 'number', 'number', 'number']);
            return calculBearing(start.geometry.coordinates[0], start.geometry.coordinates[1], nextDestination.geometry.coordinates[0], nextDestination.geometry.coordinates[1]);
        }

    //--------------------------Djikstra...............................//
    /**
     * Get the shortest distance between the node to find the best way
     * @param distances
     * @param visited node already visited
     * @returns find the nearest node
     */
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

    /**
     * This method will create the shortest path from a node to another
     * @param startNode
     * @param endNode
     * @returns {{path: [*], distance: *}}
     */
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
                let distance = distances[node];
                let children = graph[node];
                for (let child in children) {
                    if (String(child) === String(startNode)) {
                    } else {
                        let newdistance = distance + children[child];
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

            // record the shortest path
            let shortestPath = [endNode];
            let parent = parents[endNode];
            while (parent) {
                shortestPath.push(parent);
                parent = parents[parent];
            }
            shortestPath.reverse();
            return {
                distance: distances[endNode],
                path: shortestPath,
            };
        }

    //------------------------------------------------------ Bluetooth--------------------------------------------//
    /**
     * Start Event for scanning event.
     *   Make the event
     *   Create and complete beacon array
     *   Enable the procedure to check the nearest beacon
     *   Enable the procedure to send the new position
     *   Check if there is no beacon in the area
     */
    $("#btnStart").click(function () {
        $('#btnStart').unbind("click");
        let counter = 0;
        let procheBeaconArray = [];
        let beaconArray = [];
        let areBeaconAvailable = 0;

            if (destination !== undefined) {
                writeBufferInstruction();
                window.scrollTo(0, document.body.scrollHeight);
                let beaconJsonInfo = getBeaconInfo();
                navigator.bluetooth.requestLEScan({acceptAllAdvertisements: true})
                    .then(function (result) {
                    scan = result
                    })
                    .catch(error => { checkIfEnable() });

                navigator.bluetooth.addEventListener('advertisementreceived', event => {
                    //console.log(event);
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
                            let nearestBeacon = checkNearestBeacon(beaconArray);
                            procheBeaconArray[counter] = nearestBeacon.name;
                        }
                       //console.log(beaconArray);
                        if(beaconArray.length === 0){
                            areBeaconAvailable++;
                        }
                        if(areBeaconAvailable>10){
                            areBeaconAvailable = 0;
                            //noBeacon();
                        }
                    }
                    if (counter === 5) {
                        matchNewPosition(slidingWindow(procheBeaconArray), beaconArray, beaconJsonInfo);
                        counter = 0;
                    }
                });
            }
        });

    /**
     * Check wich beacon is the most of the time the nearest beacon
     *
     * @param procheBeacon the list of the beacon in the area
     * @returns {string} the most present beacon
     */

    function slidingWindow(procheBeacon) {
            let counts = {};
            for (let i = 0; i < procheBeacon.length; i++) {
                let beacon = procheBeacon[i];
                counts[beacon] = counts[beacon] ? counts[beacon] + 1 : 1;
            }
            let biggestValue = 0;
            let biggestKey;
            for (let key in counts) {
                if (key !== undefined && counts[key] > biggestValue) {
                    biggestKey = key;
                    biggestValue = counts[key];
                }
            }
           // console.log(biggestKey);
            return biggestKey;
        }

    /**
     * When a scan is done, this method return the nearest beacon during this scan
     * @param beaconArray
     * @returns {{rssi: number, name: string}} Return the nearest beacon
     */
    function checkNearestBeacon(beaconArray) {
            let tempBeacon = {name: "name", rssi: -200};
            for (let i = 0; i < beaconArray.length; i++) {
                if (beaconArray[i].rssi > tempBeacon.rssi && beaconArray[i].name !== tempBeacon.name) {
                    tempBeacon = beaconArray[i];
                }
            }
            return tempBeacon;
        }

    /**
     * When the new nearest beacon is found, this method will match the beacon with the beacon in beacon array and send the new nearest beacon
     * @param key
     * @param beaconArray
     */
        function matchNewPosition(key, beaconArray) {
            for (let i = 0; i < beaconArray.length; i++) {
                if (beaconArray[i].name === key && userPosition.name) {
                    sendNewPosition(beaconArray[i]);
                }
            }
        }


    /**
     * This method check if the current nearest beacon and the new is the same and send the result to the next step
     * @param nearestBeacon
     */
    function sendNewPosition(nearestBeacon) {
            for (let i = 0; i < beaconJsonInfo.length; i++) {
                if (nearestBeacon.name === beaconJsonInfo[i].beaconName && userPosition.name !== nearestBeacon.name) {
                    userPosition = nearestBeacon;
                    matchBeaconWithPoint(beaconJsonInfo[i]);
                }
            }
        }

    /**
     * Parse the information
     * @param BeaconJson
     */
    function parseJsonInfo(BeaconJson) {
            // noinspection JSDeprecatedSymbols
            beaconJsonInfo = BeaconJson.anchors;
          //  console.log(beaconJsonInfo);
        }

    /**
     * Stop the scan event
     */
        function stop_scan() {
        scan.stop();
        }

        function checkIfEnable() {
            window.alert("Merci d'activer le Bluetooth et la position");
            location.reload();
        }
    });