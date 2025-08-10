# Installation

Portable game. Can run anywhere where there's a browser with `JS` (and `HTML5`) support.

## Resources

- [RedBlobGames](https://www.redblobgames.com/grids/hexagons/) for hex math and algorithms

## FAQ
- ***Why is it a single file in JS?***
  - Because that's the whole challenge I set to myself. Create the game in JS, on an HTML canvas.
- ***Why are you not using [XYZ] framework instead?***
    - Because I want this to be as portable as possible. Ideally, playing the game should be as easy as opening
      `index.html` in your browser — no need for `npm install`, build steps, or downloading `500MB` of `node_modules`.
      Just click and play.
- ***What is Blue Prince?***
    - Blue Prince is a puzzle game built on rogue-like mechanics, layered randomness, and some seriously deep strategy.
      It’s got an impressive amount of puzzle depth and replayability. Check it out
      on [Steam](https://store.steampowered.com/app/1569580/Blue_Prince/).
- ***What's with `disc/script.min.js`?***
    - That’s the minified version of the main game script. It’s compressed purely for performance metrics — not meant to
      be human-readable.