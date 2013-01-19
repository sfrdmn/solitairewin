![](http://i.imgur.com/6jE2Wh9.gif)
# For nice victory

### Options

`viewport`
	
The container element to which the canvas will be appended. The animation will conform to the size of this element.

`images`

An array of the names of all images to be animated.

	
`path`

Path to the folder containing the images.

### Notes

Can be used with browserify or just loaded globally. Depends on [jQuery](https://github.com/jquery/jquery) and [async](https://github.com/caolan/async).

There's a `load` method which accepts a callback and loads the images. A `load` event is also triggered on load. Using `start` implicitly calls `load`.

### View the example for usage