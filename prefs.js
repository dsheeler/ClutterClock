import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'

export default class ClutterClockPreferences extends ExtensionPreferences {
    constructor(metadata) {
        super(metadata);

        this.settings = this.getSettings();

    }

    getVersionString(_page) {
        return _('Version %d').format(this.metadata.version);
    }

    fillPreferencesWindow(window) {
        let general_page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'general-symbolic',
        });
        window.add(general_page);

        let clock_pref_group = new Adw.PreferencesGroup({
            title: _('Clock'),
        });
        general_page.add(clock_pref_group);

        clock_pref_group.add(this.buildSwitcherAdw("show-clock", [], [], _("Show Clock"), _("Whether the clock should be shown.")));
        clock_pref_group.add(this.buildSwitcherAdw("show-milliseconds", [], [], _("Show Milliseconds"), _("Whether the milliseconds should be shown.")));
        clock_pref_group.add(this.buildSwitcherAdw("spinning", [], [], _("Spinning"), _("Whether the clock should spin.")));
        clock_pref_group.add(this.buildRangeAdw("scale", [0.0, 2.0, 0.1, [1.0]], _("Scale"), _("The scale of the clock.")));
        clock_pref_group.add(this.buildRangeAdw("x", [-1.0, 1.0, 0.01, [-0.5, 0.0, 0.5]], _("X"), _("The x position of the clock.")));
        clock_pref_group.add(this.buildRangeAdw("y", [-1.0, 1.0, 0.01, [-0.5, 0.0, 0.5]], _("Y"), _("The y position of the clock.")));
        let colors_pref_group = new Adw.PreferencesGroup({
            title: _('Colors'),
        });
        general_page.add(colors_pref_group);

        colors_pref_group.add(this.buildColorChoiceRow(_("Text Color"), "color"));
        colors_pref_group.add(this.buildColorChoiceRow(_("Background Color"), "background-color"));
    }


    buildColorChoiceRow(title, key) {
        let row = new Adw.ActionRow({
            title: title
        });

        let dialog = new Gtk.ColorDialog({
            with_alpha: true,
        });

        let button = new Gtk.ColorDialogButton({
            valign: Gtk.Align.CENTER,
            dialog: dialog,
        });

        let bc = this.settings.get_value(key).deep_unpack();
        let brgba = new Gdk.RGBA();
        brgba.red = bc[0];
        brgba.green = bc[1];
        brgba.blue = bc[2];
        brgba.alpha = bc[3];
        button.set_rgba(brgba);
        button.connect('notify::rgba', _button => {
            let c = button.rgba;
            let val = new GLib.Variant("(dddd)", [c.red, c.green, c.blue, c.alpha]);
            this.settings.set_value(key, val);
        });
        row.set_activatable_widget(button);
        row.add_suffix(button);
        let reset_button = this.buildResetButton(key);
        reset_button.connect("clicked", function (_widget) {
            this.settings.reset(key);
            let bc = this.settings.get_value(key).deep_unpack();
            let brgba = new Gdk.RGBA();
            brgba.red = 0.5;
            brgba.green = 0.5;
            brgba.blue = 0.5;
            brgba.alpha = 0;
            button.set_rgba(brgba);
        }.bind(this));
        this.settings.connect(`changed::${key}`, () => {
            let bc = this.settings.get_value(key).deep_unpack();
            let brgba = new Gdk.RGBA();
            brgba.red = bc[0];
            brgba.green = bc[1];
            brgba.blue = bc[2];
            brgba.alpha = bc[3];
            button.set_rgba(brgba);
        });
        row.add_suffix(reset_button);
        return row;
    }

    showFileChooser(parent, title, action, acceptHandler) {
        const dialog = new Gtk.FileDialog({
            title: _(title),
        });
        const onResult = (_dialog, result) => {
            try {
                const file = action === Gtk.FileChooserAction.SAVE
                    ? dialog.save_finish(result)
                    : dialog.open_finish(result);
                acceptHandler(file.get_path());
            } catch (e) {
                if (e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
                    return;
                console.log(`CoverflowAltTab - Filechooser error: ${e}`);
            }
        };
        if (action === Gtk.FileChooserAction.SAVE)
            dialog.save(parent, null, onResult);
        else
            dialog.open(parent, null, onResult);
    }

    buildResetButton(key) {
        let reset_button = new Gtk.Button({
            icon_name: "edit-clear-symbolic",
            tooltip_text: _("Reset to default value"),
            valign: Gtk.Align.CENTER,
        });
        reset_button.connect("clicked", function(_widget) {
            this.settings.reset(key);
        }.bind(this));
        return reset_button;
    }

    buildContributeLinkRow(window, { icon_name, title, subtitle, uri }) {
        const rowProps = { title, subtitle };
        if (icon_name)
            rowProps.icon_name = icon_name;
        const row = new Adw.ActionRow(rowProps);
        row.set_tooltip_text(uri);
        row.activatable = true;
        row.connect('activated', () => {
            const launcher = new Gtk.UriLauncher({ uri });
            launcher.launch(window, null, null, (_src, res) => {
                try {
                    launcher.launch_finish(res);
                } catch (e) {
                    console.error(`CoverflowAltTab: could not open link: ${e.message}`);
                }
            });
        });
        return row;
    }

    buildSwitcherAdw(key, dependant_widgets, inverse_dependant_widgets, title, subtitle=null) {
        let pref = new Adw.ActionRow({
            title: title,
        });
        if (subtitle !== null) {
            pref.set_subtitle(subtitle);
        }

        let switcher = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
            active: this.settings.get_boolean(key)
        });

        switcher.expand = false;
        switcher.connect('notify::active', function(widget) {
            this.settings.set_boolean(key, widget.active);
        }.bind(this));
        this.settings.connect(`changed::${key}`, () => {
            const v = this.settings.get_boolean(key);
            if (switcher.get_active() !== v)
                switcher.set_active(v);
        });

        pref.set_activatable_widget(switcher);
        pref.add_suffix(switcher);

        switcher.connect('notify::active', function(widget) {
            for (let dep of dependant_widgets) {
                dep.set_sensitive(widget.get_active());
            }
        });

        for (let widget of dependant_widgets) {
            widget.set_sensitive(switcher.get_active());
        }

        switcher.connect('notify::active', function(widget) {
            for (let inv_dep of inverse_dependant_widgets) {
                inv_dep.set_sensitive(!widget.get_active());
            }
        });

        for (let widget of inverse_dependant_widgets) {
            widget.set_sensitive(!switcher.get_active());
        }

        let reset_button = this.buildResetButton(key);
        reset_button.connect("clicked", function(_widget) {
            this.settings.reset(key);
            switcher.set_active(this.settings.get_boolean(key));
        }.bind(this));
        pref.add_suffix(reset_button);
        return pref;
    }

    buildRangeAdw(key, values, title, subtitle="", draw_value=false) {
        let [min, max, step, defvs] = values;

        let pref = new Adw.ActionRow({
            title: title,
        });
        if (subtitle !== null && subtitle !== "") {
            pref.set_subtitle(subtitle);
        }
        let range = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, min, max, step);
        range.set_value(this.settings.get_double(key));
        if (draw_value) {
            range.set_draw_value(true);
            range.set_value_pos(Gtk.PositionType.RIGHT)
        }
        for (let defv of defvs) {
            range.add_mark(defv, Gtk.PositionType.BOTTOM, null);
        }
        range.set_size_request(200, -1);

        range.connect('value-changed', function(slider) {
            this.settings.set_double(key, slider.get_value());
        }.bind(this));
        this.settings.connect(`changed::${key}`, () => {
            const v = this.settings.get_double(key);
            if (Math.abs(range.get_value() - v) > 1e-9)
                range.set_value(v);
        });

        pref.set_activatable_widget(range);
        pref.add_suffix(range)

        let reset_button = this.buildResetButton(key);
        reset_button.connect("clicked", function(_widget) {
            this.settings.reset(key);
            range.set_value(this.settings.get_double(key));
        }.bind(this));
        pref.add_suffix(reset_button);
        return pref;
    }

    buildRadioAdw(key, buttons, title, subtitle=null) {
        let pref = new Adw.ActionRow({
            title: title,
        });
        if (subtitle !== null) {
            pref.set_subtitle(subtitle);
        }
        let hbox = new Gtk.Box({
             orientation: Gtk.Orientation.HORIZONTAL,
             spacing: 10,
             valign: Gtk.Align.CENTER,
         });

        let radio = new Gtk.ToggleButton();

        let radio_for_button = {};
        for (let button of buttons) {
            radio = new Gtk.ToggleButton({group: radio, label: button.label});
            radio_for_button[button.choice] = radio;
            if (button.choice === this.settings.get_string(key)) {
                radio.set_active(true);
                for (let sensitive_widget of button.sensitive_widgets) {
                    sensitive_widget.set_sensitive(true);
                }
                for (let insensitive_widget of button.insensitive_widgets) {
                    insensitive_widget.set_sensitive(false);
                }
            }
            radio.connect('toggled', function(widget) {
                if (widget.get_active()) {
                    this.settings.set_string(key, button.choice);
                    for (let sensitive_widget of button.sensitive_widgets) {
                        sensitive_widget.set_sensitive(true);
                    }
                    for (let insensitive_widget of button.insensitive_widgets) {
                        insensitive_widget.set_sensitive(false);
                    }
                }
            }.bind(this));
            hbox.append(radio);
        };

        this.settings.connect(`changed::${key}`, () => {
            const val = this.settings.get_string(key);
            const btn = radio_for_button[val];
            if (btn && !btn.get_active())
                btn.set_active(true);
        });

        let reset_button = this.buildResetButton(key);
        reset_button.connect("clicked", function(_widget) {
            this.settings.reset(key);
            for (let button of buttons) {
                if (button.choice === this.settings.get_string(key)) {
                    radio_for_button[button.choice].set_active(true);
                }
            }
        }.bind(this));

        pref.set_activatable_widget(hbox);
        pref.add_suffix(hbox);
        pref.add_suffix(reset_button);
        return pref;
    }

    buildSpinAdw(key, values, title, subtitle=null) {
        let [min, max, step, page] = values;
        let pref = new Adw.ActionRow({
            title: title,
        });
        if (subtitle !== null) {
            pref.set_subtitle(subtitle);
        }
        let spin = new Gtk.SpinButton({ valign: Gtk.Align.CENTER });
        spin.set_range(min, max);
        spin.set_increments(step, page);
        spin.set_value(this.settings.get_int(key));

        spin.connect('value-changed', function(widget) {
            this.settings.set_int(key, widget.get_value());
        }.bind(this));
        this.settings.connect(`changed::${key}`, () => {
            const v = this.settings.get_int(key);
            if (spin.get_value() !== v)
                spin.set_value(v);
        });

        pref.set_activatable_widget(spin);
        pref.add_suffix(spin);

        let reset_button = this.buildResetButton(key);
        

        pref.add_suffix(reset_button);

        return pref;
    }

    buildDropDownAdw(key, values, title, subtitle=null) {
        let pref = new Adw.ActionRow({
            title: title,
        });
        if (subtitle !== null) {
            pref.set_subtitle(subtitle);
        }
        let model = new Gtk.StringList();
        let chosen_idx = 0;
        for (let i = 0; i < values.length; i++) {
            let item = values[i];
            model.append(item.name);
            if (item.id === this.settings.get_string(key)) {
                chosen_idx = i;
            }
        }

        let chooser = new Gtk.DropDown({
             valign: Gtk.Align.CENTER,
            model: model,
            selected: chosen_idx,
        });
        chooser.connect('notify::selected-item', function(c) {
            let idx = c.get_selected();
            this.settings.set_string(key, values[idx].id);
        }.bind(this));
        this.settings.connect(`changed::${key}`, () => {
            const id = this.settings.get_string(key);
            for (let i = 0; i < values.length; i++) {
                if (values[i].id === id) {
                    if (chooser.get_selected() !== i)
                        chooser.set_selected(i);
                    break;
                }
            }
        });
        pref.set_activatable_widget(chooser);
        pref.add_suffix(chooser);

        let reset_button = this.buildResetButton(key);
        reset_button.connect("clicked", function(_widget) {
            this.settings.reset(key);
            for (let i = 0; i < values.length; i++) {
                let item = values[i];
                if (item.id === this.settings.get_string(key)) {
                    chooser.set_selected(i);
                    break;
                }
            }
        }.bind(this));
        pref.add_suffix(reset_button);
        return pref;
    }
}