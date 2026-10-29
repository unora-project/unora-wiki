#!/usr/bin/env python3
# UnoraOverlay for Linux - the Unora Wiki (unora.wiki) as an in-game overlay.
# Native Linux port of the Windows (AutoHotkey + WebView2) overlay, built on GTK 3 and
# WebKitGTK, with global keybinds through X11. See README.txt.
# Settings live in settings.cfg and keybinds.cfg next to this file, so updating
# this script never resets them.

import base64
import configparser
import fcntl
import hashlib
import os
import re
import signal
import subprocess
import sys
import threading
import time
import urllib.request
import warnings

import gi

gi.require_version("Gtk", "3.0")
gi.require_version("Gdk", "3.0")
gi.require_version("GdkPixbuf", "2.0")
try:
    gi.require_version("WebKit2", "4.1")
except ValueError:
    gi.require_version("WebKit2", "4.0")
from gi.repository import Gdk, GdkPixbuf, GLib, Gtk, WebKit2

warnings.filterwarnings("ignore", category=DeprecationWarning)

AppIndicator = None
for _ns in ("AyatanaAppIndicator3", "AppIndicator3"):
    try:
        gi.require_version(_ns, "0.1")
        AppIndicator = __import__("gi.repository." + _ns, fromlist=[_ns])
        break
    except (ValueError, ImportError):
        pass

try:
    from Xlib import X, XK, display as xdisplay, error as xerror
except ImportError:
    X = None

# ───────────────────────── Constants ─────────────────────────

# Everything between these two markers is copied from UnoraOverlay.ahk (the Windows version)
# by "Sync Tool/sync_linux.py". Do not edit it here: change UnoraOverlay.ahk and run the tool.
# >>> SYNCED FROM UnoraOverlay.ahk (version 1.8.0, by sync_linux.py)
VERSION = '1.8.0'
APP_NAME = 'Unora Overlay'
SITE_BASE = 'https://www.unora.wiki/#'
TB_H = 38
MINI_TB = 30
ROUTES = {
    'Home': '/',
    'Classes': '/classes',
    'Items': '/equipment',
    'Quests': '/quests',
    'Professions': '/professions',
    'Planner': '/planner',
    'PlannerMini': '/planner-mini',
    'CalcMini': '/hpmp-mini',
    'StatMini': '/stats-mini',
}
DEFAULTS = {
    'Theme': 'Unora',
    'AlwaysOnTop': '1',
    'Opacity': '100',
    'Zoom': '100',
    'CheckUpdates': '1',
    'AutoLaunch': '0',
    'GameWindow': 'Chaos Launcher',
    'GameProcess': '',
    'SkippedVersion': '',
    'WinX': '',
    'WinY': '',
    'WinW': '1000',
    'WinH': '720',
    'MiniX': '',
    'MiniY': '',
    'MiniW': '460',
    'MiniH': '560',
    'CalcX': '',
    'CalcY': '',
    'CalcW': '640',
    'CalcH': '430',
    'StatX': '',
    'StatY': '',
    'StatW': '560',
    'StatH': '520',
    'BaseUrl': 'https://www.unora.wiki/#',
}
ACTIONS = [
    {'id': 'Menu', 'label': 'Open the menu', 'key': '^!u'},
    {'id': 'Window', 'label': 'Show / hide the wiki window', 'key': '^!w'},
    {'id': 'Planner', 'label': 'Open the Build Planner', 'key': '^!b'},
    {'id': 'Calc', 'label': 'Open the HP/MP Calculator', 'key': '^!h'},
    {'id': 'Stat', 'label': 'Open the Stat Calculator', 'key': '^!s'},
    {'id': 'Options', 'label': 'Open Options', 'key': '^!o'},
    {'id': 'AddSkill', 'label': 'Add skill/spell from game (mouse)', 'key': '^!MButton', 'mouse': True},
]
MOUSE_CHOICES = [
    ('Ctrl+Alt+Middle click', '^!MButton'),
    ('Ctrl+Shift+Middle click', '^+MButton'),
    ('Alt+Middle click', '!MButton'),
    ('Ctrl+Middle click', '^MButton'),
    ('Shift+Middle click', '+MButton'),
    ('Ctrl+Alt+Mouse 4 (side button)', '^!XButton1'),
    ('Ctrl+Alt+Mouse 5 (side button)', '^!XButton2'),
    ('Alt+Mouse 4 (side button)', '!XButton1'),
    ('Alt+Mouse 5 (side button)', '!XButton2'),
    ('Mouse 4 (side button)', 'XButton1'),
    ('Mouse 5 (side button)', 'XButton2'),
    ('Off', ''),
]
THEME_ORDER = ['Unora', 'Dark', 'Light', 'Midnight', 'Crimson', 'Forest']
THEME_LABELS = [
    'Unora (website colours)',
    'Dark',
    'Light',
    'Midnight (dark blues)',
    'Crimson (dark reds)',
    'Forest (dark greens)',
]
THEMES = {
    'Unora': {
        'bg': '0B0B0E',
        'panel': '1A1A22',
        'text': 'F1EDE2',
        'muted': '8B8B9A',
        'accent': 'D9A441',
        'btn': '22222C',
        'btnText': 'D9A441',
        'dark': 1,
    },
    'Dark': {
        'bg': '121212',
        'panel': '1E1E1E',
        'text': 'E6E6E6',
        'muted': '9A9A9A',
        'accent': '8AB4F8',
        'btn': '2A2A2A',
        'btnText': 'E6E6E6',
        'dark': 1,
    },
    'Light': {
        'bg': 'F3F3F3',
        'panel': 'E4E4E4',
        'text': '202020',
        'muted': '666666',
        'accent': '0B5FB8',
        'btn': 'FFFFFF',
        'btnText': '202020',
        'dark': 0,
    },
    'Midnight': {
        'bg': '0A1224',
        'panel': '111C36',
        'text': 'DCE6FF',
        'muted': '7F93C0',
        'accent': '5AA2FF',
        'btn': '17264A',
        'btnText': 'BBD3FF',
        'dark': 1,
    },
    'Crimson': {
        'bg': '190A0C',
        'panel': '2A1115',
        'text': 'F5E6E6',
        'muted': 'B98A8F',
        'accent': 'E0485A',
        'btn': '3A171C',
        'btnText': 'FFB8C0',
        'dark': 1,
    },
    'Forest': {
        'bg': '0B1A12',
        'panel': '12281B',
        'text': 'E3F2E8',
        'muted': '86AA94',
        'accent': '4CC38A',
        'btn': '1A3A28',
        'btnText': 'A8E8C6',
        'dark': 1,
    },
}
HELP = [
    {
        'when': 'ctx',
        'match': 'planner',
        'title': 'Build Planner',
        'body': 'A small window with just your build plan. It stays on top of the game and remembers where you put it. Press {PLAN} to show or hide it.\n\nClass drop-down - switch class. The Your plans group lists the classes that already have picks; Start a plan for... lists the rest.\n\nAdd by typing - click the box, type part of a skill or spell name and press Enter (or click a result).\n\nAdd from the game - point the mouse at a skill or spell in the game (its name or icon on the Skill/Spell page, or its detail pop-up) and press {ADD}. The overlay reads the name from the screen and adds it. It looks in your current class first, then the other classes. A short message tells you what was added. You can change this key in Options > Keybinds.\nIt only reads the name text, never the icon, and works at any game window size (640x480 or bigger). If a name is unclear it asks you to point again rather than guessing.\n\nSelected (left) - your skills and spells, grouped by where you learn them. X removes one. Clear empties the plan for this class.\n\nTotal needed (right) - the gold, the highest STR / INT / WIS / CON / DEX you need for everything selected, and the materials. Tick a material when you have it; a skill whose materials are all ticked is crossed out.\n\nYour picks are shared with the main wiki window and are remembered between sessions.',
        'keys': {'{PLAN}': 'Planner', '{ADD}': 'AddSkill'},
    },
    {
        'when': 'ctx',
        'match': 'calc',
        'title': 'HP/MP Calculator',
        'body': 'Works out how much experience it costs to raise your HP and MP. HP goes up in steps of 50 and MP in steps of 25. Each raise costs 500 experience for every point of your base before the raise (for example HP 58,074 to 58,124 costs 29,037,000).\n\nBetween Two Bases - type a starting and an ending base for HP, MP or both, then press Calculate to get the total experience. The ending base must be a whole number of steps above the start.\n\nMax Raise from Exp - choose HP or MP, type your current base and the experience you have, and press Calculate. It shows the base you can reach and the experience left over.\n\nPress {CALC} to show or hide this window. It stays on top of the game and remembers where you put it.',
        'keys': {'{CALC}': 'Calc'},
    },
    {
        'when': 'ctx',
        'match': 'stat',
        'title': 'Stat Calculator',
        'body': 'Works out how much experience it takes to raise your STR, INT, WIS, CON and DEX to the maximum for your class.\n\nClass and Progression - pick your class and whether you are Pre-Master, Master or Grandmaster. The maximum for each stat is then filled in.\n\nCurrent Stats - type your current STR, INT, WIS, CON and DEX.\n\nXP/hour (millions) - optional. Type how much experience you gain per hour, in millions, to get an estimated time.\n\nCurrent Experience - optional. Experience you already have is taken off the total.\n\nThe result lists the experience needed for each stat and the total.\n\nPress {STAT} to show or hide this window. It stays on top of the game and remembers where you put it.',
        'keys': {'{STAT}': 'Stat'},
    },
    {
        'when': 'ctx',
        'match': 'menu',
        'title': 'The menu',
        'body': 'Pick where you want to go:\n\nClasses - skills and spells for every class, with the Build Plan window.\nItems - all equipment, with item comparison and enchants.\nQuests - quest guides.\nProfessions - recipes and tables for each profession.\n\nTools:\nBuild Planner - a small window with just your build plan. Type a skill or spell name to add it, or point at one in the game and press the Add key.\nHP/MP Calculator - a small window that works out how much experience HP and MP raises cost.\nStat Calculator - a small window that works out how much experience it takes to max your stats.\n\nThe wiki opens in its own window so you can keep playing. Close it with its X (it is only hidden), or press the Show/hide key.\nClick the ? on any page for help with that page.',
        'keys': {},
    },
    {
        'when': 'path',
        'match': '^/classes',
        'title': 'Classes',
        'body': 'Choose a class, then use the Skills and Spells tabs. Switch between Cards and List with the View buttons.\n\nHide - on a card, removes skills you no longer want to see. They wait in a drop-down at the bottom, and Reset Hidden brings them all back.\n\nBuild Plan - opens a floating plan. Click cards (or tick the Plan box in List view) to add them. The plan groups them by where you learn them, totals the gold and materials, and lets you tick off materials as you collect them. It remembers your picks for each class, even after closing the overlay.',
        'keys': {},
    },
    {
        'when': 'path',
        'match': '^/planner',
        'title': 'Build Planner',
        'body': 'Shows only your saved build plan. Use the drop-down at the top to switch class - it lists just the classes that have a plan.\n\nSelected (left) - your skills and spells, grouped by where you learn them.\nTotal needed (right) - the gold, the highest STR / INT / WIS / CON / DEX you need for everything selected, and the materials. Tick a material when you have it; skills whose materials are all ticked get crossed out.\nX - removes a skill or spell from the plan.\n\nTo add or change picks, open the class (Menu > Classes) and press Build Plan there.',
        'keys': {},
    },
    {
        'when': 'path',
        'match': '^/equipment',
        'title': 'Items',
        'body': 'Filter by category and class, search by name, and click a stat on a card to sort by it. Cards and List views are both available.\n\nCompare Equipment - turn it on, then tick as many items as you like. In the Compare window pick an Enchant for each item to see its stats change (arrows mark changed numbers). Use + Copy to compare the same item with different enchants. Drag the corner to resize it, or press Auto-fit.\n\nItems sold in shops or by Mythic leaders show where to buy them.',
        'keys': {},
    },
    {
        'when': 'path',
        'match': '^/quests',
        'title': 'Quests',
        'body': 'Browse the quest guides and open one for its step-by-step walkthrough. Use the Back and Forward buttons in the bar above to move between pages, and Reload if a page looks stuck.',
        'keys': {},
    },
    {
        'when': 'path',
        'match': '^/professions',
        'title': 'Professions',
        'body': 'Pick a profession to see how it works and its recipe tables. Use the rank tabs to narrow a table to one rank, the search box to find a recipe, and click a column heading to sort.',
        'keys': {},
    },
    {
        'when': 'path',
        'match': '^/calculators',
        'title': 'Calculators',
        'body': 'Pick a calculator from the list. For the HP/MP or Stat Calculator in its own small window, use Menu > Tools.',
        'keys': {},
    },
    {
        'when': 'path',
        'match': '^/hunting',
        'title': 'Hunting',
        'body': 'Hunting areas list their monsters, bosses and drops. Open an area for its details, and use Back to return to the list.',
        'keys': {},
    },
    {
        'when': 'path',
        'match': '^/towns',
        'title': 'Towns',
        'body': 'Towns list their NPCs and shops, so you can see where to buy things. Open a town for the full list.',
        'keys': {},
    },
    {
        'when': None,
        'match': None,
        'title': 'Unora Wiki',
        'body': "This is the Unora Wiki. Use the site's own menu to move around, or press Menu in the bar above to jump to Classes, Items, Quests, Professions or the Build Planner.\n\nBack, Forward and Reload work like a browser. Pin keeps this window on top of the game. Options changes keys, colours and size.",
        'keys': {},
    },
]
# <<< SYNCED FROM UnoraOverlay.ahk

