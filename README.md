# silver-waddle
BLE unit testing

To get started:

    npm install
    
After all of the modules are installed:

    sudo node main.js <advertised BLE name> <Service Number>
    
where "advertised BLE name" is the BLE name advertised by your device, and "Service Number" is the index of the BLE service that you wish to interact with.

You can modify the script to get detailed information about all of the services and characteristics that exist on the device.

sudo may or may not be necessary depending on the permissions granted to your user account.
