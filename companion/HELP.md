# VIZIO SmartCast

> Make sure you pair the device first!

## Usage

Create a pair action and launch that action
When connection is successful it will display a PIN number on the device (Try switching to the older firmware if pin doesn't display.)
Create a enter pin action and fill in the pin code, run the action

It should be paired now (you can see it on the device)

This module supports:

* Pairing the device
* Power On/Off/Toggle (On and Off check the TV first and only send a command if it needs to change)
* Changing the input
* Adjusting volume and mute status (Mute On/Off also check the TV first)

Feedbacks:

* Current Power State
* Current Input
* Mute State
* Connection Lost (TV can't be reached)

Variables:

* Information/Status
* Current Power State (On, Off = standby, Offline = can't be reached)
* Connected (Yes/No)
* Volume Level
* Mute State
* Current Input Selected
* Cast Name
* Serial Number
* Model Name
* Version
* Cast Version
* SCPL Version
* Resolution

Notes:

* Turn on Polling in the module settings for variables and feedbacks. The module keeps polling and reconnects by itself if the TV is unplugged or restarted.
* Power On from standby only works if the TV is reachable on the network. If it doesn't wake, enable "Quick Start" in the TV's power settings.
