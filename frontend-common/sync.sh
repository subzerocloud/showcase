#!/usr/bin/env bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
EXAMPLES_DIRS=(
    "../cloudflare-pages-D1"
    "../flyio-postgresql"
    "../flyio-sqlite-litefs"
    "../vercel-postgresql-neon"
)
cd $SCRIPT_DIR

TARGET_DIR=${1%/}
WATCH=${2:-false}

if [ -z "$TARGET_DIR" ]; then
    TARGET_DIRS=("${EXAMPLES_DIRS[@]}")
else
    TARGET_DIRS=("$TARGET_DIR")
    # check if target directory exists
    if [ ! -d "$TARGET_DIR" ]; then
        echo "Target directory does not exist: $TARGET_DIR"
        exit 1
    fi
fi



copy_file () {
    FILE=$1
    # get the directory name of the file
    DIR_NAME=$(dirname $FILE)
    DIR_NAME=${DIR_NAME#$SCRIPT_DIR}
    # get the file name of the file
    FILE_NAME=$(basename $FILE)

    for TARGET_DIR in "${TARGET_DIRS[@]}"; do
        # get the absolute destination path
        DESTINATION_PATH=$TARGET_DIR$DIR_NAME

        #echo "Checking if destination directory exists: $DESTINATION_PATH"
        mkdir -p $DESTINATION_PATH
        echo "Copying ${FILE/$SCRIPT_DIR/} to $DESTINATION_PATH/$FILE_NAME"
        cp -p $FILE $DESTINATION_PATH/$FILE_NAME
    done
}


if [ "$WATCH" = true ]; then
    echo "Watching for changes in $SCRIPT_DIR"
    fswatch -0  -e "\\.sh$" -e "README\\.md$" $SCRIPT_DIR  | while read -d "" FILE
    do 
        copy_file $FILE
    done
else
    echo "Copying files..."
    # get all the files in teh current directory into an array
    FILES=($(find $SCRIPT_DIR -type f  -not -path '*.sh' -not -path '*README.md'))
    for FILE in "${FILES[@]}"; do
        copy_file $FILE
    done
fi