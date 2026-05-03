const map = L.map("map").setView([51.505, -0.09], 13);
const socket = io();

const remoteMarkers = new Map();

socket.on("server:location:update", (data) => {
    const { id, latitude, longitude } = data;
    console.log(data);

    if (!remoteMarkers.has(id)) {
        const marker = L.marker([latitude, longitude]);
        marker.addTo(map).bindPopup(id);

        remoteMarkers.set(id, marker);
    } else {
        const existingMarker = remoteMarkers.get(id);
        existingMarker.setLatLng([latitude, longitude]);
    }
});

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

getUsersCurrentLocation();

function getUsersCurrentLocation() {
    return new Promise((resolve, reject) => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;

                    resolve({ latitude, longitude });
                },
                (err) => reject(err),
                { enableHighAccuracy: true },
            );
        } else {
            alert("Geolocation is not supported by this browser.");
        }
    });
}

let myCurrentLocationMarker = null;

async function main() {
    setInterval(async () => {
        const { latitude, longitude } = await getUsersCurrentLocation();

        if (!myCurrentLocationMarker) {
            myCurrentLocationMarker = L.marker([latitude, longitude])
                .addTo(map)
                .bindPopup("You are here");
        } else {
            myCurrentLocationMarker.setLatLng([latitude, longitude]);
        }

        socket.emit("client:location:update", { latitude, longitude });
    }, 10 * 1000);
}

window.addEventListener("load", main);
