#!/bin/bash

VSCODE_BIN=/opt/VSCode-linux-x64/code

CONF_BASE=.
DATA_DIR=$CONF_BASE/data
EXTENSION_DIR=$CONF_BASE/extensions

WANTED_EXTENSIONS=("ms-vscode-remote.remote-containers" "ms-azuretools.vscode-containers")

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
for e in "${WANTED_EXTENSIONS[@]}"
do
  ls $EXTENSION_DIR/$e* &> /dev/null
  if [ "$?" != "0" ]; then
    $VSCODE_INSTALLER/bin/code \
      --user-data-dir $DATA_DIR \
      --extensions-dir $EXTENSION_DIR \
      --install-extension "$e"
  fi
done

"$VSCODE_BIN" \
  --user-data-dir $DATA_DIR \
  --extensions-dir $EXTENSION_DIR \
  -a ..