# Linux only.
UPDATE_BASE = "https://www.unora.wiki/ahk/linux/"   # version.txt + unora_overlay.py for Linux are hosted here
SCRIPT_PATH = os.path.realpath(__file__)
SCRIPT_DIR = os.path.dirname(SCRIPT_PATH)
SETTINGS_FILE = os.path.join(SCRIPT_DIR, "settings.cfg")
KEYBINDS_FILE = os.path.join(SCRIPT_DIR, "keybinds.cfg")
DATA_DIR = os.path.join(SCRIPT_DIR, "data")
PROFILE_DIR = os.path.join(DATA_DIR, "WebKit")    # the overlay's own browser storage (remembers planner picks)
ICON_FILE = os.path.join(SCRIPT_DIR, "UnoraOverlay.png")
LAUNCHER = os.path.join(SCRIPT_DIR, "UnoraOverlay.sh")
AUTOSTART_FILE = os.path.join(os.environ.get("XDG_CONFIG_HOME") or os.path.expanduser("~/.config"),
                              "autostart", "unora-overlay.desktop")

# Key names (Windows overlay syntax) <-> X11 keysym names.
KEY_TO_SYM = {
    "Space": "space", "Enter": "Return", "Tab": "Tab", "Escape": "Escape", "Esc": "Escape",
    "Backspace": "BackSpace", "Home": "Home", "End": "End", "PgUp": "Prior", "PgDn": "Next",
    "Insert": "Insert", "Ins": "Insert", "Delete": "Delete", "Del": "Delete",
    "Up": "Up", "Down": "Down", "Left": "Left", "Right": "Right",
    "Pause": "Pause", "ScrollLock": "Scroll_Lock", "PrintScreen": "Print", "AppsKey": "Menu",
    "NumpadAdd": "KP_Add", "NumpadSub": "KP_Subtract", "NumpadMult": "KP_Multiply",
    "NumpadDiv": "KP_Divide", "NumpadDot": "KP_Decimal", "NumpadEnter": "KP_Enter",
    ",": "comma", ".": "period", "/": "slash", ";": "semicolon", "'": "apostrophe",
    "[": "bracketleft", "]": "bracketright", "-": "minus", "=": "equal", "`": "grave", "\\": "backslash",
}
SYM_TO_KEY = {v: k for k, v in KEY_TO_SYM.items() if k not in ("Esc", "Ins", "Del")}
for _i in range(10):
    KEY_TO_SYM["Numpad%d" % _i] = "KP_%d" % _i
    SYM_TO_KEY["KP_%d" % _i] = "Numpad%d" % _i
MOUSE_BUTTONS = {"MButton": 2, "XButton1": 8, "XButton2": 9}
MOUSE_NAMES = {"MButton": "Middle click", "XButton1": "Mouse 4 (side)", "XButton2": "Mouse 5 (side)"}

# Lets the wiki talk to the overlay the same way it does on Windows (window.chrome.webview).
WEBVIEW_SHIM = """
(function () {
  var h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.unora;
  if (!h) return;
  window.chrome = window.chrome || {};
  if (!window.chrome.webview) {
    window.chrome.webview = {
      postMessage: function (m) { try { h.postMessage(typeof m === 'string' ? m : JSON.stringify(m)); } catch (e) {} },
      addEventListener: function () {},
      removeEventListener: function () {}
    };
  }
})();
"""
# WebKitGTK draws drop-downs and other form controls light unless told the page is dark.
WEBVIEW_CSS = "html.dark { color-scheme: dark; }"

# ───────────────────────── State ─────────────────────────

Settings = {}
Keybinds = {}
CurrentUrl = ""
FirstRun = not os.path.exists(SETTINGS_FILE)
Hk = None              # global keybinds (X11)
Tray = None
Toast = None
MainWin = None         # the wiki window
MiniWin = None         # the small Build Planner window
CalcWin = None         # the small HP/MP Calculator window
StatWin = None         # the small Stat Calculator window
MenuWin = None
OptWin = None
HelpWin = None
UpdateWin = None
WebCtx = None          # shared browser storage for every window
Started = False
WatchTimer = 0
CssProvider = None


def Theme():
    return THEMES[Settings["Theme"]]


# ───────────────────────── Settings files ─────────────────────────

def _read_ini(path):
    cp = configparser.ConfigParser(interpolation=None, strict=False)
    cp.optionxform = str
    try:
        with open(path, encoding="utf-8-sig") as f:
            cp.read_file(f)
    except (OSError, configparser.Error):
        pass
    return cp


def LoadConfig():
    cp = _read_ini(SETTINGS_FILE)
    for key, d in DEFAULTS.items():
        Settings[key] = cp.get("General", key, fallback=d)
    kp = _read_ini(KEYBINDS_FILE)
    for a in ACTIONS:
        k = kp.get("Keybinds", a["id"], fallback=a["key"])
        Keybinds[a["id"]] = "" if k == "None" else k
    if Settings["Theme"] not in THEMES:
        Settings["Theme"] = "Unora"


def _write_ini(path, section, values):
    cp = configparser.ConfigParser(interpolation=None)
    cp.optionxform = str
    cp[section] = {k: str(v) for k, v in values.items()}
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        cp.write(f, space_around_delimiters=False)
    os.replace(tmp, path)


def SaveConfig():
    try:
        _write_ini(SETTINGS_FILE, "General", Settings)
        _write_ini(KEYBINDS_FILE, "Keybinds", {a["id"]: Keybinds[a["id"]] or "None" for a in ACTIONS})
    except OSError as e:
        MsgBox("Could not save your settings next to the script.\nTry moving the " + APP_NAME
               + " folder somewhere you can write to (like your home folder).\n\n" + str(e), warn=True)


# ───────────────────────── Keys ─────────────────────────

