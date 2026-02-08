echo "Building UCOST Discovery Hub V4..."
npm run build
.\node_modules\.bin\electron-builder.cmd --win --x64 --config packaging-config-v4.json
