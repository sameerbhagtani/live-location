const map = L.map("map").setView([20.5937, 78.9629], 5);
const socket = io();

const remoteMarkers = new Map();
let currentUser = null;
let myCurrentLocationMarker = null;

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

async function checkAuth() {
    try {
        const response = await fetch("/auth/me");
        if (response.ok) {
            const user = await response.json();
            currentUser = user;
            showLoggedInUI(user);
            startLocationTracking();
        } else {
            showLoggedOutUI();
        }
    } catch (error) {
        console.error("Auth check failed:", error);
        showLoggedOutUI();
    }
}

function showLoggedInUI(user) {
    document.getElementById("user-info").classList.add("logged-in");
    document.getElementById("user-name").textContent =
        `Logged in as: ${user.userName}`;
    document.getElementById("login-btn").classList.remove("show");
    document.getElementById("logout-btn").classList.add("show");
}

function showLoggedOutUI() {
    document.getElementById("user-info").classList.remove("logged-in");
    document.getElementById("login-btn").classList.add("show");
    document.getElementById("logout-btn").classList.remove("show");
}

document.getElementById("login-btn").addEventListener("click", () => {
    window.location.href = "/auth/login";
});

document.getElementById("logout-btn").addEventListener("click", () => {
    window.location.href = "/auth/logout";
});

socket.on("server:location:update", (data) => {
    const { userId, userName, latitude, longitude } = data;

    if (!remoteMarkers.has(userId)) {
        const marker = L.marker([latitude, longitude]);
        marker.addTo(map).bindPopup(`${userName}`);
        remoteMarkers.set(userId, marker);
    } else {
        const existingMarker = remoteMarkers.get(userId);
        existingMarker.setLatLng([latitude, longitude]);
    }
});

socket.on("user-left", (data) => {
    const { userId } = data;
    const marker = remoteMarkers.get(userId);
    if (marker) {
        map.removeLayer(marker);
        remoteMarkers.delete(userId);
    }
});

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
            reject(new Error("Geolocation not supported"));
        }
    });
}

function startLocationTracking() {
    setInterval(async () => {
        try {
            const { latitude, longitude } = await getUsersCurrentLocation();

            if (!myCurrentLocationMarker) {
                myCurrentLocationMarker = L.marker([latitude, longitude])
                    .addTo(map)
                    .bindPopup("You are here");
            } else {
                myCurrentLocationMarker.setLatLng([latitude, longitude]);
            }

            socket.emit("client:location:update", { latitude, longitude });
        } catch (error) {
            console.error("Failed to get location:", error);
        }
    }, 10 * 1000);
}

window.addEventListener("load", checkAuth);
