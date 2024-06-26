const username = new URLSearchParams(window.location.search).get('username');
document.getElementById('deviceContainer').innerHTML = `<h2>Devices for ${username}</h2>`;

// Fetch device information for the selected username from the server
async function fetchDevices() {
    const response = await fetch(`/api/fetchDevices/${username}`);
    const data = await response.json();

    // Process the fetched data and dynamically create device controls
    data.devices.forEach(device => {
        const deviceContainer = document.getElementById('deviceContainer');

        // Create a container for each device
        const deviceDiv = document.createElement('div');
        deviceDiv.innerHTML = `<h3>${device.deviceName} - ${device.deviceType}</h3>`;

        // Create specific controls based on device type
        if (device.deviceType === 'Led') {
            deviceDiv.innerHTML += `<button onclick="turnOnLed('${device.deviceName}')">Turn On</button>`;
            deviceDiv.innerHTML += `<button onclick="turnOffLed('${device.deviceName}')">Turn Off</button>`;
        } else if (device.deviceType === 'DHT11') {
            deviceDiv.innerHTML += `<p>Temperature: <span id="temperature_${username}_dht11_${device.deviceName}">-</span></p>`;
            deviceDiv.innerHTML += `<p>Humidity: <span id="humidity_${username}_dht11_${device.deviceName}">-</span></p>`;
        } else if (device.deviceType === 'Servo') {
            deviceDiv.innerHTML += `<input type="range" id="servo_${device.deviceName}" min="0" max="90" step="1" onchange="rotateServo('${device.deviceName}')">`;
            deviceDiv.innerHTML += `<p>Current Angle: <span id="currentAngle_${device.deviceName}">-</span> degrees</p>`;
        } else if (device.deviceType === 'Potentiometer') {
            deviceDiv.innerHTML += `<p>Resistance: <span id="resistance_${username}_potentiometer_${device.deviceName}">-</span></p>`;
        }

        // Append the device container to the main container
        deviceContainer.appendChild(deviceDiv);
    });
}

function controlDevice(deviceName, deviceType, action) {
    fetch(`/api/controlDevice`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username,
            deviceName,
            deviceType,
            action
        })
    }).then(response => response.json())
      .then(data => console.log(data.message))
      .catch(error => console.error('Error:', error));
}

function turnOnLed(deviceName) {
    controlDevice(deviceName, 'led', '1');
}

function turnOffLed(deviceName) {
    controlDevice(deviceName, 'led', '0');
}

function rotateServo(deviceName) {
    const angle = document.getElementById(`servo_${deviceName}`).value;
    document.getElementById(`currentAngle_${deviceName}`).innerText = angle;
    controlDevice(deviceName, 'servo', angle);
}

// Socket Web support MQTT message on HTML
const socket = new WebSocket(`ws://${window.location.host}/api/controlSocket/${username}`);

socket.onmessage = function(event) {
    const data = JSON.parse(event.data);
    displayMqttMessage(data);
};

socket.onerror = function(error) {
    console.error('WebSocket Error:', error);
};

function displayMqttMessage(data) {
    const { topic, message } = data;
    const [username, deviceType, deviceName, dataType] = topic.split('/');

    // Create a unique identifier for each device
    const deviceId = `${username}_${deviceType}_${deviceName}`;

    if (deviceType === 'dht11') {
        // Handle DHT11 data (temperature, humidity)
        if (dataType === 'temperature') {
            const temperatureElem = document.getElementById(`temperature_${deviceId}`);
            if (temperatureElem) {
                temperatureElem.textContent = `${message}°C`;
            }
        } else if (dataType === 'humidity') {
            const humidityElem = document.getElementById(`humidity_${deviceId}`);
            if (humidityElem) {
                humidityElem.textContent = `${message}%`;
            }
        }
    } else if (deviceType === 'potentiometer') {
        // Handle Potentiometer data (resistance)
        if (dataType === 'resistance') {
            const resistanceElem = document.getElementById(`resistance_${deviceId}`);
            if (resistanceElem) {
                resistanceElem.textContent = `${message} ohms`;
            }
        }
    }
}

// Fetch devices when the page loads
fetchDevices();
