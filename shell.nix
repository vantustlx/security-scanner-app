{ pkgs ? import <nixpkgs> {} }:
pkgs.mkShell {
  buildInputs = with pkgs; [
    electron
    glib
    nss
    nspr
    atk
    cups
    gtk3
    libdrm
    mesa
    expat
    xorg.libxcb
    xorg.libX11
    xorg.libXcomposite
    xorg.libXdamage
    xorg.libXext
    xorg.libXfixes
    xorg.libXrandr
    libxkbcommon
    pango
    cairo
    alsa-lib
    dbus
  ];
}