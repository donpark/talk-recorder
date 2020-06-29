## Status

-   Alpha release'
-   Should work with latest versions of Chrome and Firefox.
-   Very little has been done so far to support older browsers.

## Install

`talk-recorder` is pre-built in `dist` directory.

If you need to rebuild or run the demo, be sure to install dependencies with:

npm install

## Demo

[Live Demo](https://donpark.github.io/talk-recorder/).

You can also run demos locally. There are two demos:

-   demo:local - recording is done onsite.
-   demo:framer - recording is done offsite through an iframe.

To run `demo:local`:

    npm run demo:local

then open browser to http://localhost:1234

To run `demo:framer`, you also need to run `demo:framed` like this:

    npm run demo:framed
    npm run demo:framer

then open browser to http://localhost:1234

`demo/framed.html` page runs on port 1235.
`demo/framer.html` page runs on port 1234.

Both pages has `talk-recorder` custom element but with different `role` values.

### default role

```javascript
<talk-recorder></talk-recorder>
```

By default, `talk-recorder` element will record audio locally.

### role='framer'

```javascript
<talk-recorder role="framer" host="https://example.com/talk-recorder.html"></talk-recorder>
```

In `framer` role, `talk-recorder` element adds an invisible iframe element pointing to `host`,
communicating with it to record under the specifiied `host` domain.

### role='framed'

```javascript
<talk-recorder role="framed" host="https://example.com/talk-recorder.html"></talk-recorder>
```

In `framed` role, `talk-recorder` element records audio locally like the default role except
it is acting on-behalf of the parent window.

## Usage

Loading `talk/recorder.js` in the web page like this

    <script src="talk/recorder.js" type="text/javascript"></script>

will add `TalkRecorder` class as well as `<talk-recorder>` custom element.

You can use `TalkRecorder` class like this:

    const recorder = new TalkRecorder();
    recorder.record({ type: 'mp3' })
        .then(blob => { /* do something with the MP3 blob */ })
        .catch(err => { /* report error });
    ...
    recorder.stop();

Likewise, you can use the custom element like this:

    const recorder = document.getElementById('my-recorder');
    ...

or

    const recorder = document.createElement('talk-recorder');

### bitRate

Audio type-specific default audio bitRate are:

-   Opus: 32kbps
-   MP3: 64kbps

To change the bitRate, set `bitRate` property like this:

    recorder.bitRate = '64k';

or as element attribute like this.

    <talk-recorder bitRate="64k"></talk-recorder>

MP3-NOTE: bitRate currently does not apply to MP3 encoding because
VBR (variable bitrate) mode of LAME MP3 encoder is used which,
at quality level set to `5`, will vary bitrate between 120 to 150kbps.

## TalkRecorder class

TBD

## Building

To rebuild, run:

    yarn build

## Building MP3 encoder WebAssembly files

If you need to rebuild Lame MP3 webassembly files in `static/lamemp3` directory,
you'll need Emscripten SDK installed locally.

[Emscripten SDK installation instructions](https://emscripten.org/docs/getting_started/downloads.html)

Once Emscripten SDK is installed and **active** in current terminal session,
CLI commands like `emcc` will be available which you can verify with:

    which emcc

To rebuild, run:

    ./build-lamemp3.sh

This should:

1. download lamemp3 source files into tmp directory.
2. build \_vmsg.wasm and generate \_vmsg.js files.
3. update static/lamemp3 directory with two output files.
4. delete tmp directory to cleanup.

## Jekyll issue

If you're usnig Jekyll, underscore prefix of `_vmsg.js` and `_vmsg.wasm` files may
prevent those files from being copied. Add an empty `.nojekyll` file to override.

## Dependencies

This project has no runtime dependencies but uses code from following two open source projects:

-   [LAME MP3](https://lame.sourceforge.io/) - WebAssembly version is used.
-   [vmsg](https://github.com/Kagami/vmsg) - WebAssembly makefile and interface C file is used.
