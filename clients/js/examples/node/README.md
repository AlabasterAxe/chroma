## Demo in node

1. Make sure a Chroma instance that allows resetting is running locally on port 8000 (e.g `ALLOW_RESET=TRUE chroma run`)
1. Build the client libraries: `cd .. && pnpm build && cd -`
1. Install the dependencies (including the local reference to the Chroma JS client): `pnpm install`
1. Run the node server: `pnpm dev`
1. visit `localhost:3000`

The browser should print the result of a document query and you should see more detailed logging in the console.
