// Sends a clean Ctrl+V to the focused window, immediately.
// Any Shift/Alt/Win the user is still holding from the hotkey is lifted for the
// duration of the paste and pressed again afterwards, so the target app sees a
// plain Ctrl+V (not Ctrl+Shift+V, which would re-trigger our own hotkey) and the
// keyboard state matches what the user is physically holding.
//
// Build: npm run keyhelper --workspace=packages/desktop
// Usage: keyhelper.exe paste
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

static class KeyHelper
{
    const int INPUT_KEYBOARD = 1;
    const uint KEYEVENTF_KEYUP = 0x0002;

    const uint KEYEVENTF_EXTENDEDKEY = 0x0001;

    const ushort VK_CONTROL = 0x11;
    const ushort VK_LSHIFT = 0xA0;
    const ushort VK_RSHIFT = 0xA1;
    const ushort VK_LMENU = 0xA4;
    const ushort VK_RMENU = 0xA5;
    const ushort VK_V = 0x56;

    // Modifiers that must not be down while Ctrl+V is sent. Ctrl itself is part of the paste.
    // Win is left alone: a lone Win key-up opens the Start menu.
    static readonly ushort[] Conflicting = { VK_LSHIFT, VK_RSHIFT, VK_LMENU, VK_RMENU };

    [StructLayout(LayoutKind.Sequential)]
    struct KEYBDINPUT
    {
        public ushort wVk;
        public ushort wScan;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct MOUSEINPUT
    {
        public int dx;
        public int dy;
        public uint mouseData;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Explicit)]
    struct INPUTUNION
    {
        [FieldOffset(0)] public MOUSEINPUT mi;
        [FieldOffset(0)] public KEYBDINPUT ki;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct INPUT
    {
        public int type;
        public INPUTUNION u;
    }

    [DllImport("user32.dll", SetLastError = true)]
    static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    [DllImport("user32.dll")]
    static extern short GetAsyncKeyState(int vKey);

    [DllImport("user32.dll")]
    static extern uint MapVirtualKey(uint uCode, uint uMapType);

    static bool IsDown(ushort vk)
    {
        return (GetAsyncKeyState(vk) & 0x8000) != 0;
    }

    static bool IsExtended(ushort vk)
    {
        return vk == VK_RMENU;
    }

    static INPUT Key(ushort vk, bool up)
    {
        INPUT input = new INPUT();
        input.type = INPUT_KEYBOARD;
        input.u.ki.wVk = vk;
        input.u.ki.wScan = (ushort)MapVirtualKey(vk, 0);
        input.u.ki.dwFlags = (up ? KEYEVENTF_KEYUP : 0) | (IsExtended(vk) ? KEYEVENTF_EXTENDEDKEY : 0);
        return input;
    }

    static void Paste()
    {
        List<INPUT> inputs = new List<INPUT>();

        // Lift held Shift/Alt/Win so they don't combine with the paste
        List<ushort> held = new List<ushort>();
        foreach (ushort vk in Conflicting)
        {
            if (IsDown(vk))
            {
                held.Add(vk);
                inputs.Add(Key(vk, true));
            }
        }

        // If the user is already holding Ctrl, leave it alone so tapping V again still works
        bool ctrlHeld = IsDown(VK_CONTROL);
        if (!ctrlHeld) inputs.Add(Key(VK_CONTROL, false));
        inputs.Add(Key(VK_V, false));
        inputs.Add(Key(VK_V, true));
        if (!ctrlHeld) inputs.Add(Key(VK_CONTROL, true));

        // Press the lifted keys again so holding Ctrl+Shift and tapping V keeps pasting masked
        foreach (ushort vk in held)
        {
            inputs.Add(Key(vk, false));
        }

        // One SendInput call: the sequence can't be interleaved with real keystrokes
        INPUT[] batch = inputs.ToArray();
        SendInput((uint)batch.Length, batch, Marshal.SizeOf(typeof(INPUT)));
    }

    static int Main(string[] args)
    {
        if (args.Length > 0 && args[0].ToLowerInvariant() == "paste")
        {
            Paste();
            return 0;
        }
        Console.Error.WriteLine("usage: keyhelper paste");
        return 1;
    }
}
