![](http://i.imgur.com/7p9dH2e.png)
# For nice victory

# [View example](http://sfrdmn.github.com/solitairewin/)

### Options

`viewport`

The container element to which the canvas will be appended. The animation will conform to the size of this element.

`images`

An array of the names of all images to be animated.

`path`

Path to the folder containing the images.

`fps`

Control that FPS, doggie. Defaults to 60.

`n`

Number of images onscreen at a time. Defaults to 1.

`resize`

Boolean indicating whether to resize canvas on window resize.
Basically only for when viewport resizes with window.

### Notes

Can be used with browserify or just loaded globally. Depends on [jQuery](https://github.com/jquery/jquery) and [async](https://github.com/caolan/async).

There's a `load` method which accepts a callback and loads the images. A `load` event is also triggered on load. Using `start` implicitly calls `load`.
