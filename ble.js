// const noble = require('noble-uwp');
// const noble = require('noble-winrt');
// const noble = require('noble')
const noble = require('@abandonware/noble');

// SCANNING CALLBACK
const initializeBLE = function() {
	noble.on('stateChange', function(state) {
	  if (state === 'poweredOn') {
		noble.startScanning()
		console.log('---SCANNING---');
	  } else {
		noble.stopScanning();
		console.log('---STOP SCANNING---')
	  }
	});
}

// HELPER PROMISES
const connectPeripheral = async function(peripheral) {
	return new Promise( (resolve, reject) => {
		peripheral.connect( (error) => {
			if (error) {
				reject(false)
			} else {
				resolve(true)
			}
		})
	})
}

const discoverServices = async function(peripheral) {
	return new Promise( (resolve, reject) => {
		peripheral.discoverServices([], (error, services) => {
			if (error) {
				reject(false)
			} else {
				resolve(services)
			}
		})
	})
}

const discoverCharacteristics = async function(service) {
	return new Promise( (resolve, reject) => {
		service.discoverCharacteristics([], (error, characteristics) => {
			if (error) {
				reject(false)
			} else {
				resolve(characteristics)
			}
		})
	})
}

// export module
module.exports = {
	initializeBLE,
	connectPeripheral,
	discoverServices,
	discoverCharacteristics,
}