def SplitKey(k):
    mods = ""
    while k and k[0] in "^!+#" and len(k) > 1:
        mods += k[0]
        k = k[1:]
    return mods, k


def PrettyKey(k):
    if not k:
        return "(not set)"
    mods, name = SplitKey(k)
    out = "".join({"^": "Ctrl+", "!": "Alt+", "+": "Shift+", "#": "Super+"}[c] for c in mods)
    if name in MOUSE_NAMES:
        return out + MOUSE_NAMES[name]
    return out + name[:1].upper() + name[1:]


def KeySym(name):
    """X keysym for a key name in the Windows overlay syntax (0 if unknown)."""
    sym = KEY_TO_SYM.get(name)
    if sym is None:
        if len(name) == 1:
            sym = name.lower()
        elif re.fullmatch(r"F\d{1,2}", name, re.I):
            sym = name.upper()
        else:
            sym = name
    return XK.string_to_keysym(sym)


class Hotkeys:
    """Global keybinds: X11 passive grabs on the root window, read from the GLib main loop."""

    def __init__(self):
        self.d = None
        self.error = ""
        self.keys = {}       # (keycode, mods) -> action id
        self.buttons = {}    # (button, mods) -> action id
        self.released = {}   # keycode -> time of its last release (to skip key auto-repeat)
        if X is None:
            self.error = "python3-xlib is not installed"
            return
        try:
            self.d = xdisplay.Display()
        except Exception as e:
            self.error = str(e)
            return
        self.root = self.d.screen().root
        self.modmask = X.ControlMask | X.Mod1Mask | X.ShiftMask | X.Mod4Mask
        num = X.Mod2Mask
        try:
            nl = self.d.keysym_to_keycode(XK.string_to_keysym("Num_Lock"))
            for i, codes in enumerate(self.d.get_modifier_mapping()):
                if nl and nl in codes:
                    num = 1 << i
        except Exception:
            pass
        # Grab each key with and without Caps Lock / Num Lock, or it only works with them off.
        self.extra = [0, X.LockMask, num, X.LockMask | num]
        GLib.io_add_watch(self.d.fileno(), GLib.PRIORITY_DEFAULT, GLib.IO_IN, self._on_x)
        GLib.timeout_add(100, self._on_x)

    @staticmethod
    def _mods(prefix):
        m = 0
        for c in prefix:
            m |= {"^": X.ControlMask, "!": X.Mod1Mask, "+": X.ShiftMask, "#": X.Mod4Mask}[c]
        return m

    def clear(self):
        if not self.d:
            return
        for (code, mods) in self.keys:
            for e in self.extra:
                self.root.ungrab_key(code, mods | e)
        for (btn, mods) in self.buttons:
            for e in self.extra:
                self.root.ungrab_button(btn, mods | e)
        self.keys = {}
        self.buttons = {}
        self.d.sync()

    def set(self, binds):
        """binds: list of (key, action id). Returns [(key, action id, reason)] for keys that failed."""
        self.clear()
        failed = []
        if not self.d:
            return [(k, a, self.error) for k, a in binds]
        for key, aid in binds:
            prefix, name = SplitKey(key)
            mods = self._mods(prefix)
            ec = xerror.CatchError(xerror.BadAccess)
            if name in MOUSE_BUTTONS:
                btn = MOUSE_BUTTONS[name]
                for e in self.extra:
                    self.root.grab_button(btn, mods | e, False, X.ButtonPressMask | X.ButtonReleaseMask,
                                          X.GrabModeAsync, X.GrabModeAsync, X.NONE, X.NONE, onerror=ec)
                self.d.sync()
                if ec.get_error():
                    for e in self.extra:
                        self.root.ungrab_button(btn, mods | e)
                    failed.append((key, aid, "Another program is already using it."))
                else:
                    self.buttons[(btn, mods)] = aid
                continue
            sym = KeySym(name)
            code = self.d.keysym_to_keycode(sym) if sym else 0
            if not code:
                failed.append((key, aid, "That key was not found on this keyboard."))
                continue
            for e in self.extra:
                self.root.grab_key(code, mods | e, True, X.GrabModeAsync, X.GrabModeAsync, onerror=ec)
            self.d.sync()
            if ec.get_error():
                for e in self.extra:
                    self.root.ungrab_key(code, mods | e)
                failed.append((key, aid, "Another program is already using it."))
            else:
                self.keys[(code, mods)] = aid
        self.d.sync()
        return failed

    def _on_x(self, *args):
        self.drain()
        return True

    def drain(self):
        if not self.d:
            return
        try:
            while self.d.pending_events():
                ev = self.d.next_event()
                if ev.type == X.KeyRelease:
                    self.released[ev.detail] = ev.time
                    continue
                if ev.type == X.KeyPress:
                    if self.released.get(ev.detail) == ev.time:
                        continue      # auto-repeat while the key is held
                    aid = self.keys.get((ev.detail, ev.state & self.modmask))
                elif ev.type == X.ButtonPress:
                    aid = self.buttons.get((ev.detail, ev.state & self.modmask))
                else:
                    continue
                if aid:
                    GLib.idle_add(RunAction, aid)
        except Exception:
            pass

    # Screen helpers (device pixels, the same units as the game window).

    def pointer(self):
        p = self.root.query_pointer()
        return p.root_x, p.root_y

    def client_rect_under_pointer(self):
        """Screen rectangle of the inside of the program window under the mouse."""
        wm_state = self.d.intern_atom("WM_STATE")
        win = self.root.query_pointer().child
        for _ in range(12):
            if not win:
                return None
            if win.get_full_property(wm_state, X.AnyPropertyType) is not None:
                break
            win = win.query_pointer().child
        g = win.get_geometry()
        t = self.root.translate_coords(win, 0, 0)
        return t.x, t.y, g.width, g.height

    def screen_size(self):
        s = self.d.screen()
        return s.width_in_pixels, s.height_in_pixels

    def grab_png(self, x, y, w, h, path):
        """Saves a picture of part of the screen as a PNG (black where it is off the screen)."""
        sw, sh = self.screen_size()
        out = bytearray(w * h * 3)
        cx0, cy0 = max(x, 0), max(y, 0)
        cx1, cy1 = min(x + w, sw), min(y + h, sh)
        if cx1 > cx0 and cy1 > cy0:
            cw, ch = cx1 - cx0, cy1 - cy0
            img = self.root.get_image(cx0, cy0, cw, ch, X.ZPixmap, 0xFFFFFFFF)
            data = img.data if isinstance(img.data, (bytes, bytearray)) else img.data.encode("latin-1")
            stride = len(data) // ch
            for row in range(ch):
                src = data[row * stride: row * stride + cw * 4]
                line = bytearray(cw * 3)
                line[0::3] = src[2::4]
                line[1::3] = src[1::4]
                line[2::3] = src[0::4]
                o = ((cy0 - y + row) * w + (cx0 - x)) * 3
                out[o:o + cw * 3] = line
        pb = GdkPixbuf.Pixbuf.new_from_bytes(GLib.Bytes.new(bytes(out)), GdkPixbuf.Colorspace.RGB, False, 8, w, h, w * 3)
        pb.savev(path, "png", [], [])

    def window_titles(self):
        titles = []
        try:
            lst = self.root.get_full_property(self.d.intern_atom("_NET_CLIENT_LIST"), X.AnyPropertyType)
            net_name = self.d.intern_atom("_NET_WM_NAME")
            utf8 = self.d.intern_atom("UTF8_STRING")
            for wid in (lst.value if lst else []):
                w = self.d.create_resource_object("window", wid)
                try:
                    p = w.get_full_property(net_name, utf8)
                    t = p.value if p else w.get_wm_name()
                    if isinstance(t, bytes):
                        t = t.decode("utf-8", "replace")
                    titles.append(t or "")
                except Exception:
                    pass
        except Exception:
            pass
        return titles


def RegisterHotkeys(silent=False):
    binds = [(Keybinds[a["id"]], a["id"]) for a in ACTIONS if Keybinds[a["id"]]]
    failed = Hk.set(binds)
    if silent:
        return
    if Hk.error and binds:
        MsgBox("Keybinds cannot work on this desktop (" + Hk.error + ").\n"
               "Use the tray icon menu instead. Keybinds need an X11 session (see README.txt).", warn=True)
        return
    for key, aid, why in failed:
        label = next(a["label"] for a in ACTIONS if a["id"] == aid)
        MsgBox("The key '" + PrettyKey(key) + "' for '" + label + "' could not be used.\nChoose another one in Options.\n\n" + why, warn=True)


def SuspendHotkeys():
    Hk.set([])


ACTION_FNS = {}


def RunAction(aid):
    ACTION_FNS[aid]()
    return False


# ───────────────────────── Small GUI helpers ─────────────────────────

