/**
 * Module dependencies.
 */
var inherits = require("util").inherits;
var format   = require("util").format;

/**
 * Export `Struct`.
 */
module.exports = exports = Struct;

/**
 * Struct.
 */
function Struct(buf, caching) {
  if(!(this instanceof Struct)) return new Struct(buf);

  // allocate memory
  this.setPointer(buf);

  /**
   * Enabling caching disables immediate writing to the buffer.
   * The user has to call `Struct#serialize()` to update the buffer.
   */
  this.__.caching = caching;

  // define getters and setters
  this.__.fields.forEach(defineProperty, this);
}

/**
 * Helper function for defining getter/setter.
 *
 * @param {String} field
 * @this  {Struct}
 */
function defineProperty(field) {
  Object.defineProperty(this, field, {
    get: this.get.bind(this, field),
    set: this.set.bind(this, field)
  });
}

/**
 * Gets the value of `field`.
 *
 * @param  {String} field
 * @return {~}
 */
Struct.prototype.get = function get(field) {
  // read field from cache if enabled and available
  if(this.__.caching && field in this.__.cache)
    return this.__.cache[field];

  /**
   * This returns gibberish, if no data has been written to this field before.
   *
   * @warning This could impose a source for bugs or security holes, as raw
   *          memory is exposed.
   * @todo    Maybe throw an Error? Or just leave it up to the user?
   */
  // otherwise read data from buffer
  return this.__.read(field);
};

/**
 * Sets the value of `field` to `val`.
 *
 * @warning If caching is enabled, the data validity is only checked upon
 *          calling `Struct#serialize()`. This complicates bug-tracking,
 *          but increases speed.
 * @todo    Maybe this behaviour should be altered, to ease bug-tracking.
 *
 * @param {String} field
 * @param {~}      val
 *
 * @throws {TypeError} If the type of `val` doesn't match the typeof the field.
 */
Struct.prototype.set = function set(field, val) {
  // write field to cache if enabled
  if(this.__.caching) {
    this.__.cache[field] = val;
    return;
  }

  // otherwise write data to buffer
  this.__.write(field, val);
};

/**
 * Returns the internal buffer.
 *
 * @warning Writing to this buffer will change the data of the Struct!
 * @see     `Struct#toBuffer()`
 *
 * @return {Buffer}
 */
Struct.prototype.getPointer = function getPointer() {
  return this.__.buf;
};

/**
 * Set the internal buffer. Optionally providing an offset.
 * If called without arguments, this will allocate free memory.
 *
 * @param  {Buffer} buf
 * @param  {Number} start optional
 *
 * @throws {TypeError}  If `buf` is not a Buffer.
 * @throws {RangeError} If `buf` is not long enough.
 */
Struct.prototype.setPointer = function setPointer(buf, start) {
  // no buffer provided, allocate empty memory
  if(!buf) {
    this.__.buf = new Buffer(this.length);
    return;
  }

  // invalid data type provided, throw
  if(!Buffer.isBuffer(buf))
    throw new TypeError(format(
      "`Struct#setPointer(buf)` expects a Buffer, but a `%d` was given.",
      typeof buf
    ));

  // check buffer length
  if(buf.length < this.length)
    throw new RangeError(format(
      "The given Buffer for `Struct#setPointer(buf)` was too short." +
      "At least %d bytes were needed, but only %d bytes were given.",
      this.length, buf.length)
    );

  // everything okay, set pointer to supplied buffer
  this.__.buf = buf;
};

/**
 * Returns a copy of the internal buffer.
 * This saves the internal buffer from being overwritten accidentaly.
 *
 * @see `Struct#getPointer()`
 *
 * @return {Buffer}
 */
Struct.prototype.toBuffer = function toBuffer() {
  var buf = new Buffer(this.length);
  this.__.buf.copy(buf);
  return buf;
};

/**
 * Returns a JSON representation of the Struct.
 *
 * @see http://nodejs.org/api/buffer.html#buffer_buf_tojson
 *
 * @return {Array[Number]}
 */
Struct.prototype.toJSON = function toJSON() {
  return this.__.buf.toJSON();
};

/**
 * Returns a String representation of the Struct.
 *
 * @see http://nodejs.org/api/buffer.html#buffer_buf_tostring_encoding_start_end
 *
 * @return {String}
 */
Struct.prototype.toString = function toString(encoding, start, end) {
  return this.__.buf.toString.apply(this.__.buf, arguments);
};


/**
 * Factory.
 */
function createStruct() {
  var _ = function(buf, caching) {
    Struct.apply(this, arguments);
  };
  inherits(_, Struct);

  return _;
}