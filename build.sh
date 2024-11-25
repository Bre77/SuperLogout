#!/bin/bash
cd "${0%/*}"
OUTPUT="${1:-super_logout.spl}"
pnpm install
pnpm build
chmod -R u=rwX,go= stage/*
chmod -R u-x+X stage/*
chmod -R u=rwx,go= stage/bin/*
mv stage super_logout
tar -cpzf $OUTPUT --exclude=super_logout/.* --overwrite super_logout 
rm -rf super_logout