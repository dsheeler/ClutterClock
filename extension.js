import St from 'gi://St';
import Clutter from  'gi://Clutter';
import GLib from 'gi://GLib';

import {Extension,gettext as  _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const FONT_SIZE = 420;
const BORDER_WIDTH = 10;
const BORDER_RADIUS = 100;

export default class ClutterClockExtension extends Extension {
	constructor(metadata) {
		super(metadata);
	}

    enable() {
        this.settings = this.getSettings();
        this.monitor = Main.layoutManager.primaryMonitor;

        this.text = new St.Label({ style: 
        ' border-width: ' + BORDER_WIDTH +'px;' +
        ' border-radius: ' + BORDER_RADIUS + 'px;' +
        ' padding: 0.2em; font-family: ubuntu;' +
        ' font-size: ' + FONT_SIZE + 'px;' +
        ' font-weight: bold;' + 
        ' text: "Clutter Clock";'
        }); 

        this.text.set_pivot_point(0.5, 0.5);
        Main.uiGroup.add_child(this.text);

        this.text.opacity = 0;
        this.text.show();
        this._updateSeconds();
        this._updateSecondsTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1, this._updateSeconds.bind(this));

        this.text.set_position(this.monitor.x + this.monitor.width * this.settings.get_double("x"),
                               this.monitor.y + this.monitor.height * this.settings.get_double("y"));
        this.settings.connectObject('changed::x', () => {
            const x = this.settings.get_double("x");
            this.text.set_position(this.monitor.x + this.monitor.width * x, this.text.get_position()[1]);
        }, this);
        this.settings.connectObject('changed::y', () => {
            const y = this.settings.get_double("y");
            this.text.set_position(this.text.get_position()[0], this.monitor.y + this.monitor.height * y);
        }, this);

        const bgColor = this.getColorFromKey("background-color");
        this.setBackgroundColor(bgColor);
        this.settings.connectObject('changed::background-color', () => {
            const bgColor = this.getColorFromKey("background-color");
            this.setBackgroundColor(bgColor);
        }, this);

        const color = this.getColorFromKey("color");
        this.setTextColor(color);
        this.setBorderColor(color);
        this.settings.connectObject('changed::color', () => {
            const color = this.getColorFromKey("color");
            this.setTextColor(color);
            this.setBorderColor(color);
        }, this);

        this.setScale();
        this.settings.connectObject('changed::scale', () => {
            this.setScale();
        }, this);

        this.spinning = this.settings.get_boolean("spinning");
        this.settings.connectObject('changed::spinning', () => {
            this.spinning = this.settings.get_boolean("spinning");
            if (this.spinning) {
                this._spin();
            } else {
                this._stopSpin();
            }
        }, this);
        this.showingClock = this.settings.get_boolean("show-clock");
        if (this.showingClock) {
            this._showClock();
            this._spin();
        }
        this.settings.connectObject('changed::show-clock', () => {
            const showingClock = this.settings.get_boolean("show-clock");
            if (showingClock) {
                this._showClock();
            } else {
                this._hideClock();
            }
        }, this);
        this.showMilliseconds = this.settings.get_boolean("show-milliseconds");
        this.settings.connectObject('changed::show-milliseconds', () => {
            this.showMilliseconds = this.settings.get_boolean("show-milliseconds");
        }, this);
    }

    disable() {
        if (this._updateSecondsTimeoutId) {
            GLib.source_remove(this._updateSecondsTimeoutId);
            this._updateSecondsTimeoutId = null;
        }
        this.settings.disconnectObject(this);
        this.settings = null;
        this.text.destroy();
        this.text = null;
    }

    setBorderColor(color) {
        this.text.set_style(this.text.get_style() + ' border-color: rgba(' + color.red + 
        ',' + color.green + ',' + color.blue + ',' + 
        color.alpha + ');');
    }

    setBackgroundColor(color) {
        this.text.set_style(this.text.get_style() + ' background-color: rgba(' + color.red + 
        ',' + color.green + ',' + color.blue + ',' + color.alpha + ');');
    }

    setTextColor(color) {
        this.text.set_style(this.text.get_style() + ' color: rgba(' + color.red + 
        ',' + color.green + ',' + color.blue + ',' + color.alpha + ');');
    }

    setScale() {
        let scale = this.settings.get_double("scale");
        scale = Math.max(0.001, scale);
        this.text.set_style(this.text.get_style() + 
        ' font-size: ' + scale * FONT_SIZE + 'px;' + 
        ' border-radius: ' + scale * BORDER_RADIUS + 'px;' +
        ' border-width: ' + scale * BORDER_WIDTH + 'px;');
        this.text.set_scale_z(scale);
    }

    getColorFromKey(key) {
        let color = this.settings.get_value(key).deep_unpack();
        let colorRgba = {red: 0, green: 0, blue: 0, alpha: 0};
        colorRgba.red = 255 * color[0];
        colorRgba.green = 255 * color[1];
        colorRgba.blue = 255 * color[2];
        colorRgba.alpha = color[3];
        return colorRgba;
    }

    _showClock() {
        if (this.text) {
            this.showingClock = true;
            const params = {
                opacity: 255,
                duration: 500,
                mode: Clutter.AnimationMode.LINEAR,
            };
            this.text.ease(params);
        }
    }

    _hideClock() {
        if (this.text) {
            const params = {
                opacity: 0,
                duration: 500,
                mode: Clutter.AnimationMode.LINEAR,
                onComplete: () => {
                    this.showingClock = false;
                }
            };
            this.text.ease(params);
        }
    }

    _spin() {
        if (this.spinning === true) {
            if (this.text) {
                const params = {
                    rotation_angle_z: -360,
                    rotation_angle_x: -1440,
                    duration: 5000,
                    mode: Clutter.AnimationMode.LINEAR,
                    onComplete: () => {
                        this.text.rotation_angle_z = 0;
                        this.text.rotation_angle_x = 0;

                        this._spin();
                    }
                };
                this.text.ease(params);
            }
        }
    }

    _stopSpin() {
        this.spinning = false;
    }

    _updateSeconds() {
        if (this.text && this.showingClock) {
            const date = new Date();
            const formattedHour = String(date.getHours()).padStart(2, '0');
            const formattedMinutes = String(date.getMinutes()).padStart(2, '0');
            const formattedSeconds = String(date.getSeconds()).padStart(2, '0');
            const formattedMilliseconds = String(date.getMilliseconds()).padStart(3, '0');
            const timeString = `${formattedHour}:${formattedMinutes}:${formattedSeconds}` +
            (this.showMilliseconds ? `.${formattedMilliseconds}` : '');
            this.text.set_text(timeString);
        }
        return true;
    }
}