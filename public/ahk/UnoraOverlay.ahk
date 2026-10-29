; UnoraOverlay - the Unora Wiki (unora.wiki) as an in-game overlay.
; Needs AutoHotkey v2.0 (https://www.autohotkey.com). See README.txt.
; Settings live in settings.cfg and keybinds.cfg next to this file, so updating
; this script never resets them.
#Requires AutoHotkey v2.0
#SingleInstance Force
Persistent()

#Include Lib\WebView2\WebView2.ahk

; ───────────────────────── Constants ─────────────────────────

VERSION := "1.8.0"
APP_NAME := "Unora Overlay"
UPDATE_BASE := "https://www.unora.wiki/ahk/"   ; version.txt + UnoraOverlay.ahk are hosted here
SITE_BASE := "https://www.unora.wiki/#"        ; the site uses #/ routes
SETTINGS_FILE := A_ScriptDir "\settings.cfg"
KEYBINDS_FILE := A_ScriptDir "\keybinds.cfg"
PROFILE_DIR := A_ScriptDir "\data\WebView2"    ; the overlay's own browser storage (remembers planner picks)
ICON_FILE := A_ScriptDir "\UnoraOverlay.ico"   ; tray / taskbar icon (optional file)
TB_H := 38                                      ; toolbar height
MINI_TB := 30                                   ; height of the slim bar (title + ?) on the small windows

; Page paths on the site. If a page ever moves, change it here.
ROUTES := Map(
    "Home", "/",
    "Classes", "/classes",
    "Items", "/equipment",
    "Quests", "/quests",
    "Professions", "/professions",
    "Planner", "/planner",
    "PlannerMini", "/planner-mini",
    "CalcMini", "/hpmp-mini",
    "StatMini", "/stats-mini"
)

DEFAULTS := Map(
    "Theme", "Unora",
    "AlwaysOnTop", "1",
    "Opacity", "100",
    "Zoom", "100",
    "CheckUpdates", "1",
    "AutoLaunch", "0",                       ; 1 = wait quietly and start when the game launcher opens
    "GameWindow", "Chaos Launcher",          ; window title(s) that wake the overlay (part of the title is enough; separate several with commas)
    "GameProcess", "",                       ; optional: program name(s) that also wake it, e.g. Unora.exe
    "SkippedVersion", "",
    "WinX", "",
    "WinY", "",
    "WinW", "1000",
    "WinH", "720",
    "MiniX", "",
    "MiniY", "",
    "MiniW", "460",
    "MiniH", "560",
    "CalcX", "",
    "CalcY", "",
    "CalcW", "640",
    "CalcH", "430",
    "StatX", "",
    "StatY", "",
    "StatW", "560",
    "StatH", "520",
    "BaseUrl", SITE_BASE
)

; Keybind actions (id, label, default). Keys use AutoHotkey syntax: ^ = Ctrl, ! = Alt, + = Shift, # = Win.
ACTIONS := [
    {id: "Menu", label: "Open the menu", key: "^!u"},
    {id: "Window", label: "Show / hide the wiki window", key: "^!w"},
    {id: "Planner", label: "Open the Build Planner", key: "^!b"},
    {id: "Calc", label: "Open the HP/MP Calculator", key: "^!h"},
    {id: "Stat", label: "Open the Stat Calculator", key: "^!s"},
    {id: "Options", label: "Open Options", key: "^!o"},
    {id: "AddSkill", label: "Add skill/spell from game (mouse)", key: "^!MButton", mouse: true}
]
; Choices for the mouse-click action (the Options window offers these in a list).
MOUSE_CHOICES := [
    {label: "Ctrl+Alt+Middle click", key: "^!MButton"},
    {label: "Ctrl+Shift+Middle click", key: "^+MButton"},
    {label: "Alt+Middle click", key: "!MButton"},
    {label: "Ctrl+Middle click", key: "^MButton"},
    {label: "Shift+Middle click", key: "+MButton"},
    {label: "Ctrl+Alt+Mouse 4 (side button)", key: "^!XButton1"},
    {label: "Ctrl+Alt+Mouse 5 (side button)", key: "^!XButton2"},
    {label: "Alt+Mouse 4 (side button)", key: "!XButton1"},
    {label: "Alt+Mouse 5 (side button)", key: "!XButton2"},
    {label: "Mouse 4 (side button)", key: "XButton1"},
    {label: "Mouse 5 (side button)", key: "XButton2"},
    {label: "Off", key: ""}
]
ACTION_FNS := Map(
    "Menu", ShowMenu,
    "Window", ToggleWindow,
    "Planner", OpenPlanner,
    "Calc", OpenCalc,
    "Stat", OpenStat,
    "Options", ShowOptions,
    "AddSkill", AddSkillAtCursor
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
OptMouseList := MOUSE_CHOICES
MiniReady := false     ; true once the Build Planner page has loaded
FadeBusy := false
FadeLevels := Map()    ; last transparency applied per window, to avoid needless calls
MiniGui := 0           ; the small Build Planner window
MiniC := 0
MiniWv := 0
MiniEvents := []
MiniBusy := false
MiniHost := 0          ; the area of the planner window that holds the browser
MiniBar := 0           ; its slim title bar (title + ? button)
CalcGui := 0           ; the small HP/MP Calculator window
CalcC := 0
CalcWv := 0
CalcEvents := []
CalcBusy := false
CalcHost := 0
CalcBar := 0
StatGui := 0           ; the small Stat Calculator window
StatC := 0
StatWv := 0
StatEvents := []
StatBusy := false
StatHost := 0
StatBar := 0
PinCtrl := 0
MenuGui := 0
OptGui := 0
HelpGui := 0
UpdateGui := 0
CurrentUrl := ""
FirstRun := !FileExist(SETTINGS_FILE)

; ───────────────────────── Start-up ─────────────────────────

LoadConfig()
SetupTray()
OnExit(OnAppExit)
if FileExist(ICON_FILE) {
    try TraySetIcon(ICON_FILE)
}
if (Settings["AutoLaunch"] = "1")
    ApplyAutoLaunch()
SetTimer(FadeTick, 150)

Watching := false
for arg in A_Args
    if (arg = "/watch")
        Watching := true

if (Watching && Settings["AutoLaunch"] = "1" && !GameRunning()) {
    ; Started with Windows: wait quietly in the tray until the game launcher opens.
    A_IconTip := APP_NAME " - waiting for " Settings["GameWindow"]
    SetTimer(WatchForGame, 3000)
} else
    StartOverlay()
return

StartOverlay() {
    RegisterHotkeys()
    if FirstRun {
        SaveConfig()
        ShowMenu()
        TrayTip("Press " PrettyKey(Keybinds["Menu"]) " any time to open the menu.", APP_NAME " is running")
    }
    if (Settings["CheckUpdates"] = "1")
        SetTimer(() => CheckForUpdates(false), -4000)
}

; True while the game launcher is open: a window whose title contains GameWindow,
; or a program listed in GameProcess. (The launcher runs inside dotnet.exe, so its
; window title is what identifies it.)
GameRunning() {
    for name in StrSplit(Settings["GameProcess"], ",") {
        name := Trim(name)
        if (name != "" && ProcessExist(name))
            return true
    }
    prevMode := A_TitleMatchMode
    SetTitleMatchMode(2)
    found := false
    for title in StrSplit(Settings["GameWindow"], ",") {
        title := Trim(title)
        if (title != "" && WinExist(title)) {
            found := true
            break
        }
    }
    SetTitleMatchMode(prevMode)
    return found
}

WatchForGame() {
    if !GameRunning()
        return
    SetTimer(WatchForGame, 0)
    A_IconTip := APP_NAME " " VERSION
    StartOverlay()
    TrayTip("Press " PrettyKey(Keybinds["Menu"]) " for the menu.", APP_NAME " is ready")
}

; Adds / removes the Windows start-up shortcut that starts the overlay in "wait for the game" mode.
ApplyAutoLaunch() {
    link := A_Startup "\Unora Overlay.lnk"
    try {
        if (Settings["AutoLaunch"] = "1") {
            args := '"' A_ScriptFullPath '" /watch'
            if FileExist(ICON_FILE)
                FileCreateShortcut(A_AhkPath, link, A_ScriptDir, args, APP_NAME, ICON_FILE)
            else
                FileCreateShortcut(A_AhkPath, link, A_ScriptDir, args, APP_NAME)
        } else if FileExist(link)
            FileDelete(link)
    }
}

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
    names := Map("MButton", "Middle click", "XButton1", "Mouse 4 (side)", "XButton2", "Mouse 5 (side)")
    if names.Has(k)
        return out names[k]
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

OnAppExit(reason := "", *) {
    SaveGeometry()
    SaveMiniGeometry()
    SaveCalcGeometry()
    SaveStatGeometry()
    SaveConfig()
    CloseWebViews()
    ; Skip AutoHotkey's own clean-up, which can free the browser objects in the wrong order and crash.
    if (reason != "Reload")
        DllCall("ExitProcess", "uint", 0)
}

; Shut the embedded browsers down in a safe order: event handlers first, then the controllers.
CloseWebViews() {
    global WvC, Wv, WvEvents, MiniC, MiniWv, MiniEvents, CalcC, CalcWv, CalcEvents, StatC, StatWv, StatEvents
    try WvEvents := []
    try MiniEvents := []
    try CalcEvents := []
    try StatEvents := []
    try WvC.Close()
    try MiniC.Close()
    try CalcC.Close()
    try StatC.Close()
    WvC := 0
    Wv := 0
    MiniC := 0
    MiniWv := 0
    CalcC := 0
    CalcWv := 0
    StatC := 0
    StatWv := 0
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
    MainGui.BackColor := th.panel
    SetDarkTitle(MainGui.Hwnd, th.dark)
    if (TbItems.Length) {
        ; Already built: just recolour the existing buttons (controls cannot be destroyed in v2).
        for it in TbItems {
            it.ctl.Opt("Background" th.btn)
            it.ctl.SetFont("c" th.btnText)
            it.ctl.Redraw()
        }
        return
    }
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
    for g in [MiniGui, CalcGui, StatGui] {
        if !g
            continue
        WinSetAlwaysOnTop((Settings["AlwaysOnTop"] = "1") ? 1 : 0, g)
        g.BackColor := Theme().panel
        SetDarkTitle(g.Hwnd, Theme().dark)
    }
    RecolorBar(MiniBar)
    RecolorBar(CalcBar)
    RecolorBar(StatBar)
    if !MainGui
        return
    onTop := (Settings["AlwaysOnTop"] = "1")
    WinSetAlwaysOnTop(onTop ? 1 : 0, MainGui)
    FadeTick(true)
    UpdatePinLabel()
}

; "Fade when not in use": a window is fully solid while the mouse is over it or it is the
; active window, and fades to the Options level otherwise (so the game shows through).
FadeTick(force := false) {
    global FadeLevels, FadeBusy
    if FadeBusy
        return
    FadeBusy := true
    try FadeApply(force)
    FadeBusy := false
}

FadeApply(force) {
    global FadeLevels
    if force
        FadeLevels := Map()
    op := Integer(Settings["Opacity"])
    MouseGetPos(, , &under)
    for g in [MainGui, MiniGui, CalcGui, StatGui] {
        if !g
            continue
        hwnd := g.Hwnd
        if !DllCall("IsWindowVisible", "ptr", hwnd)
            continue
        solid := (op >= 100) || (under = hwnd) || WinActive("ahk_id " hwnd)
        level := solid ? 255 : Round(op * 2.55)
        if (FadeLevels.Has(hwnd) && FadeLevels[hwnd] = level)
            continue
        FadeLevels[hwnd] := level
        try {
            if (level >= 255)
                WinSetTransparent("Off", "ahk_id " hwnd)
            else
                WinSetTransparent(level, "ahk_id " hwnd)
        }
    }
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

; The planner key / button: a small always-visible window with just your plan.
OpenPlanner(*) {
    if IsMiniVisible()
        HideMini()
    else
        ShowMini()
}


; ───────────────────────── Add a skill from the game screen ─────────────────────────
; Middle-click (default Ctrl+Alt+Middle click) on a skill or spell in the game: the overlay
; takes a small picture of the screen around the mouse and hands it to the Build Planner
; page, which reads the game's pixel font, finds the matching skill/spell and adds it.

OnMiniMessage(sender, args) {
    global MiniReady
    msg := ""
    try msg := args.TryGetWebMessageAsString()
    if (msg = "ready") {
        MiniReady := true
        return
    }
    if (msg != "")
        ShowToast(msg, 3500)
}

; Shows a short message away from the mouse (so it never covers the text being read).
ShowToast(text, ms := 2500) {
    CoordMode("Mouse", "Screen")
    CoordMode("ToolTip", "Screen")
    MouseGetPos(, &my)
    ty := (my < 200) ? A_ScreenHeight - 120 : 24
    ToolTip(text, A_ScreenWidth // 2 - 150, ty)
    SetTimer(HideToast, -ms)
}

HideToast() {
    ToolTip()
}

JsonEsc(t) {
    t := StrReplace(t, "\", "\\")
    t := StrReplace(t, '"', '\"')
    return t
}

AddSkillAtCursor(*) {
    static busy := false
    if busy
        return
    busy := true
    try {
        DoAddSkill()
    } catch as e {
        ShowToast("Could not add the skill: " e.Message, 4000)
    }
    busy := false
}

DoAddSkill() {
    global MiniReady, MiniWv
    CoordMode("Mouse", "Screen")
    MouseGetPos(&mx, &my, &under)
    ; Work out how big the game picture is on screen, for any window size. The game draws 640x480
    ; and stretches it to the window, so one game pixel = (window width / 640) screen pixels. A window
    ; that is not 4:3 has bars around the picture, which are centred. These are only hints for the
    ; Build Planner page; if they are off it still tries other sizes.
    gs := 0
    gx := 0
    gy := 0
    try {
        WinGetClientPos(&clx, &cly, &cw, &ch, "ahk_id " under)
        if (cw >= 320 && ch >= 240) {
            gs := Min(cw / 640, ch / 480)
            gx := clx + (cw - 640 * gs) / 2
            gy := cly + (ch - 480 * gs) / 2
            if (gs < 0.9 || gs > 6)
                gs := 0
        }
    }
    sc := (gs > 0) ? gs : 2
    rw := Round(360 * sc)
    rh := Round(50 * sc)
    rx := mx - Round(150 * sc)
    ry := my - Round(25 * sc)
    dataDir := A_ScriptDir "\data"
    DirCreate(dataDir)
    ps1 := dataDir "\capture.ps1"
    png := dataDir "\ocr-last.png"
    txt := dataDir "\ocr-last.txt"
    try FileDelete(txt)
    WriteCaptureScript(ps1)
    ShowToast("Reading the skill name...", 10000)
    cmd := 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' ps1 '" -x ' rx ' -y ' ry ' -w ' rw ' -h ' rh ' -png "' png '" -txt "' txt '"'
    RunWait(cmd, dataDir, "Hide")
    if !FileExist(txt) {
        ShowToast("Could not take a picture of the screen.", 4000)
        return
    }
    b64 := Trim(FileRead(txt, "UTF-8"), "`r`n ")
    if (SubStr(b64, 1, 6) = "ERROR|") {
        ShowToast(SubStr(b64, 7), 5000)
        return
    }
    if (b64 = "") {
        ShowToast("Could not take a picture of the screen.", 4000)
        return
    }
    if !MiniReady {
        ShowMini()
        Loop 40 {
            if MiniReady
                break
            Sleep(200)
        }
    }
    if !MiniReady {
        ShowToast("The Build Planner window did not start.", 3500)
        return
    }
    hint := (gs > 0) ? Round(gs, 4) ',' Round(gx - rx, 2) ',' Round(gy - ry, 2) : "0,0,0"
    js := 'window.unoraAddFromImage("data:image/png;base64,' b64 '",' (mx - rx) ',' (my - ry) ',' hint ')'
    try MiniWv.ExecuteScriptAsync(js).await2()
}

; Writes the small PowerShell script that takes a picture of a piece of the screen (as a PNG
; plus its base64 text, which is what the Build Planner page receives).
WriteCaptureScript(path) {
    q := Chr(34)
    lines := [
        "param([int]$x,[int]$y,[int]$w,[int]$h,[string]$png,[string]$txt)",
        "$ErrorActionPreference = 'Stop'",
        "try {",
        "Add-Type -MemberDefinition '[DllImport(" q "user32.dll" q ")] public static extern bool SetProcessDPIAware();' -Name Dpi -Namespace W",
        "[void][W.Dpi]::SetProcessDPIAware()",
        "Add-Type -AssemblyName System.Drawing",
        "$src = New-Object System.Drawing.Bitmap($w,$h)",
        "$g = [System.Drawing.Graphics]::FromImage($src)",
        "$g.CopyFromScreen($x,$y,0,0,$src.Size)",
        "$g.Dispose()",
        "$src.Save($png,[System.Drawing.Imaging.ImageFormat]::Png)",
        "$src.Dispose()",
        "[IO.File]::WriteAllText($txt,[Convert]::ToBase64String([IO.File]::ReadAllBytes($png)))",
        "} catch { [IO.File]::WriteAllText($txt,'ERROR|' + $_.Exception.Message) }"
    ]
    text := ""
    for l in lines
        text .= l "`r`n"
    try FileDelete(path)
    FileAppend(text, path, "UTF-8-RAW")
}

; ───────────────────────── Mini Build Planner window ─────────────────────────
; A second, compact window that shows only the build plan (class drop-down, plan,
; totals, and a box to add skills/spells by name). It shares the main window's
; browser storage, so it always shows your saved picks.

; The slim bar across the top of the small windows: a title and a ? button.
MakeMiniBar(g, title, ctx) {
    th := Theme()
    t := g.AddText("x10 y0 w240 h" MINI_TB " +0x200 c" th.accent, title)
    t.SetFont("s10 bold c" th.accent)
    q := MakeButton(g, "?", "x0 y4 w34 h" (MINI_TB - 8), (*) => ShowHelpFor(ctx), th)
    return {title: t, help: q}
}

RecolorBar(bar) {
    if !bar
        return
    th := Theme()
    try {
        bar.title.SetFont("c" th.accent)
        bar.title.Redraw()
        bar.help.Opt("Background" th.btn)
        bar.help.SetFont("c" th.btnText)
        bar.help.Redraw()
    }
}

BuildMini() {
    global MiniGui, MiniHost, MiniBar
    MiniGui := Gui("+Resize +MinSize320x260", "Unora Build Planner")
    MiniGui.MarginX := 0
    MiniGui.MarginY := 0
    MiniGui.SetFont("s9", "Segoe UI")
    MiniGui.BackColor := Theme().panel
    SetDarkTitle(MiniGui.Hwnd, Theme().dark)
    MiniBar := MakeMiniBar(MiniGui, "Build Planner", "planner")
    MiniHost := MiniGui.AddText("x0 y" MINI_TB " w" Settings["MiniW"] " h" (Settings["MiniH"] - MINI_TB))
    MiniGui.OnEvent("Size", OnMiniSize)
    MiniGui.OnEvent("Close", OnMiniClose)
}

IsMiniVisible() {
    return MiniGui && DllCall("IsWindowVisible", "ptr", MiniGui.Hwnd)
}

ShowMini() {
    if !MiniGui
        BuildMini()
    SetDarkTitle(MiniGui.Hwnd, Theme().dark)
    RecolorBar(MiniBar)
    w := Settings["MiniW"]
    h := Settings["MiniH"]
    opts := "w" w " h" h
    x := Settings["MiniX"]
    y := Settings["MiniY"]
    if (IsInteger(x) && IsInteger(y) && x > -(w - 100) && y > -20 && x < A_ScreenWidth - 100 && y < A_ScreenHeight - 100)
        opts := "x" x " y" y " " opts
    MiniGui.Show(opts)
    WinSetAlwaysOnTop((Settings["AlwaysOnTop"] = "1") ? 1 : 0, MiniGui)
    FadeTick(true)
    EnsureMini()
}

HideMini() {
    SaveMiniGeometry()
    if MiniGui
        MiniGui.Hide()
}

OnMiniClose(*) {
    HideMini()
    return true
}

OnMiniSize(g, minMax, w, h) {
    if (minMax = -1)
        return
    try MiniBar.help.Move(w - 40)
    try MiniHost.Move(0, MINI_TB, w, h - MINI_TB)
    if MiniC {
        try MiniC.Fill()
    }
}

SaveMiniGeometry() {
    if !IsMiniVisible()
        return
    try {
        if (WinGetMinMax(MiniGui) != 0)
            return
        WinGetPos(&x, &y, , , MiniGui)
        MiniGui.GetClientPos(, , &w, &h)
        Settings["MiniX"] := x
        Settings["MiniY"] := y
        Settings["MiniW"] := w
        Settings["MiniH"] := h
    }
}

EnsureMini() {
    global MiniC, MiniWv, MiniEvents, MiniBusy, MiniReady
    MiniReady := false
    if MiniC {
        ; Already running: refresh so it picks up anything changed elsewhere.
        try MiniWv.Reload()
        return true
    }
    if MiniBusy
        return false
    MiniBusy := true
    try {
        DirCreate(PROFILE_DIR)
        MiniC := WebView2.CreateControllerAsync(MiniHost.Hwnd, 0, PROFILE_DIR).await2()
        MiniWv := MiniC.CoreWebView2
    } catch as e {
        MiniC := 0
        MiniWv := 0
        MiniBusy := false
        MsgBox("The Build Planner window could not start the embedded browser.`n`nDetails: " e.Message, APP_NAME, "Icon!")
        return false
    }
    try MiniWv.Settings.IsStatusBarEnabled := false
    MiniEvents := [MiniWv.NewWindowRequested(OnNewWindow), MiniWv.WebMessageReceived(OnMiniMessage)]
    try MiniC.Fill()
    MiniWv.Navigate(Settings["BaseUrl"] ROUTES["PlannerMini"])
    MiniBusy := false
    return true
}

; ───────────────────────── HP/MP Calculator window ─────────────────────────
; A small window with only the calculator (the page /hpmp-mini on the site).

OpenCalc(*) {
    if IsCalcVisible()
        HideCalc()
    else
        ShowCalc()
}

BuildCalc() {
    global CalcGui, CalcHost, CalcBar
    CalcGui := Gui("+Resize +MinSize420x300", "Unora HP/MP Calculator")
    CalcGui.MarginX := 0
    CalcGui.MarginY := 0
    CalcGui.SetFont("s9", "Segoe UI")
    CalcGui.BackColor := Theme().panel
    SetDarkTitle(CalcGui.Hwnd, Theme().dark)
    CalcBar := MakeMiniBar(CalcGui, "HP/MP Calculator", "calc")
    CalcHost := CalcGui.AddText("x0 y" MINI_TB " w" Settings["CalcW"] " h" (Settings["CalcH"] - MINI_TB))
    CalcGui.OnEvent("Size", OnCalcSize)
    CalcGui.OnEvent("Close", OnCalcClose)
}

IsCalcVisible() {
    return CalcGui && DllCall("IsWindowVisible", "ptr", CalcGui.Hwnd)
}

ShowCalc() {
    if !CalcGui
        BuildCalc()
    SetDarkTitle(CalcGui.Hwnd, Theme().dark)
    RecolorBar(CalcBar)
    w := Settings["CalcW"]
    h := Settings["CalcH"]
    opts := "w" w " h" h
    x := Settings["CalcX"]
    y := Settings["CalcY"]
    if (IsInteger(x) && IsInteger(y) && x > -(w - 100) && y > -20 && x < A_ScreenWidth - 100 && y < A_ScreenHeight - 100)
        opts := "x" x " y" y " " opts
    CalcGui.Show(opts)
    WinSetAlwaysOnTop((Settings["AlwaysOnTop"] = "1") ? 1 : 0, CalcGui)
    FadeTick(true)
    EnsureCalc()
}

HideCalc() {
    SaveCalcGeometry()
    if CalcGui
        CalcGui.Hide()
}

OnCalcClose(*) {
    HideCalc()
    return true
}

OnCalcSize(g, minMax, w, h) {
    if (minMax = -1)
        return
    try CalcBar.help.Move(w - 40)
    try CalcHost.Move(0, MINI_TB, w, h - MINI_TB)
    if CalcC {
        try CalcC.Fill()
    }
}

SaveCalcGeometry() {
    if !IsCalcVisible()
        return
    try {
        if (WinGetMinMax(CalcGui) != 0)
            return
        WinGetPos(&x, &y, , , CalcGui)
        CalcGui.GetClientPos(, , &w, &h)
        Settings["CalcX"] := x
        Settings["CalcY"] := y
        Settings["CalcW"] := w
        Settings["CalcH"] := h
    }
}

EnsureCalc() {
    global CalcC, CalcWv, CalcEvents, CalcBusy
    if CalcC
        return true     ; already running: keep whatever numbers were typed in
    if CalcBusy
        return false
    CalcBusy := true
    try {
        DirCreate(PROFILE_DIR)
        CalcC := WebView2.CreateControllerAsync(CalcHost.Hwnd, 0, PROFILE_DIR).await2()
        CalcWv := CalcC.CoreWebView2
    } catch as e {
        CalcC := 0
        CalcWv := 0
        CalcBusy := false
        MsgBox("The HP/MP Calculator window could not start the embedded browser.`n`nDetails: " e.Message, APP_NAME, "Icon!")
        return false
    }
    try CalcWv.Settings.IsStatusBarEnabled := false
    CalcEvents := [CalcWv.NewWindowRequested(OnNewWindow)]
    try CalcC.Fill()
    CalcWv.Navigate(Settings["BaseUrl"] ROUTES["CalcMini"])
    CalcBusy := false
    return true
}

; ───────────────────────── Stat Calculator window ─────────────────────────
; A small window with only the calculator (the page /stats-mini on the site).

OpenStat(*) {
    if IsStatVisible()
        HideStat()
    else
        ShowStat()
}

BuildStat() {
    global StatGui, StatHost, StatBar
    StatGui := Gui("+Resize +MinSize420x320", "Unora Stat Calculator")
    StatGui.MarginX := 0
    StatGui.MarginY := 0
    StatGui.SetFont("s9", "Segoe UI")
    StatGui.BackColor := Theme().panel
    SetDarkTitle(StatGui.Hwnd, Theme().dark)
    StatBar := MakeMiniBar(StatGui, "Stat Calculator", "stat")
    StatHost := StatGui.AddText("x0 y" MINI_TB " w" Settings["StatW"] " h" (Settings["StatH"] - MINI_TB))
    StatGui.OnEvent("Size", OnStatSize)
    StatGui.OnEvent("Close", OnStatClose)
}

IsStatVisible() {
    return StatGui && DllCall("IsWindowVisible", "ptr", StatGui.Hwnd)
}

ShowStat() {
    if !StatGui
        BuildStat()
    SetDarkTitle(StatGui.Hwnd, Theme().dark)
    RecolorBar(StatBar)
    w := Settings["StatW"]
    h := Settings["StatH"]
    opts := "w" w " h" h
    x := Settings["StatX"]
    y := Settings["StatY"]
    if (IsInteger(x) && IsInteger(y) && x > -(w - 100) && y > -20 && x < A_ScreenWidth - 100 && y < A_ScreenHeight - 100)
        opts := "x" x " y" y " " opts
    StatGui.Show(opts)
    WinSetAlwaysOnTop((Settings["AlwaysOnTop"] = "1") ? 1 : 0, StatGui)
    FadeTick(true)
    EnsureStat()
}

HideStat() {
    SaveStatGeometry()
    if StatGui
        StatGui.Hide()
}

OnStatClose(*) {
    HideStat()
    return true
}

OnStatSize(g, minMax, w, h) {
    if (minMax = -1)
        return
    try StatBar.help.Move(w - 40)
    try StatHost.Move(0, MINI_TB, w, h - MINI_TB)
    if StatC {
        try StatC.Fill()
    }
}

SaveStatGeometry() {
    if !IsStatVisible()
        return
    try {
        if (WinGetMinMax(StatGui) != 0)
            return
        WinGetPos(&x, &y, , , StatGui)
        StatGui.GetClientPos(, , &w, &h)
        Settings["StatX"] := x
        Settings["StatY"] := y
        Settings["StatW"] := w
        Settings["StatH"] := h
    }
}

EnsureStat() {
    global StatC, StatWv, StatEvents, StatBusy
    if StatC
        return true     ; already running: keep whatever numbers were typed in
    if StatBusy
        return false
    StatBusy := true
    try {
        DirCreate(PROFILE_DIR)
        StatC := WebView2.CreateControllerAsync(StatHost.Hwnd, 0, PROFILE_DIR).await2()
        StatWv := StatC.CoreWebView2
    } catch as e {
        StatC := 0
        StatWv := 0
        StatBusy := false
        MsgBox("The Stat Calculator window could not start the embedded browser.`n`nDetails: " e.Message, APP_NAME, "Icon!")
        return false
    }
    try StatWv.Settings.IsStatusBarEnabled := false
    StatEvents := [StatWv.NewWindowRequested(OnNewWindow)]
    try StatC.Fill()
    StatWv.Navigate(Settings["BaseUrl"] ROUTES["StatMini"])
    StatBusy := false
    return true
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

    tools := g.AddText("x16 y168 w220 h30 +0x200 c" th.accent, "Tools")
    tools.SetFont("s15 bold c" th.accent)
    b5 := MakeButton(g, "Build Planner", "x16 y206 w264 h46", (*) => MenuPick("Planner"), th)
    b6 := MakeButton(g, "HP/MP Calculator", "x16 y260 w264 h46", (*) => MenuPick("Calc"), th)
    for b in [b1, b2, b3, b4, b5, b6]
        b.SetFont(big " c" th.btnText)

    b7 := MakeButton(g, "Stat Calculator", "x16 y314 w264 h46", (*) => MenuPick("Stat"), th)
    b7.SetFont(big " c" th.btnText)

    MakeButton(g, "Options", "x16 y374 w128 h28", (*) => (CloseMenu(), ShowOptions()), th)
    MakeButton(g, "Close", "x152 y374 w128 h28", (*) => CloseMenu(), th)

    foot := g.AddText("x16 y410 w264 c" th.muted, "Menu: " PrettyKey(Keybinds["Menu"]) "   Window: " PrettyKey(Keybinds["Window"]))
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
    if (name = "Planner")
        ShowMini()
    else if (name = "Calc")
        ShowCalc()
    else if (name = "Stat")
        ShowStat()
    else
        NavTo(ROUTES[name])
}

; ───────────────────────── Help ( ? ) ─────────────────────────

ShowHelp(*) {
    ShowHelpFor("")
}

ShowHelpFor(ctx) {
    global HelpGui
    if (ctx != "menu" && ctx != "planner" && ctx != "calc" && ctx != "stat")
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
        . "   |   Build Planner " PrettyKey(Keybinds["Planner"]) "   |   HP/MP Calculator " PrettyKey(Keybinds["Calc"]) "   |   Stat Calculator " PrettyKey(Keybinds["Stat"])
        . "   |   Options " PrettyKey(Keybinds["Options"]))
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

    if (ctx = "planner")
        return {title: "Build Planner", body: StrReplace(StrReplace("
(
A small window with just your build plan. It stays on top of the game and remembers where you put it. Press {PLAN} to show or hide it.

Class drop-down - switch class. The Your plans group lists the classes that already have picks; Start a plan for... lists the rest.

Add by typing - click the box, type part of a skill or spell name and press Enter (or click a result).

Add from the game - point the mouse at a skill or spell in the game (its name or icon on the Skill/Spell page, or its detail pop-up) and press {ADD}. The overlay reads the name from the screen and adds it. It looks in your current class first, then the other classes. A short message tells you what was added. You can change this key in Options > Keybinds.
It only reads the name text, never the icon, and works at any game window size (640x480 or bigger). If a name is unclear it asks you to point again rather than guessing.

Selected (left) - your skills and spells, grouped by where you learn them. X removes one. Clear empties the plan for this class.

Total needed (right) - the gold, the highest STR / INT / WIS / CON / DEX you need for everything selected, and the materials. Tick a material when you have it; a skill whose materials are all ticked is crossed out.

Your picks are shared with the main wiki window and are remembered between sessions.
)", "{PLAN}", PrettyKey(Keybinds["Planner"])), "{ADD}", PrettyKey(Keybinds["AddSkill"]))}
    if (ctx = "calc")
        return {title: "HP/MP Calculator", body: StrReplace("
(
Works out how much experience it costs to raise your HP and MP. HP goes up in steps of 50 and MP in steps of 25. Each raise costs 500 experience for every point of your base before the raise (for example HP 58,074 to 58,124 costs 29,037,000).

Between Two Bases - type a starting and an ending base for HP, MP or both, then press Calculate to get the total experience. The ending base must be a whole number of steps above the start.

Max Raise from Exp - choose HP or MP, type your current base and the experience you have, and press Calculate. It shows the base you can reach and the experience left over.

Press {CALC} to show or hide this window. It stays on top of the game and remembers where you put it.
)", "{CALC}", PrettyKey(Keybinds["Calc"]))}

    if (ctx = "stat")
        return {title: "Stat Calculator", body: StrReplace("
(
Works out how much experience it takes to raise your STR, INT, WIS, CON and DEX to the maximum for your class.

Class and Progression - pick your class and whether you are Pre-Master, Master or Grandmaster. The maximum for each stat is then filled in.

Current Stats - type your current STR, INT, WIS, CON and DEX.

XP/hour (millions) - optional. Type how much experience you gain per hour, in millions, to get an estimated time.

Current Experience - optional. Experience you already have is taken off the total.

The result lists the experience needed for each stat and the total.

Press {STAT} to show or hide this window. It stays on top of the game and remembers where you put it.
)", "{STAT}", PrettyKey(Keybinds["Stat"]))}

    if (ctx = "menu")
        return {title: "The menu", body: "
(
Pick where you want to go:

Classes - skills and spells for every class, with the Build Plan window.
Items - all equipment, with item comparison and enchants.
Quests - quest guides.
Professions - recipes and tables for each profession.

Tools:
Build Planner - a small window with just your build plan. Type a skill or spell name to add it, or point at one in the game and press the Add key.
HP/MP Calculator - a small window that works out how much experience HP and MP raises cost.
Stat Calculator - a small window that works out how much experience it takes to max your stats.

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
    if RegExMatch(path, "^/planner")
        return {title: "Build Planner", body: "
(
Shows only your saved build plan. Use the drop-down at the top to switch class - it lists just the classes that have a plan.

Selected (left) - your skills and spells, grouped by where you learn them.
Total needed (right) - the gold, the highest STR / INT / WIS / CON / DEX you need for everything selected, and the materials. Tick a material when you have it; skills whose materials are all ticked get crossed out.
X - removes a skill or spell from the plan.

To add or change picks, open the class (Menu > Classes) and press Build Plan there.
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
    if RegExMatch(path, "^/calculators")
        return {title: "Calculators", body: "
(
Pick a calculator from the list. For the HP/MP or Stat Calculator in its own small window, use Menu > Tools.
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
    ; Opened with a keybind? Wait for its keys to be let go, or the first key box would record them.
    for k in ["Ctrl", "Alt", "Shift", "LWin", "RWin"]
        KeyWait(k, "T1")
    if (A_ThisHotkey != "") {
        mainKey := RegExReplace(A_ThisHotkey, "^[~*$<>^!+#]+")
        if (mainKey != "") {
            try KeyWait(mainKey, "T1")
        }
    }
    try OptGui.Destroy()
    global OptMouseList
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
    MouseList := MOUSE_CHOICES.Clone()
    OptMouseList := MouseList
    for a in ACTIONS {
        g.AddText("xm y+8 w250 h24 +0x200", a.label)
        if a.HasOwnProp("mouse") {
            mi := 0
            for i, c in MouseList
                if (c.key = Keybinds[a.id])
                    mi := i
            if (mi = 0) {
                MouseList.Push({label: PrettyKey(Keybinds[a.id]), key: Keybinds[a.id]})
                mi := MouseList.Length
            }
            mlabels := []
            for c in MouseList
                mlabels.Push(c.label)
            hk[a.id] := g.AddDropDownList("x+8 yp w200 Choose" mi, mlabels)
        } else
            hk[a.id] := g.AddHotkey("x+8 yp w200", Keybinds[a.id])
    }
    n := g.AddText("xm y+8 w480 c" th.muted, "Click a box and press the keys you want. Press Backspace to clear one. The skill/spell action uses a mouse click - pick one from its list.")
    n.SetFont("s8 c" th.muted)

    Section(g, "Appearance", th)
    g.AddText("xm y+8 w250 h24 +0x200", "Colour theme")
    idx := 1
    for i, name in THEME_ORDER
        if (name = Settings["Theme"])
            idx := i
    ddlTheme := g.AddDropDownList("x+8 yp w200 Choose" idx, THEME_LABELS)
    g.AddText("xm y+8 w250 h24 +0x200", "Fade when not in use (100 = off)")
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

    Section(g, "Game", th)
    autoOpt := (Settings["AutoLaunch"] = "1") ? "Checked" : ""
    cbAuto := g.AddCheckbox("xm y+8 " autoOpt, "Start automatically when the game launcher opens (" Settings["GameWindow"] ")")
    an := g.AddText("xm y+4 w480 c" th.muted, "Waits quietly in the tray after Windows starts. The launcher is found by its window title; change it in settings.cfg (GameWindow).")
    an.SetFont("s8 c" th.muted)

    Section(g, "Updates", th)
    updOpt := (Settings["CheckUpdates"] = "1") ? "Checked" : ""
    cbUpd := g.AddCheckbox("xm y+8 " updOpt, "Check for a new version when the overlay starts")
    g.AddText("xm y+8 w300 h26 +0x200", "Installed version: " VERSION)
    MakeButton(g, "Check now", "x+8 yp w120 h26", (*) => CheckForUpdates(true), th)

    MakeButton(g, "Save", "xm y+22 w110 h32", (*) => SaveOptions(g, hk, ddlTheme, sldOpacity, ddlZoom, zoomVals, cbTop, cbUpd, cbAuto), th)
    MakeButton(g, "Cancel", "x+8 yp w110 h32", (*) => g.Destroy(), th)
    MakeButton(g, "Reset keys", "x+8 yp w120 h32", (*) => ResetKeys(hk), th)

    g.OnEvent("Escape", (*) => g.Destroy())
    ; Start on a harmless checkbox, not on the first key box, so stray keys never change a keybind.
    cbTop.Focus()
    g.Show()
}

ResetKeys(hk) {
    for a in ACTIONS {
        if a.HasOwnProp("mouse")
            hk[a.id].Choose(1)
        else
            hk[a.id].Value := a.key
    }
}

SaveOptions(g, hk, ddlTheme, sldOpacity, ddlZoom, zoomVals, cbTop, cbUpd, cbAuto) {
    global OptGui, OptMouseList
    if (g != OptGui) {
        ; This Options window was replaced by a newer one; its controls are gone.
        try g.Destroy()
        return
    }
    keys := Map()
    seen := Map()
    seen.CaseSense := "Off"
    for a in ACTIONS {
        try {
            if a.HasOwnProp("mouse") {
                mv := hk[a.id].Value
                k := (mv >= 1 && mv <= OptMouseList.Length) ? OptMouseList[mv].key : ""
            } else
                k := hk[a.id].Value
        } catch {
            MsgBox("The Options window was closed while saving. Please open Options again and retry.", APP_NAME, "Icon!")
            return
        }
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
    Settings["AutoLaunch"] := cbAuto.Value ? "1" : "0"
    ApplyAutoLaunch()
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
            MsgBox("You have the newest version (" VERSION ").`n`nThe update server currently lists version " latest ".", APP_NAME, "Iconi")
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
