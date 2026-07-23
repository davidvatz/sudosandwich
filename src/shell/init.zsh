# >>> sudo-sandwich >>>
# Literal phrase support for: sudo make me a sandwich!
# Also: sudo sudo make me a sandwich!  (double-sudo easter egg)
# Undo: remove this block from your shell rc, then `unfunction make sudo` (zsh)
# or `unset -f make sudo` (bash).

sudo-sandwich__run() {
  if command -v sudo-sandwich >/dev/null 2>&1; then
    command sudo-sandwich "$@"
  else
    command npx --yes sudo-sandwich "$@"
  fi
}

sudo-sandwich__is_phrase() {
  # Expect: me a sandwich!   (optional trailing bang / quotes)
  [ "$#" -ge 3 ] || return 1
  [ "$1" = "me" ] || return 1
  [ "$2" = "a" ] || return 1
  case "$3" in
    sandwich|sandwich!|sandwich.|"sandwich"|"sandwich!"|'sandwich'|'sandwich!') return 0 ;;
    *) return 1 ;;
  esac
}

make() {
  if sudo-sandwich__is_phrase "$@"; then
    if [ -n "${SUDO_USER+x}" ] || [ "$(id -u 2>/dev/null)" = "0" ]; then
      sudo-sandwich__run --granted
    else
      sudo-sandwich__run --denied
      return 1
    fi
    return $?
  fi
  command make "$@"
}

sudo() {
  # Double-sudo easter egg: `sudo sudo make me a sandwich!`
  # Outer sudo is this function; args begin with another "sudo".
  if [ "$1" = "sudo" ] && [ "$2" = "make" ]; then
    shift
    # Now: make me a sandwich!
    if [ "$1" = "make" ]; then
      shift
      if sudo-sandwich__is_phrase "$@"; then
        sudo-sandwich__run --granted --sudo-sudo
        return $?
      fi
      set -- make "$@"
    fi
    set -- sudo "$@"
  fi

  if [ "$1" = "make" ]; then
    shift
    if sudo-sandwich__is_phrase "$@"; then
      sudo-sandwich__run --granted
      return $?
    fi
    set -- make "$@"
  fi
  command sudo "$@"
}
# <<< sudo-sandwich <<<
