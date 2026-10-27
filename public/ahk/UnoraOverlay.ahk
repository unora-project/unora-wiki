; UnoraOverlay - the Unora Wiki (unora.wiki) as an in-game overlay.
; Needs AutoHotkey v2.0 (https://www.autohotkey.com). See README.txt.
; Settings live in settings.cfg and keybinds.cfg next to this file, so updating
; this script never resets them.
#Requires AutoHotkey v2.0
#SingleInstance Force
Persistent()

#Include Lib\WebView2\WebView2.ahk

; ───────────────────────── Constants ─────────────────────────

VERSION := "1.0.0"
APP_NAME := "Unora Overlay"
UPDATE_BASE := "https://www.unora.wiki/ahk/"   ; version.txt + UnoraOverlay.ahk are hosted here
SITE_BASE := "https://www.unora.wiki/#"        ; the site uses #/ routes
SETTINGS_FILE := A_ScriptDir "\settings.cfg"
KEYBINDS_FILE := A_ScriptDir "\keybinds.cfg"
PROFILE_DIR := A_ScriptDir "\data\WebView2"    ; the overlay's own browser storage (remembers planner picks)
TB_H := 38                                      ; toolbar height

; Page paths on the site. If a page ever moves, change it here.
ROUTES := Map(
    "Home", "/",
    "Classes", "/classes",
    "Items", "/equipment",
    "Quests", "/quests",
    "Professions", "/professions",
    "Planner", "/classes"   ; replaced by the standalone planner page in a later version
)

DEFAULTS := Map(
    "Theme", "Unora",
    "AlwaysOnTop", "1",
    "Opacity", "100",
    "Zoom", "100",
    "CheckUpdates", "1",
    "SkippedVersion", "",
    "WinX", "",
    "WinY", "",
    "WinW", "1000",
    "WinH", "720",
    "BaseUrl", SITE_BASE
)

; Keybind actions (id, label, default). Keys use AutoHotkey syntax: ^ = Ctrl, ! = Alt, + = Shift, # = Win.
ACTIONS := [
    {id: "Menu", label: "Open the menu", key: "^!u"},
    {id: "Window", label: "Show / hide the wiki window", key: "^!w"},
    {id: "Planner", label: "Open the Build Planner", key: "^!b"},
    {id: "Options", label: "Open Options", key: "^!o"}
]
ACTION_FNS := Map(
    "Menu", ShowMenu,
    "Window", ToggleWindow,
    "Planner", OpenPlanner,
    "Options", ShowOptions
)

; Colour themes. "Unora" matches the website.
THEME_ORDER := ["Unora", "Dark", "Light", "Midnight", "Crimson", "Forest"]
THEME_LABELS := ["Unora (website colours)", "Dark", "Light", "Midnight (dark blues)", "Crimson (dark reds)", "Forest (dark greens)"]
THEMES := Map(
    "Unora", {bg: "0B0B0E", panel: "1A1A22", text: "F1EDE2", muted: "8B8B9A", accent: "D9A441", btn: "22222C", btnText: "D9A441", dark: 1},
    "Dark", {bg: "121212", panel: "1E1E1E", text: "E6E6E6", muted: "9A9A9A", accent: "8AB4F8", btn: "2A2A2A", btnText: "E6E6E6", dark: 1},
    "Light", {bg: "F3F3F3", panel: "E4E4E4", text: "202020", muted: "666666", accent: "0B5FB8", btn: "FFFFFF", btnText: "202020", dark: 0},
    "Midnight", {bg: "0A1224", panel: "111C36", text: "DCE6FF", muted: "7F93C0", accent: "5AA2FF", btn: "17264A", btnText: "BBD3FF", dark: 1},
    "Crimson", {bg: "190A0C", panel: "2A1115", text: "F5E6E6", muted: "B98A8F", accent: "E0485A", btn: "3A171C", btnText: "FFB8C0", dark: 1},
    "Forest", {bg: "0B1A12", panel: "12281B", text: "E3F2E8", muted: "86AA94", accent: "4CC38A", btn: "1A3A28", btnText: "A8E8C6", dark: 1}
)

; ───────────────────────── State ─────────────────────────

Settings := Map()
Keybinds := Map()
Registered := Map()    ; hotkeys currently switched on (key -> action id)
MainGui := 0
WvHost := 0
WvC := 0               ; WebView2 controller
Wv := 0                ; CoreWebView2
WvEvents := []         ; keeps the WebView2 event registrations alive
WvBusy := false        ; true while the browser is still starting up
TbItems := []
PinCtrl := 0
MenuGui := 0
OptGui := 0
HelpGui := 0
UpdateGui := 0
CurrentUrl := ""
FirstRun := !FileExist(SETTINGS_FILE)

; ───────────────────────── Start-up ─────────────────────────

LoadConfig()
RegisterHotkeys()
SetupTray()
OnExit(OnAppExit)

if FirstRun {
    SaveConfig()
    ShowMenu()
    TrayTip("Press " PrettyKey(Keybinds["Menu"]) " any time to open the menu.", APP_NAME " is running")
}
if (Settings["CheckUpdates"] = "1")
    SetTimer(() => CheckForUpdates(false), -4000)
return

; ───────────────────────── Settings files ─────────────────────────

LoadConfig() {
    for key, def in DEFAULTS
        Settings[key] := IniRead(SETTINGS_FILE, "General", key, def)
    for a in ACTIONS {
        k := IniRead(KEYBINDS_FILE, "Keybinds", a.id, a.key)
        Keybinds[a.id] := (k = "None") ? "" : k
    }
    if !THEMES.Has(Settings["Theme"])
        Settings["Theme"] := "Unora"
}

SaveConfig() {
    try {
        for key, val in Settings
            IniWrite(val, SETTINGS_FILE, "General", key)
        for a in ACTIONS
            IniWrite(Keybinds[a.id] = "" ? "None" : Keybinds[a.id], KEYBINDS_FILE, "Keybinds", a.id)
    } catch as e {
        MsgBox("Could not save your settings next to the script.`nTry moving the " APP_NAME " folder somewhere you can write to (like Documents).`n`n" e.Message, APP_NAME, "Icon!")
    }
}

Theme() => THEMES[Settings["Theme"]]

; ───────────────────────── Hotkeys ─────────────────────────

RegisterHotkeys() {
    global Registered
    for key in Registered {
        try Hotkey(key, "Off")
    }
    Registered := Map()
    for a in ACTIONS {
        key := Keybinds[a.id]
        if (key = "")
            continue
        try {
            Hotkey(key, RunAction.Bind(a.id), "On")
            Registered[key] := a.id
        } catch as e {
            MsgBox("The key '" PrettyKey(key) "' for '" a.label "' could not be used.`nChoose another one in Options.`n`n" e.Message, APP_NAME, "Icon!")
        }
    }
}

RunAction(id, *) {
    ACTION_FNS[id]()
}

PrettyKey(k) {
    if (k = "")
        return "(not set)"
    out := ""
    while (k != "") {
        ch := SubStr(k, 1, 1)
        if InStr("^!+#", ch) {
            out .= (ch = "^") ? "Ctrl+" : (ch = "!") ? "Alt+" : (ch = "+") ? "Shift+" : "Win+"
            k := SubStr(k, 2)
        } else
            break
    }
    return out StrUpper(SubStr(k, 1, 1)) SubStr(k, 2)
}

; ───────────────────────── Tray ─────────────────────────

SetupTray() {
    A_TrayMenu.Delete()
    A_TrayMenu.Add("Open menu", (*) => ShowMenu())
    A_TrayMenu.Add("Show / hide wiki window", (*) => ToggleWindow())
    A_TrayMenu.Add("Options", (*) => ShowOptions())
    A_TrayMenu.Add("Check for updates", (*) => CheckForUpdates(true))
    A_TrayMenu.Add()
    A_TrayMenu.Add("Open overlay folder", (*) => Run(A_ScriptDir))
    A_TrayMenu.Add("Exit", (*) => ExitApp())
    A_TrayMenu.Default := "Open menu"
    A_IconTip := APP_NAME " " VERSION
}

OnAppExit(*) {
    SaveGeometry()
    SaveConfig()
}

; ───────────────────────── Small GUI helpers ─────────────────────────

SetDarkTitle(hwnd, dark) {
    v := dark ? 1 : 0
    try DllCall("dwmapi\DwmSetWindowAttribute", "ptr", hwnd, "int", 20, "int*", v, "int", 4)
}

; A themed "button" (a clickable text box, so it can take the theme colours).
MakeButton(g, text, opts, fn, th) {
    c := g.AddText(opts " +0x200 Center Border Background" th.btn " c" th.btnText, text)
    c.OnEvent("Click", fn)
    return c
}

Section(g, text, th) {
    t := g.AddText("xm y+18 w480 c" th.accent, text)
    t.SetFont("s10 bold c" th.accent)
    g.AddText("xm y+2 w480 h1 Background" th.muted)
}

; ───────────────────────── Main (wiki) window ─────────────────────────

BuildMain() {
    global MainGui, WvHost
    MainGui := Gui("+Resize +MinSize560x380", APP_NAME)
    MainGui.MarginX := 0
    MainGui.MarginY := 0
    MainGui.SetFont("s9", "Segoe UI")
    hostH := Settings["WinH"] - TB_H
    WvHost := MainGui.AddText("x0 y" TB_H " w" Settings["WinW"] " h" hostH)
    MainGui.OnEvent("Size", OnMainSize)
    MainGui.OnEvent("Close", OnMainClose)
    BuildToolbar()
}

BuildToolbar() {
    global TbItems, PinCtrl
    th := Theme()
    for it in TbItems
        it.ctl.Destroy()
    TbItems := []
    MainGui.BackColor := th.panel
    SetDarkTitle(MainGui.Hwnd, th.dark)
    AddTb("Back", 50, "L", NavBack)
    AddTb("Forward", 64, "L", NavForward)
    AddTb("Reload", 58, "L", NavReload)
    AddTb("Menu", 54, "L", ShowMenu)
    AddTb("Planner", 66, "L", OpenPlanner)
    PinCtrl := AddTb("Pin", 70, "L", TogglePin)
    AddTb("?", 34, "R", ShowHelp)
    AddTb("Options", 66, "R", ShowOptions)
    UpdatePinLabel()
    MainGui.GetClientPos(, , &w)
    LayoutToolbar(w)
}

AddTb(label, w, side, fn) {
    bh := TB_H - 10
    c := MakeButton(MainGui, label, "x0 y5 w" w " h" bh, fn, Theme())
    TbItems.Push({ctl: c, side: side, w: w})
    return c
}

LayoutToolbar(width) {
    x := 6
    rx := width - 6
    for it in TbItems {
        if (it.side = "L") {
            it.ctl.Move(x)
            x += it.w + 4
        } else {
            rx -= it.w
            it.ctl.Move(rx)
            rx -= 4
        }
    }
}

OnMainSize(g, minMax, w, h) {
    if (minMax = -1)
        return
    LayoutToolbar(w)
    WvHost.Move(0, TB_H, w, h - TB_H)
    if WvC {
        try WvC.Fill()
    }
}

OnMainClose(*) {
    HideMain()
    return true   ; hide instead of closing, so the page is still there next time
}

IsMainVisible() {
    return MainGui && DllCall("IsWindowVisible", "ptr", MainGui.Hwnd)
}

ShowMain(startRoute := "/") {
    if !MainGui
        BuildMain()
    if !IsMainVisible() {
        w := Settings["WinW"]
        h := Settings["WinH"]
        opts := "w" w " h" h
        x := Settings["WinX"]
        y := Settings["WinY"]
        if (IsInteger(x) && IsInteger(y) && x > -(w - 100) && y > -20 && x < A_ScreenWidth - 100 && y < A_ScreenHeight - 100)
            opts := "x" x " y" y " " opts
        MainGui.Show(opts)
    } else
        MainGui.Show()
    ApplyWindowSettings()
    EnsureWebView(startRoute)
}

HideMain() {
    SaveGeometry()
    if MainGui
        MainGui.Hide()
}

ToggleWindow(*) {
    if IsMainVisible()
        HideMain()
    else
        ShowMain()
}

SaveGeometry() {
    if !IsMainVisible()
        return
    try {
        if (WinGetMinMax(MainGui) != 0)
            return
        WinGetPos(&x, &y, , , MainGui)
        MainGui.GetClientPos(, , &w, &h)
        Settings["WinX"] := x
        Settings["WinY"] := y
        Settings["WinW"] := w
        Settings["WinH"] := h
    }
}

ApplyWindowSettings() {
    if !MainGui
        return
    onTop := (Settings["AlwaysOnTop"] = "1")
    WinSetAlwaysOnTop(onTop ? 1 : 0, MainGui)
    op := Integer(Settings["Opacity"])
    if (op >= 100)
        WinSetTransparent("Off", MainGui)
    else
        WinSetTransparent(Round(op * 2.55), MainGui)
    UpdatePinLabel()
}

UpdatePinLabel() {
    if PinCtrl
        PinCtrl.Text := (Settings["AlwaysOnTop"] = "1") ? "Pin: on" : "Pin: off"
}

TogglePin(*) {
    Settings["AlwaysOnTop"] := (Settings["AlwaysOnTop"] = "1") ? "0" : "1"
    ApplyWindowSettings()
    SaveConfig()
}

ApplyTheme() {
    if MainGui
        BuildToolbar()
}

ApplyZoom() {
    if WvC {
        try WvC.ZoomFactor := Integer(Settings["Zoom"]) / 100
    }
}

; ───────────────────────── The embedded website ─────────────────────────

EnsureWebView(startRoute := "/") {
    global WvC, Wv, WvEvents, WvBusy
    if WvC
        return true
    if WvBusy
        return false
    WvBusy := true
    try {
        DirCreate(PROFILE_DIR)
        WvC := WebView2.CreateControllerAsync(WvHost.Hwnd, 0, PROFILE_DIR).await2()
        Wv := WvC.CoreWebView2
    } catch as e {
        WvC := 0
        Wv := 0
        WvBusy := false
        MsgBox("The embedded browser (Microsoft Edge WebView2) could not start.`n`n"
            . "Windows 11 and recent Windows 10 include it. If you are on an older Windows 10, install the free 'WebView2 Runtime' from:`n"
            . "https://developer.microsoft.com/microsoft-edge/webview2/`n`n"
            . "Details: " e.Message, APP_NAME, "Icon!")
        return false
    }
    try Wv.Settings.IsStatusBarEnabled := false
    WvEvents := [Wv.NewWindowRequested(OnNewWindow), Wv.SourceChanged(OnSourceChanged)]
    try WvC.Fill()
    ApplyZoom()
    Wv.Navigate(Settings["BaseUrl"] startRoute)
    WvBusy := false
    return true
}

; Links that want a new window open in the overlay instead.
OnNewWindow(sender, args) {
    args.Handled := true
    sender.Navigate(args.Uri)
}

OnSourceChanged(sender, args) {
    global CurrentUrl
    try CurrentUrl := sender.Source
}

NavTo(route) {
    fresh := !WvC
    ShowMain(route)
    if (!fresh && WvC)
        Wv.Navigate(Settings["BaseUrl"] route)
}

OpenPlanner(*) {
    NavTo(ROUTES["Planner"])
}

NavBack(*) {
    if (WvC && Wv.CanGoBack)
        Wv.GoBack()
}

NavForward(*) {
    if (WvC && Wv.CanGoForward)
        Wv.GoForward()
}

NavReload(*) {
    if WvC
        Wv.Reload()
}

; ───────────────────────── Menu (the pop-up) ─────────────────────────

ShowMenu(*) {
    global MenuGui
    try MenuGui.Destroy()
    th := Theme()
    g := Gui("+AlwaysOnTop +ToolWindow", APP_NAME)
    MenuGui := g
    g.BackColor := th.bg
    SetDarkTitle(g.Hwnd, th.dark)
    g.MarginX := 16
    g.MarginY := 14
    g.SetFont("s10 c" th.text, "Segoe UI")

    title := g.AddText("x16 y12 w220 h30 +0x200 c" th.accent, "Unora Wiki")
    title.SetFont("s15 bold c" th.accent)
    MakeButton(g, "?", "x246 y14 w34 h26", (*) => ShowHelpFor("menu"), th)

    big := "s11 bold"
    b1 := MakeButton(g, "Classes", "x16 y56 w128 h46", (*) => MenuPick("Classes"), th)
    b2 := MakeButton(g, "Items", "x152 y56 w128 h46", (*) => MenuPick("Items"), th)
    b3 := MakeButton(g, "Quests", "x16 y110 w128 h46", (*) => MenuPick("Quests"), th)
    b4 := MakeButton(g, "Professions", "x152 y110 w128 h46", (*) => MenuPick("Professions"), th)
    b5 := MakeButton(g, "Build Planner", "x16 y164 w264 h46", (*) => MenuPick("Planner"), th)
    for b in [b1, b2, b3, b4, b5]
        b.SetFont(big " c" th.btnText)

    MakeButton(g, "Options", "x16 y222 w128 h28", (*) => (CloseMenu(), ShowOptions()), th)
    MakeButton(g, "Close", "x152 y222 w128 h28", (*) => CloseMenu(), th)

    foot := g.AddText("x16 y258 w264 c" th.muted, "Menu: " PrettyKey(Keybinds["Menu"]) "   Window: " PrettyKey(Keybinds["Window"]))
    foot.SetFont("s8 c" th.muted)

    g.OnEvent("Escape", (*) => CloseMenu())
    g.OnEvent("Close", (*) => CloseMenu())
    g.Show("w296")
}

CloseMenu() {
    global MenuGui
    try MenuGui.Destroy()
    MenuGui := 0
}

MenuPick(name) {
    CloseMenu()
    NavTo(ROUTES[name])
}

; ───────────────────────── Help ( ? ) ─────────────────────────

ShowHelp(*) {
    ShowHelpFor("")
}

ShowHelpFor(ctx) {
    global HelpGui
    if (ctx != "menu")
        ctx := ""
    try HelpGui.Destroy()
    th := Theme()
    page := HelpFor(ctx)
    g := Gui("+AlwaysOnTop", APP_NAME " - Help")
    HelpGui := g
    g.BackColor := th.bg
    SetDarkTitle(g.Hwnd, th.dark)
    g.MarginX := 18
    g.MarginY := 14
    g.SetFont("s10 c" th.text, "Segoe UI")
    t := g.AddText("xm w470 c" th.accent, page.title)
    t.SetFont("s13 bold c" th.accent)
    g.AddText("xm y+4 w470 h1 Background" th.muted)
    g.AddText("xm y+10 w470", page.body)
    k := g.AddText("xm y+14 w470 c" th.muted, "Keys:  Menu " PrettyKey(Keybinds["Menu"]) "   |   Show/hide window " PrettyKey(Keybinds["Window"])
        . "   |   Build Planner " PrettyKey(Keybinds["Planner"]) "   |   Options " PrettyKey(Keybinds["Options"]))
    k.SetFont("s9 c" th.muted)
    MakeButton(g, "Close", "xm y+14 w100 h28", (*) => g.Destroy(), th)
    g.OnEvent("Escape", (*) => g.Destroy())
    g.Show()
}

HelpFor(ctx) {
    path := "/"
    if (ctx = "" && IsMainVisible() && CurrentUrl != "") {
        if RegExMatch(CurrentUrl, "#(/[^?]*)", &m)
            path := m[1]
    } else if (ctx = "")
        ctx := "menu"

    if (ctx = "menu")
        return {title: "The menu", body: "
(
Pick where you want to go:

Classes - skills and spells for every class, with the Build Plan window.
Items - all equipment, with item comparison and enchants.
Quests - quest guides.
Professions - recipes and tables for each profession.
Build Planner - jump straight to planning what to learn.

The wiki opens in its own window so you can keep playing. Close it with its X (it is only hidden), or press the Show/hide key.
Click the ? on any page for help with that page.
)"}

    if RegExMatch(path, "^/classes")
        return {title: "Classes", body: "
(
Choose a class, then use the Skills and Spells tabs. Switch between Cards and List with the View buttons.

Hide - on a card, removes skills you no longer want to see. They wait in a drop-down at the bottom, and Reset Hidden brings them all back.

Build Plan - opens a floating plan. Click cards (or tick the Plan box in List view) to add them. The plan groups them by where you learn them, totals the gold and materials, and lets you tick off materials as you collect them. It remembers your picks for each class, even after closing the overlay.
)"}
    if RegExMatch(path, "^/equipment")
        return {title: "Items", body: "
(
Filter by category and class, search by name, and click a stat on a card to sort by it. Cards and List views are both available.

Compare Equipment - turn it on, then tick as many items as you like. In the Compare window pick an Enchant for each item to see its stats change (arrows mark changed numbers). Use + Copy to compare the same item with different enchants. Drag the corner to resize it, or press Auto-fit.

Items sold in shops or by Mythic leaders show where to buy them.
)"}
    if RegExMatch(path, "^/quests")
        return {title: "Quests", body: "
(
Browse the quest guides and open one for its step-by-step walkthrough. Use the Back and Forward buttons in the bar above to move between pages, and Reload if a page looks stuck.
)"}
    if RegExMatch(path, "^/professions")
        return {title: "Professions", body: "
(
Pick a profession to see how it works and its recipe tables. Use the rank tabs to narrow a table to one rank, the search box to find a recipe, and click a column heading to sort.
)"}
    if RegExMatch(path, "^/hunting")
        return {title: "Hunting", body: "
(
Hunting areas list their monsters, bosses and drops. Open an area for its details, and use Back to return to the list.
)"}
    if RegExMatch(path, "^/towns")
        return {title: "Towns", body: "
(
Towns list their NPCs and shops, so you can see where to buy things. Open a town for the full list.
)"}
    return {title: "Unora Wiki", body: "
(
This is the Unora Wiki. Use the site's own menu to move around, or press Menu in the bar above to jump to Classes, Items, Quests, Professions or the Build Planner.

Back, Forward and Reload work like a browser. Pin keeps this window on top of the game. Options changes keys, colours and size.
)"}
}

; ───────────────────────── Options ─────────────────────────

ShowOptions(*) {
    global OptGui
    try OptGui.Destroy()
    th := Theme()
    g := Gui("+AlwaysOnTop", APP_NAME " - Options")
    OptGui := g
    g.BackColor := th.bg
    SetDarkTitle(g.Hwnd, th.dark)
    g.MarginX := 18
    g.MarginY := 14
    g.SetFont("s10 c" th.text, "Segoe UI")

    head := g.AddText("xm w480 h30 +0x200 c" th.accent, "Options")
    head.SetFont("s14 bold c" th.accent)

    Section(g, "Keybinds", th)
    hk := Map()
    for a in ACTIONS {
        g.AddText("xm y+8 w250 h24 +0x200", a.label)
        hk[a.id] := g.AddHotkey("x+8 yp w200", Keybinds[a.id])
    }
    n := g.AddText("xm y+8 w480 c" th.muted, "Click a box and press the keys you want. Press Backspace to clear one.")
    n.SetFont("s8 c" th.muted)

    Section(g, "Appearance", th)
    g.AddText("xm y+8 w250 h24 +0x200", "Colour theme")
    idx := 1
    for i, name in THEME_ORDER
        if (name = Settings["Theme"])
            idx := i
    ddlTheme := g.AddDropDownList("x+8 yp w200 Choose" idx, THEME_LABELS)
    g.AddText("xm y+8 w250 h24 +0x200", "Window opacity")
    sldOpacity := g.AddSlider("x+8 yp w200 h24 Range40-100 TickInterval10 ToolTip", Integer(Settings["Opacity"]))
    zoomVals := [80, 90, 100, 110, 125, 150]
    zoomLabels := ["80%", "90%", "100%", "110%", "125%", "150%"]
    zi := 3
    for i, v in zoomVals
        if (v = Integer(Settings["Zoom"]))
            zi := i
    g.AddText("xm y+8 w250 h24 +0x200", "Page size (zoom)")
    ddlZoom := g.AddDropDownList("x+8 yp w200 Choose" zi, zoomLabels)

    Section(g, "Window", th)
    topOpt := (Settings["AlwaysOnTop"] = "1") ? "Checked" : ""
    cbTop := g.AddCheckbox("xm y+8 " topOpt, "Keep the wiki window on top of the game")

    Section(g, "Updates", th)
    updOpt := (Settings["CheckUpdates"] = "1") ? "Checked" : ""
    cbUpd := g.AddCheckbox("xm y+8 " updOpt, "Check for a new version when the overlay starts")
    g.AddText("xm y+8 w300 h26 +0x200", "Installed version: " VERSION)
    MakeButton(g, "Check now", "x+8 yp w120 h26", (*) => CheckForUpdates(true), th)

    MakeButton(g, "Save", "xm y+22 w110 h32", (*) => SaveOptions(g, hk, ddlTheme, sldOpacity, ddlZoom, zoomVals, cbTop, cbUpd), th)
    MakeButton(g, "Cancel", "x+8 yp w110 h32", (*) => g.Destroy(), th)
    MakeButton(g, "Reset keys", "x+8 yp w120 h32", (*) => ResetKeys(hk), th)

    g.OnEvent("Escape", (*) => g.Destroy())
    g.Show()
}

ResetKeys(hk) {
    for a in ACTIONS
        hk[a.id].Value := a.key
}

SaveOptions(g, hk, ddlTheme, sldOpacity, ddlZoom, zoomVals, cbTop, cbUpd) {
    keys := Map()
    seen := Map()
    seen.CaseSense := "Off"
    for a in ACTIONS {
        k := hk[a.id].Value
        keys[a.id] := k
        if (k = "")
            continue
        if seen.Has(k) {
            MsgBox("'" PrettyKey(k) "' is used for two actions. Give each action its own key.", APP_NAME, "Icon!")
            return
        }
        seen[k] := a.id
    }
    for a in ACTIONS
        Keybinds[a.id] := keys[a.id]
    ti := ddlTheme.Value
    if (ti >= 1 && ti <= THEME_ORDER.Length)
        Settings["Theme"] := THEME_ORDER[ti]
    Settings["Opacity"] := sldOpacity.Value
    zi := ddlZoom.Value
    if (zi >= 1 && zi <= zoomVals.Length)
        Settings["Zoom"] := zoomVals[zi]
    Settings["AlwaysOnTop"] := cbTop.Value ? "1" : "0"
    Settings["CheckUpdates"] := cbUpd.Value ? "1" : "0"
    SaveConfig()
    RegisterHotkeys()
    ApplyTheme()
    ApplyWindowSettings()
    ApplyZoom()
    g.Destroy()
}

; ───────────────────────── Updates ─────────────────────────
; version.txt (hosted at UPDATE_BASE) looks like:
;   version=1.0.1
;   sha256=<optional hash of UnoraOverlay.ahk>
;   - first change
;   - second change

CheckForUpdates(manual := false) {
    try {
        req := ComObject("WinHttp.WinHttpRequest.5.1")
        req.SetTimeouts(4000, 4000, 6000, 10000)
        req.Open("GET", UPDATE_BASE "version.txt?t=" A_TickCount, false)
        req.Send()
        if (req.Status != 200)
            throw Error("The server answered " req.Status ".")
        info := ParseVersionFile(req.ResponseText)
        if !info.Has("version")
            throw Error("version.txt has no version line.")
    } catch as e {
        if manual
            MsgBox("Could not check for updates right now.`n`n" e.Message, APP_NAME, "Icon!")
        return
    }
    latest := info["version"]
    if (VerCompare(latest, VERSION) <= 0) {
        if manual
            MsgBox("You have the newest version (" VERSION ").", APP_NAME, "Iconi")
        return
    }
    if (!manual && Settings["SkippedVersion"] = latest)
        return
    ShowUpdatePrompt(info)
}

ParseVersionFile(text) {
    info := Map()
    notes := ""
    for line in StrSplit(text, "`n", "`r") {
        line := Trim(line)
        if (line = "")
            continue
        if RegExMatch(line, "^(\w+)\s*=\s*(.*)$", &m)
            info[StrLower(m[1])] := Trim(m[2])
        else if (SubStr(line, 1, 1) = "-")
            notes .= "  " line "`n"
    }
    info["notes"] := notes
    return info
}

ShowUpdatePrompt(info) {
    global UpdateGui
    try UpdateGui.Destroy()
    th := Theme()
    g := Gui("+AlwaysOnTop", APP_NAME " - Update available")
    UpdateGui := g
    g.BackColor := th.bg
    SetDarkTitle(g.Hwnd, th.dark)
    g.MarginX := 18
    g.MarginY := 14
    g.SetFont("s10 c" th.text, "Segoe UI")
    t := g.AddText("xm w440 c" th.accent, "Version " info["version"] " is available")
    t.SetFont("s13 bold c" th.accent)
    g.AddText("xm y+6 w440", "You have version " VERSION ". Your settings and keybinds are kept.")
    if (info["notes"] != "") {
        g.AddText("xm y+10 w440 c" th.muted, "What's new:")
        g.AddText("xm y+2 w440", info["notes"])
    }
    if A_IsCompiled
        g.AddText("xm y+10 w440 c" th.muted, "This is a compiled copy, so it cannot update itself. Download the new version from the website.")
    else
        MakeButton(g, "Update now", "xm y+16 w120 h32", (*) => DoUpdate(g, info), th)
    MakeButton(g, "Later", "x+8 yp w100 h32", (*) => g.Destroy(), th)
    MakeButton(g, "Skip this version", "x+8 yp w140 h32", (*) => (Settings["SkippedVersion"] := info["version"], SaveConfig(), g.Destroy()), th)
    g.OnEvent("Escape", (*) => g.Destroy())
    g.Show()
}

DoUpdate(g, info) {
    tmp := A_ScriptDir "\UnoraOverlay.update.tmp"
    try FileDelete(tmp)
    try {
        Download(UPDATE_BASE "UnoraOverlay.ahk?t=" A_TickCount, tmp)
        text := FileRead(tmp, "UTF-8")
        if (StrLen(text) < 5000 || !InStr(text, "#Requires AutoHotkey v2") || !RegExMatch(text, "m)^VERSION := `"([\d.]+)`"", &m))
            throw Error("The downloaded file does not look like a valid overlay script.")
        if (info.Has("sha256") && info["sha256"] != "" && StrLower(HashFile(tmp)) != StrLower(info["sha256"]))
            throw Error("The downloaded file did not match its checksum, so it was not installed.")
        FileCopy(A_ScriptFullPath, A_ScriptFullPath ".bak", true)
        FileMove(tmp, A_ScriptFullPath, true)
    } catch as e {
        try FileDelete(tmp)
        MsgBox("The update could not be installed. Nothing was changed.`n`n" e.Message, APP_NAME, "Icon!")
        return
    }
    g.Destroy()
    MsgBox("Updated to version " m[1] ". The overlay will restart now.", APP_NAME, "Iconi T6")
    Reload()
}

HashFile(path) {
    out := A_Temp "\unora_overlay_hash.txt"
    try FileDelete(out)
    RunWait(A_ComSpec ' /c certutil -hashfile "' path '" SHA256 > "' out '"', , "Hide")
    lines := StrSplit(FileRead(out), "`n", "`r")
    try FileDelete(out)
    return lines.Length >= 2 ? StrReplace(Trim(lines[2]), " ") : ""
}
