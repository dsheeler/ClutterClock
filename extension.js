/* -*- Mode: js2; indent-tabs-mode: nil; c-basic-offset: 2; tab-width: 2 -*-  */
/*
 * extension.js
 * Copyright (C) 2013 Daniel Sheeeler <six600110@pobox.com>
 * 
 * clutter-clock is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * clutter-clock is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License along
 * with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import St from 'gi://St';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Clutter from  'gi://Clutter';
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';
import Graphene from 'gi://Graphene';


import {Extension,gettext as  _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from  "resource:///org/gnome/shell/ui/popupMenu.js";

export default class clutter_clockExtension extends Extension {
	constructor(metadata) {
		super(metadata);
        this.settings = this.getSettings();
        this.monitor = Main.layoutManager.monitors[0];
       
	}

	enable() {
        let bc = this.settings.get_value("background-color").deep_unpack();
        let brgba = new Gdk.RGBA();
        brgba.red = 255*bc[0];
        brgba.green = 255*bc[1];
        brgba.blue = 255*bc[2];
        brgba.alpha = bc[3];

        let color = this.settings.get_value("color").deep_unpack();
        let colorRgba = new Gdk.RGBA();
        colorRgba.red = 255*color[0];
        colorRgba.green = 255*color[1];
        colorRgba.blue = 255*color[2];
        colorRgba.alpha = color[3];

        this.text = new St.Label({ style: 'border: 10px solid black; border-radius: 100px; padding: 0.2em; background: #005555; font-family: ubuntu;' +
        'font-size: 420px; font-weight: bold; color: rgba(' + colorRgba.red + 
        ',' + colorRgba.green + ',' + colorRgba.blue + ',' + colorRgba.alpha + '); ' +
        ' background-color: rgba(' + brgba.red + ',' + brgba.green + ',' + brgba.blue + ',' +
        brgba.alpha + ');', text: "Clutter Clock" }); 

        this.text.set_pivot_point(0.5, 0.5);
        Main.uiGroup.add_child(this.text);
        this.text.hide();
        this._updateSeconds();
        this._updateSecondsTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1, this._updateSeconds.bind(this));


        this.connections = [];
        this.connections.push(this.settings.connect('changed::x', () => {
            const x = this.settings.get_double("x");
            this.text.set_position(this.monitor.x + this.monitor.width * x, this.text.get_position()[1]);
        }));
        this.connections.push(this.settings.connect('changed::y', () => {
            const y = this.settings.get_double("y");
            this.text.set_position(this.text.get_position()[0], this.monitor.y + this.monitor.height * y);
        }));
        this.connections.push(this.settings.connect('changed::background-color', () => {
            let bc = this.settings.get_value("background-color").deep_unpack();
            let brgba = new Gdk.RGBA();
            brgba.red = 255*bc[0];
            brgba.green = 255*bc[1];
            brgba.blue = 255*bc[2];
            brgba.alpha = bc[3];
            this.text.set_style(this.text.get_style() + ' background-color: rgba(' + brgba.red + 
                                ',' + brgba.green + ',' + brgba.blue + ',' + 
                                brgba.alpha + ');');
        }));

        this.connections.push(this.settings.connect('changed::color', () => {
            let color = this.settings.get_value("color").deep_unpack();
            let colorRgba = new Gdk.RGBA();
            colorRgba.red = 255*color[0];
            colorRgba.green = 255*color[1];
            colorRgba.blue = 255*color[2];
            colorRgba.alpha = color[3];
            this.text.set_style(this.text.get_style() + ' color: rgba(' + colorRgba.red + 
                                ',' + colorRgba.green + ',' + colorRgba.blue + ',' + 
                                colorRgba.alpha + ');');
        }));

        const scale = this.settings.get_double("scale");
        this.text.set_scale(scale, scale);
        this.text.set_scale_z(scale);
        this.connections.push(this.settings.connect('changed::scale', () => {
            const scale = this.settings.get_double("scale");
            this.text.set_scale(scale, scale);
            this.text.set_scale_z(scale);
        }));

        this.text.set_position(this.monitor.x + this.monitor.width * this.settings.get_double("x"),
                               this.monitor.y + this.monitor.height * this.settings.get_double("y"));
        this.spinning = this.settings.get_boolean("spinning");
        this._spin();
        this.connections.push(this.settings.connect('changed::spinning', () => {
            this.spinning = this.settings.get_boolean("spinning");
            if (this.spinning) {
                this._spin();
            } else {
                this._stopSpin();
            }
        }));
        this.showingClock = this.settings.get_boolean("show-clock");
        if (this.showingClock) {
            this._showClock();
        }
        this.connections.push(this.settings.connect('changed::show-clock', () => {
            this.showingClock = this.settings.get_boolean("show-clock");
            if (this.showingClock) {
                this._showClock();
            } else {
                this._hideClock();
            }
        }));
    }

    disable() {
        if (this._updateSecondsTimeoutId) {
            GLib.source_remove(this._updateSecondsTimeoutId);
            this._updateSecondsTimeoutId = null;
        }
        this.connections.forEach(connection => {
            this.settings.disconnect(connection);
        });
        this.connections = [];
        this.settings = null;
    }

    _stopSpin() {
        this.spinning = false;
    }

    _hideClock() {
        if (this.text) {
            this.text.hide();

        }
    }
      
    _showClock() {
        this.text.show(); 
    }

    _spin() {
        if (this.spinning === true) {
            if (this.text) {
                this.text.rotation_angle_z = 0;
                this.text.rotation_angle_x = 0;
                this.text.set_pivot_point(0.5, 0.5);
                const params = {
                    rotation_angle_z: -360,
                    rotation_angle_x: -360,
                    duration: 5000,
                    mode: Clutter.AnimationMode.EASE_IN_OUT,
                    onComplete: () => {
                        this._spin();
                    }
                };
                this.text.ease(params);
            }
        }
    }

    _updateSeconds() {
        const date = new Date();
        const formattedHour = String(date.getHours()).padStart(2, '0');
        const formattedMinutes = String(date.getMinutes()).padStart(2, '0');
        const formattedSeconds = String(date.getSeconds()).padStart(2, '0');
        const formattedMilliseconds = String(date.getMilliseconds()).padStart(3, '0');
        const timeString = `${formattedHour}:${formattedMinutes}:${formattedSeconds}.${formattedMilliseconds}`;
        this.text.set_text(timeString);
        return true;
    }

}