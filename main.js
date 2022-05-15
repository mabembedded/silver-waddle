const noble = require('@abandonware/noble');
const ble = require("./ble.js")
const fs = require('fs');

let updateData = null;
let totalSize = 0;
let remaining = 0;
let currentPosition = 0;
let armountToWrite = 0;
let characteristicSize = 512;
let dataToSend = null;
let numberOfBlocks = 0;
let lastBlockSize = 0;

// RECEIVE USER INPUT
const args = process.argv.slice(2)
switch (args.length) {
	case 1:
		NAME = args[0]
		break
	case 2:
		NAME = args[0]
		try {
			SERVICE_NO = parseInt(args[1])
		} catch (e) {
			console.log("Please input a numerical value for the 2nd argument")
			console.log("...ending script")
			process.exit()
		}
		break
	default:
		console.log(`Using default parameters: ${NAME}. and service number ${SERVICE_NO}`)
}

// INITIALIZE BLE
ble.initializeBLE()

fs.readFile('./firmware.bin', fwLoad);

function fwLoad(err, data)
{
	if (err)
		console.log("failed to load file");
	else {
		updateData = data;
		console.log("read " + updateData.length + " bytes");
		totalSize = updateData.length;
		remaining = totalSize;
	}
}

function sendUpdateTwo(characteristic)
{
	console.log("Found OTA characteristic");
	var packet = new Buffer.alloc(1);
	var receivedBlockSet = false;
	packet[0] = 0;
	characteristic.write(packet);
	characteristic.read(function (error, data) {});
	characteristic.on('read', function (data, isNotification) {
		if (data[0] == 1) {
			numberOfBlocks = data[1] | (data[2] << 8) | (data[3] << 16) | (data[4] << 24);
			console.log("number of blocks = " + numberOfBlocks);
		}
	}.bind(this));
	characteristic.on('data', (data, isNotification) => {
		console.log("device received total block set!");
		receivedBlockSet = true;
	});
	let blockSize = numberOfBlocks * (characteristicSize - 3);
	blockData = updateData.slice(currentPosition, currentPosition + blockSize);
	// Wait for numberOfBlocks to be set
	while (receivedBlockSet == false) {
		for (i = 0; i < numberOfBlocks; i++) {
			let singleBlockData = blockData.slice(i* (characteristicSize-3), (i+1)*(characteristicSize - 3));
			dataToSend[0] = 2;
			dataToSend[1] = i & 0xff;
			dataToSend[2] = (i >> 8) & 0xff;
			dataToSend.push(singleBlockData);
			characteristic.write(dataToSend);
		}
	}
}

function sendUpdate(characteristic)
{
	console.log("Found OTA characteristic");
	characteristic.on('data', (data, isNotification) => {
		console.log("got ack, remaining = " + remaining);
		if (remaining > 0) {
			if (remaining >= characteristicSize) {
				amountToWrite = characteristicSize;
			} else {
				amountToWrite = remaining;
			}

			console.log("amountToWrite = " + amountToWrite);
			dataToSend = updateData.slice(currentPosition, currentPosition + amountToWrite);
			console.log("going to write " + dataToSend.length + " bytes");
			characteristic.write(dataToSend);
			console.log("wrote data");
			currentPosition += amountToWrite;
			remaining -= amountToWrite;
		} else {
			characteristic.write(Buffer.from("end", "utf-8"));
			return 0;
		}
	});

	console.log("remaining = " + remaining + " bytes");
	amountToWrite = characteristicSize;
	dataToSend = updateData.slice(currentPosition, currentPosition + amountToWrite);
	currentPosition = currentPosition + amountToWrite;
	remaining = remaining - amountToWrite;
	console.log("going to write " + dataToSend.length + " bytes");
	console.log("remaining = " + remaining + " bytes");
	characteristic.write(dataToSend);
	console.log("wrote data");
	characteristic.subscribe();
}

function handleScanCharacteristic(characteristic)
{
	console.log("Found scan !");
	// First need to send a "start" to kick off a scan
	// characteristic.write(Buffer.from("start", "utf-8"));
	characteristic.read(function (error, data) {});
	characteristic.on('read', function (data, isNotification) {
		console.log(data.toString('utf-8'));
	}.bind(this));
}

function handleFwVersionCharacteristic(characteristic)
{
	characteristic.read(function (error, data) {});
	characteristic.on('read', function (data, isNotification) {
		console.log("fw version = " + data.toString('utf-8'));
	}.bind(this));
}

function handleNumberAlarmsCharacteristic(characteristic)
{
	characteristic.read(function (error, data) {});
	characteristic.on('read', function (data, isNotification) {
		console.log("number of alarms = " + parseInt(data.toString('utf-8')));
	}.bind(this));
}