def ApplyCss():
    global CssProvider
    th = Theme()
    css = """
    .unora-panel { background-color: #%(panel)s; }
    .unora-bg { background-color: #%(bg)s; }
    .unora-bg label, .unora-bg checkbutton label { color: #%(text)s; }
    .unora-bg label.unora-accent, label.unora-accent { color: #%(accent)s; font-weight: bold; }
    .unora-bg label.unora-muted, label.unora-muted { color: #%(muted)s; }
    .unora-sep { background-color: #%(muted)s; min-height: 1px; }
    button.unora-btn {
        background-image: none; background-color: #%(btn)s; color: #%(btnText)s;
        border: 1px solid #%(muted)s; border-radius: 0; box-shadow: none; text-shadow: none;
        padding: 0 6px; min-height: 0; min-width: 0;
    }
    button.unora-btn label { color: #%(btnText)s; }
    button.unora-btn:hover { background-color: mix(#%(btn)s, #%(accent)s, 0.18); }
    button.unora-btn:active { background-color: mix(#%(btn)s, #%(accent)s, 0.35); }
    button.unora-big label { font-size: 11pt; font-weight: bold; }
    label.unora-h1 { font-size: 15pt; }
    label.unora-h2 { font-size: 13pt; }
    label.unora-h3 { font-size: 10pt; }
    label.unora-small { font-size: 8pt; }
    .unora-toast { background-color: #%(panel)s; border: 1px solid #%(accent)s; padding: 6px 12px; }
    .unora-toast label { color: #%(text)s; }
    """ % th
    screen = Gdk.Screen.get_default()
    if CssProvider:
        Gtk.StyleContext.remove_provider_for_screen(screen, CssProvider)
    CssProvider = Gtk.CssProvider()
    CssProvider.load_from_data(css.encode())
    Gtk.StyleContext.add_provider_for_screen(screen, CssProvider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
    Gtk.Settings.get_default().set_property("gtk-application-prefer-dark-theme", bool(th["dark"]))
    for w in (MainWin, MiniWin, CalcWin, StatWin):
        if w:
            w.recolor()


def Cls(widget, *names):
    for n in names:
        widget.get_style_context().add_class(n)
    return widget


def MakeButton(text, w, h, fn, *classes):
    """A themed button."""
    b = Gtk.Button(label=text)
    b.set_size_request(w, h)
    b.set_relief(Gtk.ReliefStyle.NONE)
    b.set_can_focus(False)
    b.connect("clicked", lambda *a: fn())
    return Cls(b, "unora-btn", *classes)


def MakeLabel(text, *classes, width=0, wrap=False):
    lb = Gtk.Label(label=text)
    lb.set_xalign(0)
    if wrap:
        lb.set_line_wrap(True)
        lb.set_max_width_chars(1)
    if width:
        lb.set_size_request(width, -1)
    return Cls(lb, *classes)


def Section(box, text):
    t = MakeLabel(text, "unora-accent", "unora-h3")
    t.set_margin_top(18)
    box.pack_start(t, False, False, 0)
    sep = Cls(Gtk.Box(), "unora-sep")
    sep.set_size_request(480, 1)
    sep.set_margin_top(2)
    box.pack_start(sep, False, False, 0)


def NewDialog(title, ontop=True, tool=False):
    g = Gtk.Window(title=title)
    Cls(g, "unora-bg")
    g.set_resizable(False)
    g.set_keep_above(ontop)
    g.set_position(Gtk.WindowPosition.CENTER)
    if tool:
        g.set_type_hint(Gdk.WindowTypeHint.UTILITY)
    g.connect("key-press-event", lambda w, e: (w.destroy(), True)[1] if e.keyval == Gdk.KEY_Escape else False)
    return g


def MsgBox(text, warn=False, info=False, timeout=0):
    kind = Gtk.MessageType.WARNING if warn else Gtk.MessageType.INFO
    d = Gtk.MessageDialog(message_type=kind, buttons=Gtk.ButtonsType.OK, text=text)
    d.set_title(APP_NAME)
    d.set_keep_above(True)
    d.set_position(Gtk.WindowPosition.CENTER)
    if timeout:
        GLib.timeout_add(timeout * 1000, lambda: (d.response(Gtk.ResponseType.OK), False)[1])
    d.run()
    d.destroy()


def Notify(text, title):
    """A desktop notification (the Windows tray balloon)."""
    try:
        args = ["notify-send", "-a", APP_NAME, title, text]
        if os.path.exists(ICON_FILE):
            args[1:1] = ["-i", ICON_FILE]
        subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except OSError:
        ShowToast(title + " - " + text, 4000)


def PointerLogical():
    seat = Gdk.Display.get_default().get_default_seat()
    _, x, y = seat.get_pointer().get_position()
    return x, y


def MonitorAt(x, y):
    disp = Gdk.Display.get_default()
    m = disp.get_monitor_at_point(x, y) or disp.get_primary_monitor() or disp.get_monitor(0)
    return m.get_geometry()


def PlaceWindow(win, prefix):
    """Restores a window's saved size and position (if it is still on the screen)."""
    try:
        w, h = int(Settings[prefix + "W"]), int(Settings[prefix + "H"])
    except ValueError:
        w, h = int(DEFAULTS[prefix + "W"]), int(DEFAULTS[prefix + "H"])
    win.resize(w, h)
    try:
        x, y = int(Settings[prefix + "X"]), int(Settings[prefix + "Y"])
    except ValueError:
        return
    scr = Gdk.Screen.get_default()
    sw, sh = scr.get_width(), scr.get_height()
    if x > -(w - 100) and y > -20 and x < sw - 100 and y < sh - 100:
        win.move(x, y)


def NewWebView(on_message=None):
    global WebCtx
    if WebCtx is None:
        os.makedirs(PROFILE_DIR, exist_ok=True)
        dm = WebKit2.WebsiteDataManager(base_data_directory=PROFILE_DIR,
                                        base_cache_directory=os.path.join(PROFILE_DIR, "cache"))
        WebCtx = WebKit2.WebContext.new_with_website_data_manager(dm)
        dm.get_cookie_manager().set_persistent_storage(os.path.join(PROFILE_DIR, "cookies.sqlite"),
                                                       WebKit2.CookiePersistentStorage.SQLITE)
    ucm = WebKit2.UserContentManager()
    ucm.add_script(WebKit2.UserScript(WEBVIEW_SHIM, WebKit2.UserContentInjectedFrames.TOP_FRAME,
                                      WebKit2.UserScriptInjectionTime.START, None, None))
    ucm.add_style_sheet(WebKit2.UserStyleSheet(WEBVIEW_CSS, WebKit2.UserContentInjectedFrames.ALL_FRAMES,
                                               WebKit2.UserStyleLevel.USER, None, None))
    ucm.register_script_message_handler("unora")
    if on_message:
        ucm.connect("script-message-received::unora", on_message)
    wv = WebKit2.WebView(web_context=WebCtx, user_content_manager=ucm)
    wv.connect("create", OnNewWindow)
    s = wv.get_settings()
    s.set_enable_developer_extras(False)
    s.set_enable_back_forward_navigation_gestures(True)
    SetWebBg(wv)
    return wv


def SetWebBg(wv):
    c = Gdk.RGBA()
    c.parse("#" + Theme()["bg"])
    wv.set_background_color(c)


def MessageText(js_result):
    try:
        return js_result.get_js_value().to_string()
    except AttributeError:
        return js_result.to_string()


# Links that want a new window open in the overlay instead.
def OnNewWindow(webview, action):
    uri = action.get_request().get_uri()
    if uri:
        webview.load_uri(uri)
    return None


def RunJs(wv, js):
    try:
        wv.evaluate_javascript(js, -1, None, None, None, None, None)
    except (AttributeError, TypeError):
        wv.run_javascript(js, None, None, None)


# ───────────────────────── Overlay windows ─────────────────────────

class OverlayWindow(Gtk.Window):
    """A window that holds the wiki (or one page of it): remembers its place, fades, stays on top."""

    prefix = ""

    def __init__(self, title, min_w, min_h):
        super().__init__(title=title)
        Cls(self, "unora-panel")
        self.maximized = False
        self.wv = None
        hints = Gdk.Geometry()
        hints.min_width, hints.min_height = min_w, min_h
        self.set_geometry_hints(None, hints, Gdk.WindowHints.MIN_SIZE)
        self.connect("delete-event", self.on_close)
        self.connect("window-state-event", self.on_state)
        self.box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        self.add(self.box)

    def on_state(self, w, ev):
        self.maximized = bool(ev.new_window_state & (Gdk.WindowState.MAXIMIZED | Gdk.WindowState.FULLSCREEN))

    def on_close(self, *a):
        self.hide_win()
        return True    # hide instead of closing, so the page is still there next time

    def is_shown(self):
        return self.get_visible()

    def save_geometry(self):
        if not self.get_visible() or self.maximized:
            return
        x, y = self.get_position()
        w, h = self.get_size()
        p = self.prefix
        Settings[p + "X"], Settings[p + "Y"], Settings[p + "W"], Settings[p + "H"] = str(x), str(y), str(w), str(h)

    def show_win(self):
        if not self.get_visible():
            PlaceWindow(self, self.prefix)
            self.show_all()
        self.present()
        self.set_keep_above(Settings["AlwaysOnTop"] == "1")
        FadeTick(True)

    def hide_win(self):
        self.save_geometry()
        self.hide()

    def recolor(self):
        if self.wv:
            SetWebBg(self.wv)


class MainWindow(OverlayWindow):
    """The main wiki window: a toolbar and the website."""

    prefix = "Win"

    def __init__(self):
        super().__init__(APP_NAME, 560, 380)
        bar = Cls(Gtk.Box(spacing=4), "unora-panel")
        bar.set_size_request(-1, TB_H)
        bar.set_margin_start(6)
        bar.set_margin_end(6)
        bh = TB_H - 10
        for label, w, fn in (("Back", 50, NavBack), ("Forward", 64, NavForward), ("Reload", 58, NavReload),
                             ("Menu", 54, ShowMenu), ("Planner", 66, OpenPlanner)):
            b = MakeButton(label, w, bh, fn)
            b.set_valign(Gtk.Align.CENTER)
            bar.pack_start(b, False, False, 0)
        self.pin = MakeButton("Pin", 70, bh, TogglePin)
        self.pin.set_valign(Gtk.Align.CENTER)
        bar.pack_start(self.pin, False, False, 0)
        for label, w, fn in (("?", 34, ShowHelp), ("Options", 66, ShowOptions)):
            b = MakeButton(label, w, bh, fn)
            b.set_valign(Gtk.Align.CENTER)
            bar.pack_end(b, False, False, 0)
        self.box.pack_start(bar, False, False, 0)
        self.wv = NewWebView()
        self.wv.connect("notify::uri", self.on_uri)
        self.box.pack_start(self.wv, True, True, 0)
        self.update_pin()
        self.loaded = False

    def on_uri(self, wv, *a):
        global CurrentUrl
        CurrentUrl = wv.get_uri() or ""

    def update_pin(self):
        self.pin.set_label("Pin: on" if Settings["AlwaysOnTop"] == "1" else "Pin: off")

    def open(self, route="/"):
        self.show_win()
        ApplyZoom()
        if not self.loaded:
            self.loaded = True
            self.wv.load_uri(Settings["BaseUrl"] + route)


class MiniWindow(OverlayWindow):
    """A small window with one page of the site and a slim bar (title + ?)."""

    def __init__(self, prefix, title, bar_title, help_ctx, route, min_w, min_h, keep_page=True, on_message=None):
        super().__init__(title, min_w, min_h)
        self.prefix = prefix
        self.route = route
        self.keep_page = keep_page
        bar = Cls(Gtk.Box(), "unora-panel")
        bar.set_size_request(-1, MINI_TB)
        t = MakeLabel(bar_title, "unora-accent", "unora-h3")
        t.set_margin_start(10)
        bar.pack_start(t, False, False, 0)
        q = MakeButton("?", 34, MINI_TB - 8, lambda: ShowHelpFor(help_ctx))
        q.set_valign(Gtk.Align.CENTER)
        q.set_margin_end(6)
        bar.pack_end(q, False, False, 0)
        self.box.pack_start(bar, False, False, 0)
        self.wv = NewWebView(on_message)
        self.box.pack_start(self.wv, True, True, 0)
        self.loaded = False

    def open(self):
        self.show_win()
        if not self.loaded:
            self.loaded = True
            self.wv.load_uri(Settings["BaseUrl"] + self.route)
        elif not self.keep_page:
            self.wv.reload()      # pick up anything changed in the main window

    def toggle(self):
        if self.is_shown():
            self.hide_win()
        else:
            self.open()


MiniReady = False      # true once the Build Planner page has loaded


def OnMiniMessage(ucm, js_result):
    global MiniReady
    msg = MessageText(js_result) or ""
    if msg == "ready":
        MiniReady = True
        return
    if msg:
        ShowToast(msg, 3500)


def GetMain():
    global MainWin
    if not MainWin:
        MainWin = MainWindow()
    return MainWin


def GetMini():
    global MiniWin
    if not MiniWin:
        MiniWin = MiniWindow("Mini", "Unora Build Planner", "Build Planner", "planner", ROUTES["PlannerMini"],
                             320, 260, keep_page=False, on_message=OnMiniMessage)
    return MiniWin


def GetCalc():
    global CalcWin
    if not CalcWin:
        CalcWin = MiniWindow("Calc", "Unora HP/MP Calculator", "HP/MP Calculator", "calc", ROUTES["CalcMini"], 420, 300)
    return CalcWin


def GetStat():
    global StatWin
    if not StatWin:
        StatWin = MiniWindow("Stat", "Unora Stat Calculator", "Stat Calculator", "stat", ROUTES["StatMini"], 420, 320)
    return StatWin


def IsMainVisible():
    return bool(MainWin and MainWin.is_shown())


def ShowMain(route="/"):
    GetMain().open(route)


def ToggleWindow():
    if IsMainVisible():
        MainWin.hide_win()
    else:
        ShowMain()


def NavTo(route):
    fresh = not (MainWin and MainWin.loaded)
    ShowMain(route)
    if not fresh:
        MainWin.wv.load_uri(Settings["BaseUrl"] + route)


def NavBack():
    if MainWin and MainWin.wv.can_go_back():
        MainWin.wv.go_back()


def NavForward():
    if MainWin and MainWin.wv.can_go_forward():
        MainWin.wv.go_forward()


def NavReload():
    if MainWin:
        MainWin.wv.reload()


def OpenPlanner():
    global MiniReady
    m = GetMini()
    if not m.is_shown():
        MiniReady = False
    m.toggle()


def ShowMini():
    global MiniReady
    MiniReady = False
    GetMini().open()


def OpenCalc():
    GetCalc().toggle()


def OpenStat():
    GetStat().toggle()


def ApplyWindowSettings():
    ontop = Settings["AlwaysOnTop"] == "1"
    for w in (MainWin, MiniWin, CalcWin, StatWin):
        if w:
            w.set_keep_above(ontop)
    if MainWin:
        MainWin.update_pin()
    FadeTick(True)


def TogglePin():
    Settings["AlwaysOnTop"] = "0" if Settings["AlwaysOnTop"] == "1" else "1"
    ApplyWindowSettings()
    SaveConfig()


def ApplyZoom():
    if MainWin:
        try:
            MainWin.wv.set_zoom_level(int(Settings["Zoom"]) / 100)
        except ValueError:
            pass


# "Fade when not in use": a window is fully solid while the mouse is over it or it is the
# active window, and fades to the Options level otherwise (so the game shows through).
FadeLevels = {}


def FadeTick(force=False):
    global FadeLevels
    if force:
        FadeLevels = {}
    try:
        op = int(Settings["Opacity"])
    except ValueError:
        op = 100
    try:
        px, py = PointerLogical()
    except Exception:
        px = py = -99999
    for w in (MainWin, MiniWin, CalcWin, StatWin):
        if not w or not w.get_visible():
            continue
        gw = w.get_window()
        if not gw:
            continue
        r = gw.get_frame_extents()
        under = r.x <= px < r.x + r.width and r.y <= py < r.y + r.height
        solid = op >= 100 or under or w.is_active()
        level = 1.0 if solid else op / 100
        if FadeLevels.get(id(w)) == level:
            continue
        FadeLevels[id(w)] = level
        Gtk.Widget.set_opacity(w, level)
    return True


# ───────────────────────── Add a skill from the game screen ─────────────────────────
# Middle-click (default Ctrl+Alt+Middle click) on a skill or spell in the game: the overlay
# takes a small picture of the screen around the mouse and hands it to the Build Planner
# page, which reads the game's pixel font, finds the matching skill/spell and adds it.

class ToastWin:
    """A short message away from the mouse (so it never covers the text being read)."""

    def __init__(self):
        self.win = Gtk.Window(type=Gtk.WindowType.POPUP)
        self.win.set_keep_above(True)
        self.win.set_accept_focus(False)
        box = Cls(Gtk.Box(), "unora-toast")
        self.label = Gtk.Label()
        self.label.set_max_width_chars(60)
        self.label.set_line_wrap(True)
        box.add(self.label)
        self.win.add(box)
        self.timer = 0

    def show(self, text, ms):
        self.label.set_text(text)
        self.win.resize(1, 1)
        x, y = PointerLogical()
        m = MonitorAt(x, y)
        self.win.show_all()
        w, h = self.win.get_size()
        ty = m.y + m.height - 120 if y - m.y < 200 else m.y + 24
        self.win.move(m.x + (m.width - w) // 2, ty)
        if self.timer:
            GLib.source_remove(self.timer)
        self.timer = GLib.timeout_add(ms, self.hide)

    def hide(self):
        self.timer = 0
        self.win.hide()
        return False


def ShowToast(text, ms=2500):
    global Toast
    if not Toast:
        Toast = ToastWin()
    Toast.show(text, ms)


AddBusy = False


def AddSkillAtCursor():
    global AddBusy
    if AddBusy:
        return
    AddBusy = True
    try:
        DoAddSkill()
    except Exception as e:
        ShowToast("Could not add the skill: " + str(e), 4000)
        AddBusy = False


def DoAddSkill():
    global AddBusy
    if not Hk.d:
        raise RuntimeError("the screen cannot be read on this desktop (X11 is needed)")
    mx, my = Hk.pointer()
    # Work out how big the game picture is on screen, for any window size. The game draws 640x480
    # and stretches it to the window, so one game pixel = (window width / 640) screen pixels. A window
    # that is not 4:3 has bars around the picture, which are centred. These are only hints for the
    # Build Planner page; if they are off it still tries other sizes.
    gs = gx = gy = 0
    try:
        r = Hk.client_rect_under_pointer()
        if r:
            clx, cly, cw, ch = r
            if cw >= 320 and ch >= 240:
                gs = min(cw / 640, ch / 480)
                gx = clx + (cw - 640 * gs) / 2
                gy = cly + (ch - 480 * gs) / 2
                if gs < 0.9 or gs > 6:
                    gs = 0
    except Exception:
        gs = 0
    sc = gs if gs > 0 else 2
    rw, rh = round(360 * sc), round(50 * sc)
    rx, ry = mx - round(150 * sc), my - round(25 * sc)
    os.makedirs(DATA_DIR, exist_ok=True)
    png = os.path.join(DATA_DIR, "ocr-last.png")
    ShowToast("Reading the skill name...", 10000)
    try:
        Hk.grab_png(rx, ry, rw, rh, png)
        with open(png, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")
    except Exception as e:
        ShowToast("Could not take a picture of the screen. " + str(e), 4000)
        AddBusy = False
        return
    hint = "%s,%s,%s" % (round(gs, 4), round(gx - rx, 2), round(gy - ry, 2)) if gs > 0 else "0,0,0"
    js = 'window.unoraAddFromImage("data:image/png;base64,%s",%d,%d,%s)' % (b64, mx - rx, my - ry, hint)

    def send():
        global AddBusy
        RunJs(MiniWin.wv, js)
        AddBusy = False

    if MiniReady:
        send()
        return
    ShowMini()
    started = time.monotonic()

    def wait():
        global AddBusy
        if MiniReady:
            send()
            return False
        if time.monotonic() - started > 8:
            ShowToast("The Build Planner window did not start.", 3500)
            AddBusy = False
            return False
        return True

    GLib.timeout_add(200, wait)


# ───────────────────────── Menu (the pop-up) ─────────────────────────

def ShowMenu():
    global MenuWin
    CloseMenu()
    g = NewDialog(APP_NAME, tool=True)
    MenuWin = g
    g.connect("destroy", lambda *a: _menu_gone(g))
    grid = Gtk.Grid(column_spacing=8, row_spacing=8)
    grid.set_margin_start(16)
    grid.set_margin_end(16)
    grid.set_margin_top(12)
    grid.set_margin_bottom(14)
    g.add(grid)

    title = MakeLabel("Unora Wiki", "unora-accent", "unora-h1")
    title.set_size_request(-1, 30)
    grid.attach(title, 0, 0, 1, 1)
    q = MakeButton("?", 34, 26, lambda: ShowHelpFor("menu"))
    q.set_halign(Gtk.Align.END)
    q.set_valign(Gtk.Align.CENTER)
    grid.attach(q, 1, 0, 1, 1)

    grid.attach(MakeButton("Classes", 128, 46, lambda: MenuPick("Classes"), "unora-big"), 0, 1, 1, 1)
    grid.attach(MakeButton("Items", 128, 46, lambda: MenuPick("Items"), "unora-big"), 1, 1, 1, 1)
    grid.attach(MakeButton("Quests", 128, 46, lambda: MenuPick("Quests"), "unora-big"), 0, 2, 1, 1)
    grid.attach(MakeButton("Professions", 128, 46, lambda: MenuPick("Professions"), "unora-big"), 1, 2, 1, 1)

    tools = MakeLabel("Tools", "unora-accent", "unora-h1")
    tools.set_size_request(-1, 30)
    tools.set_margin_top(4)
    grid.attach(tools, 0, 3, 2, 1)
    grid.attach(MakeButton("Build Planner", 264, 46, lambda: MenuPick("Planner"), "unora-big"), 0, 4, 2, 1)
    grid.attach(MakeButton("HP/MP Calculator", 264, 46, lambda: MenuPick("Calc"), "unora-big"), 0, 5, 2, 1)
    grid.attach(MakeButton("Stat Calculator", 264, 46, lambda: MenuPick("Stat"), "unora-big"), 0, 6, 2, 1)

    o = MakeButton("Options", 128, 28, lambda: (CloseMenu(), ShowOptions()))
    o.set_margin_top(6)
    grid.attach(o, 0, 7, 1, 1)
    c = MakeButton("Close", 128, 28, CloseMenu)
    c.set_margin_top(6)
    grid.attach(c, 1, 7, 1, 1)

    foot = MakeLabel("Menu: " + PrettyKey(Keybinds["Menu"]) + "   Window: " + PrettyKey(Keybinds["Window"]),
                     "unora-muted", "unora-small")
    grid.attach(foot, 0, 8, 2, 1)
    g.show_all()
    g.present()


def _menu_gone(g):
    global MenuWin
    if MenuWin is g:
        MenuWin = None


def CloseMenu():
    if MenuWin:
        MenuWin.destroy()


def MenuPick(name):
    CloseMenu()
    if name == "Planner":
        ShowMini()
    elif name == "Calc":
        GetCalc().open()
    elif name == "Stat":
        GetStat().open()
    else:
        NavTo(ROUTES[name])


# ───────────────────────── Help ( ? ) ─────────────────────────

def ShowHelp():
    ShowHelpFor("")


def ShowHelpFor(ctx):
    global HelpWin
    if ctx not in ("menu", "planner", "calc", "stat"):
        ctx = ""
    if HelpWin:
        HelpWin.destroy()
    title, body = HelpFor(ctx)
    g = NewDialog(APP_NAME + " - Help")
    HelpWin = g
    box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
    box.set_margin_start(18)
    box.set_margin_end(18)
    box.set_margin_top(14)
    box.set_margin_bottom(14)
    g.add(box)
    box.pack_start(MakeLabel(title, "unora-accent", "unora-h2", width=470), False, False, 0)
    sep = Cls(Gtk.Box(), "unora-sep")
    sep.set_margin_top(4)
    box.pack_start(sep, False, False, 0)
    b = MakeLabel(body, width=470, wrap=True)
    b.set_margin_top(10)
    box.pack_start(b, False, False, 0)
    k = MakeLabel("Keys:  Menu " + PrettyKey(Keybinds["Menu"]) + "   |   Show/hide window " + PrettyKey(Keybinds["Window"])
                  + "   |   Build Planner " + PrettyKey(Keybinds["Planner"]) + "   |   HP/MP Calculator " + PrettyKey(Keybinds["Calc"])
                  + "   |   Stat Calculator " + PrettyKey(Keybinds["Stat"])
                  + "   |   Options " + PrettyKey(Keybinds["Options"]), "unora-muted", width=470, wrap=True)
    k.set_margin_top(14)
    box.pack_start(k, False, False, 0)
    c = MakeButton("Close", 100, 28, g.destroy)
    c.set_halign(Gtk.Align.START)
    c.set_margin_top(14)
    box.pack_start(c, False, False, 0)
    g.show_all()
    g.present()


def HelpFor(ctx):
    path = "/"
    if ctx == "" and IsMainVisible() and CurrentUrl:
        m = re.search(r"#(/[^?]*)", CurrentUrl)
        if m:
            path = m.group(1)
    elif ctx == "":
        ctx = "menu"
    # The help pages themselves (HELP) are synced from UnoraOverlay.ahk, in the same order it checks them.
    for h in HELP:
        if h["when"] == "ctx" and ctx.lower() != h["match"].lower():
            continue
        if h["when"] == "path" and not re.search(h["match"], path):
            continue
        body = h["body"]
        for placeholder, aid in h["keys"].items():
            body = body.replace(placeholder, PrettyKey(Keybinds.get(aid, "")))
        return h["title"], body
    return "Unora Wiki", ""


# ───────────────────────── Options ─────────────────────────

class KeyBox(Gtk.Entry):
    """A box that records a key combination when you press it (Backspace clears it)."""

    def __init__(self, key):
        super().__init__()
        self.key = key
        self.set_editable(False)
        self.set_size_request(200, -1)
        self.set_text(PrettyKey(key) if key else "None")
        self.connect("key-press-event", self.on_key)
        # While a box is being edited, switch the keybinds off so they can be recorded.
        self.connect("focus-in-event", lambda *a: SuspendHotkeys())
        self.connect("focus-out-event", lambda *a: RegisterHotkeys(silent=True))

    def set_key(self, key):
        self.key = key
        self.set_text(PrettyKey(key) if key else "None")

    def on_key(self, w, ev):
        kv = ev.keyval
        if kv in (Gdk.KEY_Tab, Gdk.KEY_ISO_Left_Tab, Gdk.KEY_Escape):
            return False
        if kv == Gdk.KEY_BackSpace:
            self.set_key("")
            return True
        # The key itself, without Shift changing it (Shift+1 is still "1").
        keymap = Gdk.Keymap.get_for_display(Gdk.Display.get_default())
        ok, base, *_ = keymap.translate_keyboard_state(ev.hardware_keycode, 0, ev.group)
        if ok:
            kv = base
        name = Gdk.keyval_name(Gdk.keyval_to_lower(kv)) or ""
        if name in ("Control_L", "Control_R", "Alt_L", "Alt_R", "Shift_L", "Shift_R", "Super_L", "Super_R",
                    "Meta_L", "Meta_R", "ISO_Level3_Shift", "Caps_Lock", "Num_Lock"):
            return True
        if name in SYM_TO_KEY:
            key = SYM_TO_KEY[name]
        elif len(name) == 1:
            key = name
        elif re.fullmatch(r"F\d{1,2}", name):
            key = name
        else:
            return True
        st = ev.state
        mods = ("^" if st & Gdk.ModifierType.CONTROL_MASK else "") + ("!" if st & Gdk.ModifierType.MOD1_MASK else "") \
            + ("+" if st & Gdk.ModifierType.SHIFT_MASK else "") + ("#" if st & (Gdk.ModifierType.SUPER_MASK | Gdk.ModifierType.MOD4_MASK) else "")
        self.set_key(mods + key)
        return True


def ShowOptions():
    global OptWin
    if OptWin:
        OptWin.destroy()
    g = NewDialog(APP_NAME + " - Options")
    OptWin = g
    g.connect("destroy", lambda *a: _opt_gone(g))
    box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
    box.set_margin_start(18)
    box.set_margin_end(18)
    box.set_margin_top(14)
    box.set_margin_bottom(14)
    g.add(box)

    head = MakeLabel("Options", "unora-accent", "unora-h2")
    head.set_size_request(480, 30)
    box.pack_start(head, False, False, 0)

    def row(label, widget):
        r = Gtk.Box(spacing=8)
        r.set_margin_top(8)
        lb = MakeLabel(label, width=250)
        r.pack_start(lb, False, False, 0)
        widget.set_size_request(200, -1)
        r.pack_start(widget, False, False, 0)
        box.pack_start(r, False, False, 0)
        return widget

    Section(box, "Keybinds")
    hk = {}
    mouse_list = list(MOUSE_CHOICES)
    for a in ACTIONS:
        if a.get("mouse"):
            keys = [k for _, k in mouse_list]
            if Keybinds[a["id"]] not in keys:
                mouse_list.append((PrettyKey(Keybinds[a["id"]]), Keybinds[a["id"]]))
                keys.append(Keybinds[a["id"]])
            dd = Gtk.ComboBoxText()
            for cell in dd.get_cells():
                cell.set_property("ellipsize", 3)    # Pango.EllipsizeMode.END
            for lbl, _ in mouse_list:
                dd.append_text(lbl)
            dd.set_active(keys.index(Keybinds[a["id"]]))
            hk[a["id"]] = row(a["label"], dd)
        else:
            hk[a["id"]] = row(a["label"], KeyBox(Keybinds[a["id"]]))
    n = MakeLabel("Click a box and press the keys you want. Press Backspace to clear one. The skill/spell action uses a mouse click - pick one from its list.",
                  "unora-muted", "unora-small", width=480, wrap=True)
    n.set_margin_top(8)
    box.pack_start(n, False, False, 0)

    Section(box, "Appearance")
    dd_theme = Gtk.ComboBoxText()
    for lbl in THEME_LABELS:
        dd_theme.append_text(lbl)
    dd_theme.set_active(THEME_ORDER.index(Settings["Theme"]))
    row("Colour theme", dd_theme)
    sld = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 40, 100, 1)
    for v in range(40, 101, 10):
        sld.add_mark(v, Gtk.PositionType.BOTTOM, None)
    try:
        sld.set_value(int(Settings["Opacity"]))
    except ValueError:
        sld.set_value(100)
    sld.set_digits(0)
    sld.set_value_pos(Gtk.PositionType.RIGHT)
    row("Fade when not in use (100 = off)", sld)
    zoom_vals = [80, 90, 100, 110, 125, 150]
    dd_zoom = Gtk.ComboBoxText()
    for v in zoom_vals:
        dd_zoom.append_text("%d%%" % v)
    try:
        dd_zoom.set_active(zoom_vals.index(int(Settings["Zoom"])))
    except ValueError:
        dd_zoom.set_active(2)
    row("Page size (zoom)", dd_zoom)

    Section(box, "Window")
    cb_top = Gtk.CheckButton(label="Keep the wiki window on top of the game")
    cb_top.set_active(Settings["AlwaysOnTop"] == "1")
    cb_top.set_margin_top(8)
    box.pack_start(cb_top, False, False, 0)

    Section(box, "Game")
    cb_auto = Gtk.CheckButton(label="Start automatically when the game launcher opens (" + Settings["GameWindow"] + ")")
    cb_auto.set_active(Settings["AutoLaunch"] == "1")
    cb_auto.set_margin_top(8)
    box.pack_start(cb_auto, False, False, 0)
    an = MakeLabel("Waits quietly in the tray after you log in. The launcher is found by its window title; change it in settings.cfg (GameWindow).",
                   "unora-muted", "unora-small", width=480, wrap=True)
    an.set_margin_top(4)
    box.pack_start(an, False, False, 0)

    Section(box, "Updates")
    cb_upd = Gtk.CheckButton(label="Check for a new version when the overlay starts")
    cb_upd.set_active(Settings["CheckUpdates"] == "1")
    cb_upd.set_margin_top(8)
    box.pack_start(cb_upd, False, False, 0)
    r = Gtk.Box(spacing=8)
    r.set_margin_top(8)
    r.pack_start(MakeLabel("Installed version: " + VERSION + " (Linux)", width=300), False, False, 0)
    r.pack_start(MakeButton("Check now", 120, 26, lambda: CheckForUpdates(True)), False, False, 0)
    box.pack_start(r, False, False, 0)

    r = Gtk.Box(spacing=8)
    r.set_margin_top(22)
    r.pack_start(MakeButton("Save", 110, 32, lambda: SaveOptions(g, hk, mouse_list, dd_theme, sld, dd_zoom, zoom_vals, cb_top, cb_upd, cb_auto)), False, False, 0)
    r.pack_start(MakeButton("Cancel", 110, 32, g.destroy), False, False, 0)
    r.pack_start(MakeButton("Reset keys", 120, 32, lambda: ResetKeys(hk)), False, False, 0)
    box.pack_start(r, False, False, 0)

    g.show_all()
    # Start on a harmless checkbox, not on the first key box, so stray keys never change a keybind.
    cb_top.grab_focus()
    g.present()


def _opt_gone(g):
    global OptWin
    if OptWin is g:
        OptWin = None
        RegisterHotkeys(silent=True)


def ResetKeys(hk):
    for a in ACTIONS:
        if a.get("mouse"):
            hk[a["id"]].set_active(0)
        else:
            hk[a["id"]].set_key(a["key"])


def SaveOptions(g, hk, mouse_list, dd_theme, sld, dd_zoom, zoom_vals, cb_top, cb_upd, cb_auto):
    keys = {}
    seen = {}
    for a in ACTIONS:
        if a.get("mouse"):
            i = hk[a["id"]].get_active()
            k = mouse_list[i][1] if 0 <= i < len(mouse_list) else ""
        else:
            k = hk[a["id"]].key
        keys[a["id"]] = k
        if not k:
            continue
        if k.lower() in seen:
            MsgBox("'" + PrettyKey(k) + "' is used for two actions. Give each action its own key.", warn=True)
            return
        seen[k.lower()] = a["id"]
    Keybinds.update(keys)
    ti = dd_theme.get_active()
    if 0 <= ti < len(THEME_ORDER):
        Settings["Theme"] = THEME_ORDER[ti]
    Settings["Opacity"] = str(int(sld.get_value()))
    zi = dd_zoom.get_active()
    if 0 <= zi < len(zoom_vals):
        Settings["Zoom"] = str(zoom_vals[zi])
    Settings["AlwaysOnTop"] = "1" if cb_top.get_active() else "0"
    Settings["CheckUpdates"] = "1" if cb_upd.get_active() else "0"
    Settings["AutoLaunch"] = "1" if cb_auto.get_active() else "0"
    ApplyAutoLaunch()
    SaveConfig()
    global OptWin
    OptWin = None
    g.destroy()
    RegisterHotkeys()
    ApplyCss()
    ApplyWindowSettings()
    ApplyZoom()


# ───────────────────────── Start with the game launcher ─────────────────────────

def GameRunning():
    """True while the game launcher is open: a window whose title contains GameWindow,
    or a program listed in GameProcess."""
    procs = [p.strip().lower() for p in Settings["GameProcess"].split(",") if p.strip()]
    if procs:
        for pid in os.listdir("/proc"):
            if not pid.isdigit():
                continue
            try:
                with open("/proc/%s/cmdline" % pid, "rb") as f:
                    args = f.read().split(b"\0")
                with open("/proc/%s/comm" % pid) as f:
                    comm = f.read().strip()
            except OSError:
                continue
            names = {comm.lower()}
            for a in args[:2]:
                a = a.decode("utf-8", "replace")
                names.add(re.split(r"[\\/]", a)[-1].lower())
            if any(p in names for p in procs):
                return True
    titles = [t.strip().lower() for t in Settings["GameWindow"].split(",") if t.strip()]
    if not titles:
        return False
    if Hk.d:
        open_titles = Hk.window_titles()
    else:
        try:
            out = subprocess.run(["wmctrl", "-l"], capture_output=True, text=True, timeout=3).stdout
            open_titles = [l.split(None, 3)[-1] for l in out.splitlines()]
        except (OSError, subprocess.SubprocessError):
            open_titles = []
    return any(t in w.lower() for w in open_titles for t in titles)


def WatchForGame():
    global WatchTimer
    if not GameRunning():
        return True
    WatchTimer = 0
    SetTrayTip(APP_NAME + " " + VERSION)
    StartOverlay()
    Notify("Press " + PrettyKey(Keybinds["Menu"]) + " for the menu.", APP_NAME + " is ready")
    return False


# Adds / removes the log-in start-up entry that starts the overlay in "wait for the game" mode.
def ApplyAutoLaunch():
    try:
        if Settings["AutoLaunch"] == "1":
            os.makedirs(os.path.dirname(AUTOSTART_FILE), exist_ok=True)
            with open(AUTOSTART_FILE, "w") as f:
                f.write("[Desktop Entry]\nType=Application\nName=" + APP_NAME + "\n"
                        "Comment=The Unora Wiki on top of your game\n"
                        "Exec=" + DesktopQuote(LAUNCHER) + " --watch\n"
                        "Icon=" + ICON_FILE + "\nTerminal=false\nX-GNOME-Autostart-enabled=true\n")
        elif os.path.exists(AUTOSTART_FILE):
            os.remove(AUTOSTART_FILE)
    except OSError:
        pass


def DesktopQuote(path):
    return '"' + re.sub(r'(["`$\\])', r"\\\1", path) + '"'


# ───────────────────────── Updates ─────────────────────────
# version.txt (hosted at UPDATE_BASE) looks like:
#   version=1.0.1
#   sha256=<optional hash of UnoraOverlay.ahk>
#   - first change
#   - second change

def VerCompare(a, b):
    def parts(v):
        return [int(x) if x.isdigit() else 0 for x in re.findall(r"\d+", v)]
    pa, pb = parts(a), parts(b)
    n = max(len(pa), len(pb))
    pa += [0] * (n - len(pa))
    pb += [0] * (n - len(pb))
    return (pa > pb) - (pa < pb)


def ParseVersionFile(text):
    info = {}
    notes = ""
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        m = re.match(r"^(\w+)\s*=\s*(.*)$", line)
        if m:
            info[m.group(1).lower()] = m.group(2).strip()
        elif line.startswith("-"):
            notes += "  " + line + "\n"
    info["notes"] = notes
    return info


def CheckForUpdates(manual=False):
    def work():
        try:
            url = UPDATE_BASE + "version.txt?t=%d" % int(time.time() * 1000)
            req = urllib.request.Request(url, headers={"User-Agent": "UnoraOverlay/" + VERSION + " (Linux)"})
            with urllib.request.urlopen(req, timeout=10) as r:
                info = ParseVersionFile(r.read().decode("utf-8", "replace"))
            if "version" not in info:
                raise ValueError("version.txt has no version line.")
            GLib.idle_add(done, info, None)
        except Exception as e:
            GLib.idle_add(done, None, e)

    def done(info, err):
        if err is not None:
            if manual:
                MsgBox("Could not check for updates right now.\n\n" + str(err), warn=True)
            return False
        latest = info["version"]
        if VerCompare(latest, VERSION) <= 0:
            if manual:
                MsgBox("You have the newest version (" + VERSION + ").\n\nThe update server currently lists version " + latest + ".", info=True)
            return False
        if not manual and Settings["SkippedVersion"] == latest:
            return False
        ShowUpdatePrompt(info)
        return False

    threading.Thread(target=work, daemon=True).start()


def ShowUpdatePrompt(info):
    global UpdateWin
    if UpdateWin:
        UpdateWin.destroy()
    g = NewDialog(APP_NAME + " - Update available")
    UpdateWin = g
    box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
    box.set_margin_start(18)
    box.set_margin_end(18)
    box.set_margin_top(14)
    box.set_margin_bottom(14)
    g.add(box)
    box.pack_start(MakeLabel("Version " + info["version"] + " is available", "unora-accent", "unora-h2", width=440), False, False, 0)
    t = MakeLabel("You have version " + VERSION + ". Your settings and keybinds are kept.", width=440, wrap=True)
    t.set_margin_top(6)
    box.pack_start(t, False, False, 0)
    if info["notes"]:
        w = MakeLabel("What's new:", "unora-muted", width=440)
        w.set_margin_top(10)
        box.pack_start(w, False, False, 0)
        nb = MakeLabel(info["notes"], width=440, wrap=True)
        nb.set_margin_top(2)
        box.pack_start(nb, False, False, 0)
    r = Gtk.Box(spacing=8)
    r.set_margin_top(16)
    if os.access(SCRIPT_DIR, os.W_OK):
        r.pack_start(MakeButton("Update now", 120, 32, lambda: DoUpdate(g, info)), False, False, 0)
    else:
        m = MakeLabel("The overlay folder is read-only, so it cannot update itself. Move it into your home folder, or download the new version from the website.",
                      "unora-muted", width=440, wrap=True)
        m.set_margin_top(10)
        box.pack_start(m, False, False, 0)
    r.pack_start(MakeButton("Later", 100, 32, g.destroy), False, False, 0)

    def skip():
        Settings["SkippedVersion"] = info["version"]
        SaveConfig()
        g.destroy()

    r.pack_start(MakeButton("Skip this version", 140, 32, skip), False, False, 0)
    box.pack_start(r, False, False, 0)
    g.show_all()
    g.present()


def DoUpdate(g, info):
    tmp = os.path.join(SCRIPT_DIR, "unora_overlay.update.tmp")
    try:
        url = UPDATE_BASE + "unora_overlay.py?t=%d" % int(time.time() * 1000)
        req = urllib.request.Request(url, headers={"User-Agent": "UnoraOverlay/" + VERSION + " (Linux)"})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read()
        text = data.decode("utf-8")
        m = re.search(r'^VERSION = [\'"]([\d.]+)[\'"]', text, re.M)
        if len(text) < 5000 or "# >>> SYNCED FROM UnoraOverlay.ahk" not in text or not m:
            raise ValueError("The downloaded file does not look like a valid overlay script.")
        if info.get("sha256") and hashlib.sha256(data).hexdigest().lower() != info["sha256"].lower():
            raise ValueError("The downloaded file did not match its checksum, so it was not installed.")
        compile(text, SCRIPT_PATH, "exec")
        with open(tmp, "wb") as f:
            f.write(data)
        os.chmod(tmp, 0o755)
        with open(SCRIPT_PATH, "rb") as f, open(SCRIPT_PATH + ".bak", "wb") as b:
            b.write(f.read())
        os.replace(tmp, SCRIPT_PATH)
    except Exception as e:
        try:
            os.remove(tmp)
        except OSError:
            pass
        MsgBox("The update could not be installed. Nothing was changed.\n\n" + str(e), warn=True)
        return
    g.destroy()
    MsgBox("Updated to version " + m.group(1) + ". The overlay will restart now.", info=True, timeout=6)
    Restart()


def Restart():
    """Starts the (updated) script again in place of this one."""
    for w in (MainWin, MiniWin, CalcWin, StatWin):
        if w:
            w.save_geometry()
    SaveConfig()
    try:
        Hk.clear()
    except Exception:
        pass
    os.execv(sys.executable, [sys.executable, SCRIPT_PATH] + sys.argv[1:])


def OpenPath(p):
    try:
        subprocess.Popen(["xdg-open", p], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except OSError:
        pass


# ───────────────────────── Tray ─────────────────────────

def SetupTray():
    global Tray
    menu = Gtk.Menu()
    items = [("Open menu", ShowMenu), ("Show / hide wiki window", ToggleWindow), ("Options", ShowOptions),
             ("Check for updates", lambda: CheckForUpdates(True)), None,
             ("Open overlay folder", lambda: OpenPath(SCRIPT_DIR)), ("Exit", ExitApp)]
    first = None
    for it in items:
        if it is None:
            menu.append(Gtk.SeparatorMenuItem())
            continue
        mi = Gtk.MenuItem(label=it[0])
        mi.connect("activate", lambda w, fn=it[1]: fn())
        menu.append(mi)
        first = first or mi
    menu.show_all()
    icon = ICON_FILE if os.path.exists(ICON_FILE) else "help-browser"
    if AppIndicator:
        ind = AppIndicator.Indicator.new("unora-overlay", icon, AppIndicator.IndicatorCategory.APPLICATION_STATUS)
        ind.set_status(AppIndicator.IndicatorStatus.ACTIVE)
        ind.set_menu(menu)
        ind.set_secondary_activate_target(first)   # middle-click the icon opens the menu
        Tray = ind
    else:
        si = Gtk.StatusIcon()
        if os.path.exists(ICON_FILE):
            si.set_from_file(ICON_FILE)
        else:
            si.set_from_icon_name(icon)
        si.connect("activate", lambda *a: ShowMenu())
        si.connect("popup-menu", lambda s, b, t: menu.popup(None, None, Gtk.StatusIcon.position_menu, s, b, t))
        Tray = si
    Tray._menu = menu
    SetTrayTip(APP_NAME + " " + VERSION)


def SetTrayTip(text):
    if isinstance(Tray, Gtk.StatusIcon):
        Tray.set_tooltip_text(text)
    elif Tray:
        Tray.set_title(text)


# ───────────────────────── Start-up / exit ─────────────────────────

def StartOverlay():
    global Started
    Started = True
    RegisterHotkeys()
    if FirstRun:
        SaveConfig()
        ShowMenu()
        Notify("Press " + PrettyKey(Keybinds["Menu"]) + " any time to open the menu.", APP_NAME + " is running")
    if Settings["CheckUpdates"] == "1":
        GLib.timeout_add(4000, lambda: (CheckForUpdates(False), False)[1])


Exiting = False


def ExitApp():
    global Exiting
    if Exiting:
        return
    Exiting = True
    for w in (MainWin, MiniWin, CalcWin, StatWin):
        if w:
            w.save_geometry()
    SaveConfig()
    try:
        Hk.clear()
    except Exception:
        pass
    if Gtk.main_level() > 0:
        Gtk.main_quit()
    else:
        sys.exit(0)


_lock_file = None


def SingleInstance():
    """Only one overlay at a time: a newer start replaces the one already running."""
    global _lock_file
    os.makedirs(DATA_DIR, exist_ok=True)
    path = os.path.join(DATA_DIR, "overlay.lock")
    _lock_file = open(path, "a+")
    try:
        fcntl.flock(_lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        _lock_file.seek(0)
        try:
            old = int(_lock_file.read().strip() or 0)
            if old and old != os.getpid():
                os.kill(old, signal.SIGTERM)
        except (ValueError, OSError):
            pass
        fcntl.flock(_lock_file, fcntl.LOCK_EX)    # wait for the old one to exit
    _lock_file.seek(0)
    _lock_file.truncate()
    _lock_file.write(str(os.getpid()))
    _lock_file.flush()


def main():
    global Hk, WatchTimer
    GLib.set_prgname("unora-overlay")
    GLib.set_application_name(APP_NAME)
    SingleInstance()
    LoadConfig()
    Hk = Hotkeys()
    if os.path.exists(ICON_FILE):
        Gtk.Window.set_default_icon_from_file(ICON_FILE)
    ApplyCss()
    ACTION_FNS.update({"Menu": ShowMenu, "Window": ToggleWindow, "Planner": OpenPlanner, "Calc": OpenCalc,
                       "Stat": OpenStat, "Options": ShowOptions, "AddSkill": AddSkillAtCursor})
    SetupTray()
    for sig in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP):
        GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, sig, lambda *a: (ExitApp(), False)[1])
    if Settings["AutoLaunch"] == "1":
        ApplyAutoLaunch()
    GLib.timeout_add(150, FadeTick)

    watching = any(a in ("--watch", "/watch") for a in sys.argv[1:])
    if watching and Settings["AutoLaunch"] == "1" and not GameRunning():
        # Started at log-in: wait quietly in the tray until the game launcher opens.
        SetTrayTip(APP_NAME + " - waiting for " + Settings["GameWindow"])
        WatchTimer = GLib.timeout_add(3000, WatchForGame)
    else:
        StartOverlay()
    Gtk.main()


if __name__ == "__main__":
    main()
