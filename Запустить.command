#!/bin/zsh
set -e
PIRSBET_DIR="${0:A:h}"
cd "$PIRSBET_DIR"
if command -v node >/dev/null 2>&1; then
  exec node server.mjs
elif command -v python3 >/dev/null 2>&1; then
  print 'ПИРСBET → http://127.0.0.1:4173'
  print 'Откройте адрес в браузере. Для остановки: Ctrl+C.'
  exec python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
else
  print 'Для запуска нужен Node.js 18+ или Python 3.'
  read '?Нажмите Enter, чтобы закрыть окно.'
fi