function handleSendAlarm(characteristic)
{
	var alarmData = new Buffer.alloc(8);
	// Send two alarms
	alarmData[0] = 1; // Version 1
	alarmData[1] = 0;
	alarmData[2] = 4287 & 0xff; // time in minutes (offset from sunday 00:00)
	alarmData[3] = (4287 >> 8) & 0xff; // time in minutes (offset from sunday 00:00)
	alarmData[4] = 10 & 0xff; // duration in seconds
	alarmData[5] = (10 >> 8) & 0xff;
	alarmData[6] = 0x1; // enable p1, p3, l1
	alarmData[7] = 0;
	characteristic.write(alarmData);

	alarmData[0] = 1; // Version 1
	alarmData[1] = 0;
	alarmData[2] = 7263 & 0xff; // time in minutes (offset from sunday 00:00)
	alarmData[3] = (7263 >> 8) & 0xff; // time in minutes (offset from sunday 00:00)
	alarmData[4] = 300 & 0xff; // duration in seconds
	alarmData[5] = (300 >> 8) & 0xff;
	alarmData[6] = 0x15; // enable p0, p2, l1
	alarmData[7] = 0;
	characteristic.write(alarmData);
}

function handlePersistAlarms(characteristic)
{
	characteristic.write(Buffer.from("set", "utf-8"));
}

function handleSsid(characteristic)
{
	characteristic.write(Buffer.from("mab", "utf-8"));
}

function handlePass(characteristic)
{
	characteristic.write(Buffer.from("@bDuRR@sh13", "utf-8"));
}

function handleSubmit(characteristic)
{
	characteristic.write(Buffer.from("start", "utf-8"));
}

// DISCOVER CALLBACK
noble.on('discover', async function(peripheral) {
	var connected = false

	// discover
	const name = peripheral.advertisement.localName;
	if (name) {
		console.log("FOUND: " + name)
	}

	console.log("NAME = " + NAME)
	// discovered peripheral
	if (name === NAME) {
		noble.stopScanning();
		console.log("---DISCOVERED---")
		PERIPHERAL = peripheral
		//connected = false
		connected = await ble.connectPeripheral(peripheral)
		console.log("---CONNECTED = " + connected)
	}

	console.log("---CONNECTED = " + connected)
	// connect
	if (connected) {
		// get services
		const services = await ble.discoverServices(peripheral)
		console.log("---DISCOVERED SERVICES---")
		console.log(services)
		// get characteristic on service number, defined by user
		// otherwise, take the last argument
		const service = SERVICE_NO == -1 ? services[services.length - 1] : services[SERVICE_NO]
		characteristics = await ble.discoverCharacteristics(service)
		console.log("---DISCOVERED CHARACTERISTICS---")
		console.log(characteristics)

		// subscribe to characteristic
		characteristics.forEach((characteristic, index) => {
			if (characteristic.uuid === "2947032898bf11ecb9090242ac120002") {
				console.log("ota characterstic detected");
				sendUpdate(characteristic);
			}
			if (characteristic.uuid === "a2139fdb161a40d3bccfd27dc9824784") {
				//console.log("scan characterstic detected");
				//handleScanCharacteristic(characteristic);
			}
			if (characteristic.uuid == "4d679b6a9e1811ecb9090242ac120002") {
				//console.log("fw version characterstic detected");
				//handleFwVersionCharacteristic(characteristic);
			}
			if (characteristic.uuid == "29292f5c83eb40b88fb724d6aed09606") {
				//console.log("alarm number characterstic detected");
				//handleNumberAlarmsCharacteristic(characteristic);
			}
			if (characteristic.uuid == "0933e1beab444f8bab9cefbc4b0d60fc") {
				//console.log("alarm set characterstic detected");
				//handleSendAlarm(characteristic);
			}
			if (characteristic.uuid == "e140f43d697446e18bfa1dee18c87e36") {
				//console.log("persist characterstic detected");
				//handlePersistAlarms(characteristic);
			}
			if (characteristic.uuid == "0db3f33272974ed0b0e612e95ba973fd") {
				//console.log("ssid characterstic detected");
				//handleSsid(characteristic);
			}
			if (characteristic.uuid == "a1c8043a68e24ccb94240872c76af031") {
				//console.log("pass characterstic detected");
				//handlePass(characteristic);
			}
			if (characteristic.uuid == "6f3e78bddd774c5f894ec0a7da652802") {
				//console.log("submit characterstic detected");
				//handleSubmit(characteristic);
			}
		})
	}
});

// close callback
process.on('SIGINT', function () {
	// stop bluetooth scan
	console.log("---DISCONNECTING---")
	noble.stopScanning();

	// disconnect peripheral
	if (PERIPHERAL) {
		PERIPHERAL.disconnect()
	}

	// end process
	process.exit()
});
