#!/bin/bash

VSCODE_BIN=/opt/VSCode-linux-x64/code

CONF_BASE=.
DATA_DIR=$CONF_BASE/data
EXTENSION_DIR=$CONF_BASE/extensions

if [ "$1" != "" ]; then
  VSCODE_BIN="$1"
fi

if [ ! -f "$VSCODE_BIN" ]; then
  echo "VSCode nicht unter '$VSCODE_BIN' gefunden."
  echo "Bitte korrekten Pfad angeben:"
  read VSCODE_BIN
  exec "$0" "$VSCODE_BIN"
fi

mkdir -p $DATA_DIR
mkdir -p $EXTENSION_DIR

VSCODE_INSTALLER=`dirname $VSCODE_BIN`
if [ ! -d "$EXTENSION_DIR/ms-vscode-remote.remote-containers-0.413.0" ]; then
  $VSCODE_INSTALLER/bin/code \
    --user-data-dir $DATA_DIR \
    --extensions-dir $EXTENSION_DIR \
    --install-extension "ms-vscode-remote.remote-containers"
fi

"$VSCODE_BIN" \
  --user-data-dir $DATA_DIR \
  --extensions-dir $EXTENSION_DIR \
  -a ..
